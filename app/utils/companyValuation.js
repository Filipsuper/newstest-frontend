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
      || model.locked || !fresh(model.updatedAt, now, 30) || !model.inputPeriods?.length) continue;
    const eps = model.epsEstimate?.forecasts?.[epsBasis];
    const epsInputsMatch = model.epsEstimate?.inputs?.length === 4 && model.epsEstimate.inputs.every(input => {
      const actual = quarterly.find(q => q.period.key === input.fiscalPeriod);
      return actual && ['periodEnd', 'source', 'currency', 'revenue', 'netIncomeCommonStockholders',
        'basicAverageShares', 'basicEps', 'dilutedAverageShares', 'dilutedEps', 'ordinarySharesNumber']
        .every(key => (input[key] ?? null) === (actual[key] ?? null));
    });
    const extension = model.epsEstimate, share = extension?.shareBasis;
    const reviewed = extension?.version === 2 && extension.method === 'common_profit_blended_margin_at_reviewed_shares'
      && extension.r12Compatible === false && share?.symbol === symbol && share.reviewId
      && /^https:\/\//.test(share.sourceUrl ?? '') && fresh(share.observedAsOf, now, 30)
      && fresh(share.reviewedAt, now, 30) && Date.parse(share.expiresAt) > now
      && fresh(share.newsCheckedThrough, now, 15 / (24 * 60))
      && Number.isSafeInteger(share.issuedShares) && share.issuedShares > 0
      && ((share.definition === 'issued_total_proxy' && share.treasuryShares === null)
        || (share.definition === 'issued_less_reported_treasury' && Number.isSafeInteger(share.treasuryShares)
          && share.treasuryShares >= 0 && share.treasuryShares < share.issuedShares))
      && share.assumedShares === share.issuedShares - (share.treasuryShares ?? 0)
      && epsBasis === 'basicEps' && eps?.assumedShares === share.assumedShares
      && finite(extension.netIncomeCommonStockholdersEstimate)
      && finite(eps?.value) && Math.abs(eps.value - extension.netIncomeCommonStockholdersEstimate / share.assumedShares) < 1e-10;
    const supported = (extension?.version === 1 && extension.method === 'common_profit_blended_margin_at_unchanged_shares') || reviewed;
    const value = metric === 'eps' ? (supported && extension.unavailableReason === null
      && eps?.basis === (epsBasis === 'dilutedEps' ? 'diluted' : 'basic')
      && epsInputsMatch ? eps.value : null) : model.metrics?.[metric];
    if (!finite(value)) continue;
    byPeriod.set(period.key, { period, value, currency, source: 'model',
      sourceLabel: reviewed && metric === 'eps' ? 'OMXsum · daterat aktieantal' : 'OMXsum-estimat',
      asOf: model.updatedAt, publisher: 'OMXsum', method: model.method, inputPeriods: model.inputPeriods,
      basis: reviewed && metric === 'eps' ? 'model_current_shares' : 'reported',
      ...(reviewed && metric === 'eps' ? { shareBasis: share, r12Compatible: false } : {}) });
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

// Reference at today's quoted capitalization, not a forecast price path.
// Keep the nearest annual period even if its multiple is unavailable: do not
// silently jump over a forecast loss to a later profitable year.
export function valuationHistoryData(multiple, forecasts = []) {
  const annual = forecasts.find(row => row.period.frequency === 'annual' || row.basis === 'r12_estimated');
  const series = (multiple?.series ?? []).map(point => ({
    ...point, time: Date.parse(point.date),
    plotted: finite(point.value) && point.value <= (multiple.displayMax ?? Infinity) ? point.value : null,
  })).filter(point => Number.isFinite(point.time));
  const last = series.at(-1);
  const span = last?.time - series[0]?.time;
  const reference = annual && annual.multiple?.reason === null
    && finite(annual.multiple.value) && annual.multiple.value > 0
    && span > 0 && finite(last?.plotted) ? annual : null;
  // This coordinate reserves 10% of plot width for the estimate, not a future
  // calendar date. Never store it as an observation or show it as a date.
  const estimateEnd = reference ? last.time + span / 9 : null;
  const chartData = reference ? [
    ...series.map((point, index) => ({ ...point, estimated: index === series.length - 1 ? point.plotted : null })),
    { time: estimateEnd, plotted: null, estimated: reference.multiple.value, forecast: reference },
  ] : series;
  const ticks = reference ? [series[0].time, series[Math.floor(series.length / 2)].time, last.time, estimateEnd] : undefined;
  // Preserve historical clipping/statistics while making room for the estimate.
  const ceiling = finite(multiple?.displayMax) ? multiple.displayMax : Math.max(0,
    ...series.map(point => point.plotted ?? 0), multiple?.stats?.p75 ?? 0);
  return { series, chartData, reference, estimateEnd, ticks,
    displayMax: reference ? Math.max(ceiling, reference.multiple.value * 1.15) : multiple?.displayMax };
}

/** The server supplies a separately calculated R12 history. Verify that the
 * financial and valuation requests saw the same four quarters before joining
 * a forecast to it (a concurrent report/backfill must not mix revisions). */
