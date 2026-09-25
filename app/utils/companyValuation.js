// Display adapter only: never generate forecasts or annualise a single quarter.
export const VALUATION_METRICS = [
  { value: 'pe', label: 'P/E', metric: 'eps', title: 'Vinst per aktie' },
  { value: 'evEbit', label: 'EV/EBIT', metric: 'ebit', title: 'Rörelseresultat', short: 'EBIT' },
  { value: 'ps', label: 'P/S', metric: 'revenue', title: 'Omsättning' },
  { value: 'evSales', label: 'EV/S', metric: 'revenue', title: 'Omsättning' },
];
export const finite = value => typeof value === 'number' && Number.isFinite(value);
const DAY = 86400_000;
const fresh = (date, now, days) => {
  const timestamp = date ? Date.parse(date) : NaN;
  return Number.isFinite(timestamp) && timestamp <= now + 300_000 && now - timestamp <= days * DAY;
};
export function valuationPeriod(value) {
  const quarter = /^(\d{4})-Q([1-4])$/.exec(value ?? '');
  if (quarter) return { key: value, year: +quarter[1], rank: +quarter[1] * 4 + +quarter[2], frequency: 'quarterly', label: `Q${quarter[2]} ${quarter[1]}` };
  const annual = /^(\d{4})(?:-FY)?$/.exec(value ?? '');
  return annual ? { key: `${annual[1]}`, year: +annual[1], rank: +annual[1] * 4 + 4, frequency: 'annual', label: annual[1] } : null;
}
export function valuationActuals(financials, symbol, frequency) {
  if (!financials || financials.symbol !== symbol) return [];
  return (financials[frequency] ?? []).filter(row => !row.estimate && row.dataType !== 'estimate')
    .map(row => ({ ...row, period: valuationPeriod(row.fiscalPeriod), currency: row.currency ?? financials.currency }))
    .filter(row => row.period?.frequency === frequency)
    .sort((a, b) => a.period.rank - b.period.rank);
}
const actualValue = (row, metric, epsBasis) => metric === 'eps' ? row[epsBasis] : row[metric];

/** Consensus precedence is resolved independently for each fiscal period/metric.
 * A valid loss wins over a positive model. An upstream failure is not absence. */
export function valuationForecasts({ symbol, financials, estimates, availability, metric, currency, epsBasis = 'dilutedEps', now = Date.now() }) {
  if (availability === 'unavailable' || !estimates || estimates.symbol !== symbol || financials?.symbol !== symbol || !currency) return [];
  const quarterly = valuationActuals(financials, symbol, 'quarterly');
  const annual = valuationActuals(financials, symbol, 'annual');
  const latestReport = valuationPeriod(financials.latestReport?.fiscalPeriod);
  const lastQuarter = Math.max(-Infinity, ...quarterly.map(row => row.period.rank), ...annual.map(row => row.period.rank), latestReport?.rank ?? -Infinity);
  const lastYear = Math.max(-Infinity, ...annual.map(row => row.period.year), latestReport?.frequency === 'annual' ? latestReport.year : -Infinity);
  const upcoming = period => period && (period.frequency === 'quarterly'
    ? Number.isFinite(lastQuarter) && period.rank > lastQuarter && period.rank <= lastQuarter + 4 && period.year <= new Date(now).getUTCFullYear() + 1
    : Number.isFinite(lastYear) && period.year > lastYear && period.rank > lastQuarter && period.year <= new Date(now).getUTCFullYear() + 2);
  const byPeriod = new Map();
  const rows = [...(estimates.snapshots ?? []), ...(estimates.latest ? [estimates.latest] : [])]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  for (const snapshot of rows) {
    const period = valuationPeriod(snapshot.fiscalPeriod);
    if (!upcoming(period) || !fresh(snapshot.publishedAt, now, 90) || !snapshot.companies?.some(company => company.symbol === symbol)) continue;
    if (byPeriod.has(period.key) || snapshot.origin === 'manual' || !snapshot.source?.name) continue;
    const key = metric === 'eps' ? (epsBasis === 'dilutedEps' ? 'eps_diluted' : 'eps_basic') : metric;
    const value = snapshot.metrics?.find(item => item.key === key && !item.scope && item.currency === currency
      && item.unit !== '%' && item.unit !== 'count' && item.basis !== 'adjusted' && !/adjusted|justerad/i.test(item.label ?? '') && finite(item.amount));
    if (!value) continue;
    byPeriod.set(period.key, { period, value: value.amount, currency, source: 'consensus', sourceLabel: 'Konsensus',
      asOf: snapshot.publishedAt, publisher: snapshot.source.publisher ?? snapshot.source.name,
      url: snapshot.source.url, contributors: snapshot.contributors, basis: 'reported' });
  }
  // Only the public, qualified model contract is eligible. Never use the
  // internal Terminal's manual estimates or old rows without provenance.
  for (const model of estimates.models ?? []) {
    const period = valuationPeriod(model.fiscalPeriod);
    if (!upcoming(period) || byPeriod.has(period.key) || model.origin !== 'model' || model.symbol !== symbol
      || model.publicModelVersion !== 1 || model.currency !== currency || model.basis !== 'reported'
      || model.locked || !fresh(model.updatedAt, now, 30) || !model.inputPeriods?.length || metric === 'eps'
      || !finite(model.metrics?.[metric])) continue;
    byPeriod.set(period.key, { period, value: model.metrics[metric], currency, source: 'model', sourceLabel: 'OMXsum-estimat',
      asOf: model.updatedAt, publisher: 'OMXsum', method: model.method, inputPeriods: model.inputPeriods, basis: 'reported' });
  }
  return [...byPeriod.values()].sort((a, b) => a.period.rank - b.period.rank);
}

