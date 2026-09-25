import { finite, valuationActuals, valuationForecasts } from './companyValuation.js';

export const researchNumber = (value, digits = 1) => finite(value) ? value.toLocaleString('sv-SE', { maximumFractionDigits: digits }) : 'Saknas';
export const researchMoney = (value, currency = 'SEK') => {
  if (!finite(value)) return 'Saknas';
  const scale = Math.abs(value) >= 1e9 ? 1e9 : Math.abs(value) >= 1e6 ? 1e6 : 1;
  return `${researchNumber(value / scale, scale === 1 ? 0 : 1)} ${scale === 1e9 ? 'md ' : scale === 1e6 ? 'M ' : ''}${currency}`;
};
export const researchDate = value => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Stockholm' }) : 'Datum saknas';

export function estimateViews({ symbol, financials, estimates, availability, now = Date.now() }) {
  const currency = financials?.currency;
  const actuals = [...valuationActuals(financials, symbol, 'annual'), ...valuationActuals(financials, symbol, 'quarterly')];
  const epsBasis = actuals.some(row => finite(row.dilutedEps)) ? 'dilutedEps' : 'basicEps';
  return [['revenue', 'Omsättning'], ['ebit', 'EBIT'], ['eps', 'Vinst per aktie']].map(([metric, title]) => {
    const forecasts = valuationForecasts({ symbol, financials, estimates, availability, metric, currency, epsBasis, now });
    const frequency = forecasts.some(row => row.period.frequency === 'quarterly') ? 'quarterly' : 'annual';
    const selected = forecasts.filter(row => row.period.frequency === frequency).slice(0, 2);
    const reported = valuationActuals(financials, symbol, frequency).filter(row => row.currency === currency).slice(-4)
      .map(row => ({ period: row.period, value: row[metric === 'eps' ? epsBasis : metric], source: 'reported', sourceLabel: 'Rapporterat', asOf: row.periodEnd, url: row.sourceUrl }));
    return { metric, title, currency, frequency, epsBasis, forecasts: selected,
      bars: [...reported, ...selected].map(row => ({ ...row, value: finite(row.value) ? row.value : null,
        label: `${row.period.label}${row.source === 'reported' ? '' : 'E'}` })) };
  });
}

// Bar lengths share a true denominator. Never silently switch between capital
// and voting rights, nor invent a remainder from a partial owner list.
export function ownershipBars(owners = []) {
  return owners.filter(row => row.name && finite(row.capitalPct) && row.capitalPct >= 0 && row.capitalPct <= 100)
    .slice().sort((a, b) => b.capitalPct - a.capitalPct);
}

export function shortSeries(data, range = '12m') {
  const byDate = new Map();
  for (const point of data?.series ?? []) {
    if (calendarDateKey(point.date) === point.date && finite(point.pct) && point.pct >= 0 && point.pct <= 100) byDate.set(point.date, point);
  }
  const points = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).map(row => ({ ...row, time: Date.parse(row.date) }));
  if (!points.length || range === 'full') return points;
  const cutoff = points.at(-1).time - (range === '3m' ? 92 : 366) * 86400_000;
  // No resampling, price dependency or invented current observation.
  return points.filter(row => row.time >= cutoff);
}

export const calendarDateKey = value => {
  const key = typeof value === 'string' ? value.slice(0, 10) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const date = new Date(`${key}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key ? key : null;
};
export const calendarEventLabel = type => ({ earnings: 'Rapport', agm: 'Årsstämma', ex_dividend: 'X-dag', dividend: 'Utdelning', capital_market_day: 'Kapitalmarknadsdag' })[type] ?? String(type ?? 'Händelse').replaceAll('_', ' ');
export function upcomingCompanyEvents(calendar, today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' })) {
  const candidates = [...(calendar?.events ?? []), ...(calendar?.earningsDates ?? []).map(date => ({ type: 'earnings', date })),
    ...(calendar?.exDividendDate ? [{ type: 'ex_dividend', date: calendar.exDividendDate }] : []),
    ...(calendar?.dividendDate ? [{ type: 'dividend', date: calendar.dividendDate }] : [])];
  const seen = new Set();
  return candidates.map(event => ({ ...event, date: calendarDateKey(event.date) })).filter(event => event.date && event.date >= today)
    .filter(event => { const key = `${event.date}:${event.type}`; if (seen.has(key)) return false; seen.add(key); return true; })
    .sort((a, b) => a.date.localeCompare(b.date));
}