export function r12Projection({ id, symbol, financials, valuation, forecast, now = Date.now() }) {
  const data = valuation?.r12, window = data?.currentWindow;
  const metric = id === 'pe' ? 'eps' : id === 'evEbit' ? 'ebit' : 'revenue';
  const fail = reason => ({ value: null, reason });
  if (id === 'pe' && forecast?.r12Compatible === false) return fail('reviewed_share_basis');
  if (!data || data.schemaVersion !== 1 || data.symbol !== symbol || data.basis !== 'r12_reported'
    || data.unavailableReason || !window || window.unavailableReason || window.quarters?.length !== 4) return fail('quarter_history');
  const quarters = valuationActuals(financials, symbol, 'quarterly').slice(-4);
  if (quarters.length !== 4 || !fresh(window.periodEnd, now, 180)) return fail('quarter_history');
  const latest = quarters.at(-1).period;
  if (!forecast || forecast.period.frequency !== 'quarterly' || forecast.period.rank !== latest.rank + 1
    || forecast.currency !== data.reportingCurrency) return fail('next_quarter_estimate');
  if (quarters.some((q, i) => {
    const pinned = window.quarters[i];
    return q.period.key !== pinned.fiscalPeriod || q.periodEnd !== pinned.periodEnd
      || q.currency !== data.reportingCurrency || pinned.currency !== data.reportingCurrency
      || q.source !== pinned.source || q.basis === 'adjusted' || (q.estimateAdjusted && Object.keys(q.estimateAdjusted).length)
      || (i > 0 && q.period.rank !== quarters[i - 1].period.rank + 1)
      || !finite(pinned[metric]) || actualValue(q, metric, data.epsBasis) !== pinned[metric]
      || (q.sharesOutstanding ?? null) !== pinned.sharesOutstanding;
  })) return fail('financial_revision');
  if (id === 'pe' && (!finite(window.eps) || window.epsUnavailableReason)) return fail('eps_basis');
  const active = data.multiples?.find(row => row.id === id);
  if (!active?.available || active.to !== data.asOf || !finite(active.series?.at(-1)?.value)) return fail('historical_endpoint');
  const value = window.quarters.slice(1).reduce((sum, q) => sum + q[metric], 0) + forecast.value;
  if (!finite(value)) return fail('metric_missing');
  const multiple = forwardMultiple(id, { ...forecast, value, period: { ...forecast.period, frequency: 'annual' } }, data, now);
  return { ...forecast, value, basis: 'r12_estimated', displayLabel: 'R12E',
    quarterEstimate: forecast.value, actualR12: window[metric],
    droppedQuarter: quarters[0].period.label,
    retainedQuarters: quarters.slice(1).map(q => q.period.label),
    multiple, reason: null };
}

export function valuationChartData({ id, symbol, financials, estimates, availability, valuation, estimatePeriod, now = Date.now() }) {
  const config = VALUATION_METRICS.find(item => item.value === id) ?? VALUATION_METRICS[0];
  const currency = valuation?.reportingCurrency ?? financials?.currency;
  const allActuals = [...valuationActuals(financials, symbol, 'annual'), ...valuationActuals(financials, symbol, 'quarterly')];
  let epsBasis = allActuals.some(row => finite(row.dilutedEps)) ? 'dilutedEps' : 'basicEps';
  // Keep an existing annual consensus on its established explicit EPS basis.
  // Without one, use the R12 API's single basis across all four quarters.
  if (valuation?.r12 && !valuationForecasts({ symbol, financials, estimates, availability, metric: config.metric, currency, epsBasis, now }).some(row => row.period.frequency === 'annual')) epsBasis = valuation.r12.epsBasis ?? epsBasis;
  if (config.metric === 'eps' && epsBasis === 'dilutedEps'
    && !valuationForecasts({ symbol, financials, estimates, availability, metric: 'eps', currency, epsBasis, now }).length
    && valuationForecasts({ symbol, financials, estimates, availability, metric: 'eps', currency, epsBasis: 'basicEps', now }).some(row => row.shareBasis)) epsBasis = 'basicEps';
  const forecasts = valuationForecasts({ symbol, financials, estimates, availability, metric: config.metric, currency, epsBasis, now });
  const frequency = forecasts.some(row => row.period.frequency === 'annual') ? 'annual' : forecasts.length ? 'quarterly' : 'annual';
  const upcoming = forecasts.filter(row => row.period.frequency === frequency).slice(0, 3);
  const actuals = valuationActuals(financials, symbol, frequency).filter(row => row.currency === currency).slice(-3);
  const bars = [...actuals.map(row => ({ period: row.period, value: finite(actualValue(row, config.metric, epsBasis)) ? actualValue(row, config.metric, epsBasis) : null,
    sourceLabel: 'Rapporterat', source: 'reported', url: row.sourceUrl, asOf: row.periodEnd })), ...upcoming]
    .map(row => ({ ...row, label: `${row.period.label}${row.source === 'reported' ? '' : 'E'}` }));
  const projection = frequency === 'quarterly' ? r12Projection({ id, symbol, financials, valuation, forecast: upcoming[0], now }) : null;
  const rolling = projection?.basis === 'r12_estimated';
  const forecastRows = upcoming.map(row => ({ ...row, multiple: forwardMultiple(id, row, valuation ?? {}, now) }));
  // Selecting a later year is explicit. Default to the nearest year, including
  // a loss/unavailable multiple: never choose a more flattering year for it.
  const selectedForecast = frequency === 'annual'
    ? forecastRows.find(row => row.period.key === estimatePeriod) ?? forecastRows[0] ?? null : null;
  return { config, currency, frequency, epsBasis, bars, forecasts: forecastRows,
    selectedForecast,
    r12: rolling ? projection : null, r12UnavailableReason: projection?.reason ?? null,
    historyValuation: rolling ? valuation.r12 : valuation,
    historyForecasts: rolling ? [projection] : selectedForecast ? [selectedForecast] : forecastRows };
}