export function forwardMultiple(id, forecast, valuation, now = Date.now()) {
  if (forecast.period.frequency !== 'annual') return { value: null, reason: 'quarterly' };
  if (forecast.value <= 0) return { value: null, reason: 'not_meaningful' };
  if (valuation.unavailableReason || !fresh(valuation.asOf, now, 10)) return { value: null, reason: 'capitalization' };
  const sameCurrency = forecast.currency === valuation.tradingCurrency;
  const rate = sameCurrency ? 1 : valuation.fx?.rateNow;
  if (!finite(rate) || rate <= 0 || forecast.currency !== valuation.reportingCurrency) return { value: null, reason: 'currency' };
  const capital = valuation.capitalization?.current;
  const numerator = id === 'pe' ? valuation.latestClose : id === 'ps' ? capital?.marketCap : capital?.enterpriseValue;
  if (!finite(numerator) || numerator <= 0 || (id !== 'pe' && (capital?.asOf !== valuation.asOf || valuation.capitalization?.currency !== valuation.tradingCurrency))) return { value: null, reason: 'capitalization' };
  const value = numerator / (forecast.value * rate);
  if (!finite(value) || (['pe', 'evEbit'].includes(id) && value > (valuation.method?.notMeaningfulAbove ?? 200))) return { value: null, reason: 'not_meaningful' };
  return { value, reason: null };
}

export function valuationChartData({ id, symbol, financials, estimates, availability, valuation, now = Date.now() }) {
  const config = VALUATION_METRICS.find(item => item.value === id) ?? VALUATION_METRICS[0];
  const currency = valuation?.reportingCurrency ?? financials?.currency;
  const allActuals = [...valuationActuals(financials, symbol, 'annual'), ...valuationActuals(financials, symbol, 'quarterly')];
  const epsBasis = allActuals.some(row => finite(row.dilutedEps)) ? 'dilutedEps' : 'basicEps';
  const forecasts = valuationForecasts({ symbol, financials, estimates, availability, metric: config.metric, currency, epsBasis, now });
  const frequency = forecasts.some(row => row.period.frequency === 'annual') ? 'annual' : forecasts.length ? 'quarterly' : 'annual';
  const upcoming = forecasts.filter(row => row.period.frequency === frequency).slice(0, 3);
  const actuals = valuationActuals(financials, symbol, frequency).filter(row => row.currency === currency).slice(-3);
  const bars = [...actuals.map(row => ({ period: row.period, value: finite(actualValue(row, config.metric, epsBasis)) ? actualValue(row, config.metric, epsBasis) : null,
    sourceLabel: 'Rapporterat', source: 'reported', url: row.sourceUrl, asOf: row.periodEnd })), ...upcoming]
    .map(row => ({ ...row, label: `${row.period.label}${row.source === 'reported' ? '' : 'E'}` }));
  return { config, currency, frequency, epsBasis, bars, forecasts: upcoming.map(row => ({ ...row, multiple: forwardMultiple(id, row, valuation ?? {}, now) })) };
}
