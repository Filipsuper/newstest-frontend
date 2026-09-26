import { safeSourceUrl } from './newsroom.js';

const hasText = value => typeof value === 'string' && value.trim().length > 0;
const hasDate = value => hasText(value) && Number.isFinite(Date.parse(value));

// Presentation contract only. Selection, synthesis and source qualification
// belong upstream; a briefing must never borrow another company's context.
export function qualifiedCompanyBriefing(value, symbol, { allowPrototype = false, now = Date.now() } = {}) {
  if (!value || value.schemaVersion !== 1 || value.symbol !== symbol
    || !(value.mode === 'generated' || (allowPrototype && value.mode === 'reviewed_prototype'))
    || !hasText(symbol) || !hasDate(value.asOf) || !hasText(value.headline)
    || !hasText(value.summary?.text) || !Array.isArray(value.sources) || !value.sources.length
    || (value.background != null && !Array.isArray(value.background))) return null;
  if (value.mode === 'generated' && (!hasDate(value.validUntil) || Date.parse(value.validUntil) <= now
    || Date.parse(value.asOf) > now + 300_000)) return null;
  const ids = new Set();
  for (const source of value.sources) {
    if (!hasText(source?.id) || ids.has(source.id) || !hasText(source.title)
      || !hasText(source.url) || !safeSourceUrl(source.url)
      || !hasDate(source.publishedAt ?? source.observedAt)) return null;
    ids.add(source.id);
  }
  const claims = [value.summary, ...(value.background ?? [])];
  if (claims.some(claim => !hasText(claim?.text) || !Array.isArray(claim.sourceIds)
    || !claim.sourceIds.length || claim.sourceIds.some(id => !ids.has(id)))) return null;
  const claimIds = new Set();
  for (const claim of value.background ?? []) {
    if (!hasText(claim.id) || claimIds.has(claim.id) || !hasText(claim.title)) return null;
    claimIds.add(claim.id);
  }
  return value;
}

// Quote composition never changes cached AI prose or implies an event return.
function describeBriefingPrice(price, symbol) {
  if (!price || price.symbol !== symbol
    || price.basis !== 'daily_change_not_event_return' || !hasText(price.source)
    || !hasDate(price.observedAt) || !hasDate(price.baselineDate)
    || !Number.isFinite(price.price) || price.price <= 0
    || !Number.isFinite(price.baselinePrice) || price.baselinePrice <= 0
    || Date.parse(price.baselineDate) >= Date.parse(price.observedAt)) return null;
  const change = (price.price / price.baselinePrice - 1) * 100;
  if (!Number.isFinite(change)) return null;
  const date = new Intl.DateTimeFormat('sv-SE', {
    day: 'numeric', month: 'long', timeZone: price.timezone,
  }).format(new Date(price.observedAt));
  const time = new Intl.DateTimeFormat('sv-SE', {
    hour: '2-digit', minute: '2-digit', timeZone: price.timezone,
  }).format(new Date(price.observedAt)).replace(':', '.');
  const percent = Math.abs(change).toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const movement = Math.abs(change) < 0.05 ? 'oförändrad' : `${change > 0 ? 'upp' : 'ned'} ${percent} procent`;
  return { ...price, sentence: `Den ${date} kl. ${time} var aktien ${movement} för dagen.` };
}

// Frozen review data is explicit and cannot become a production API fallback.
export function prototypeBriefingPrice(record, symbol) {
  if (record?.mode !== 'reviewed_prototype') return null;
  return describeBriefingPrice({ ...record.priceContext, currency: 'SEK', timezone: 'Europe/Stockholm' }, symbol);
}

// Uses the very same quote as the header, independently of the selected graph
// range. No extra fetch, cache write or model request. Missing/mismatched data
// omits only the price sentence, never the saved news summary.
export function companyBriefingPrice({ symbol, quote, chart, profile, intraday, now = Date.now() }) {
  if (!symbol || chart?.symbol !== symbol || !quote || (quote.symbol && quote.symbol !== symbol)
    || !Number.isFinite(quote.price) || quote.price <= 0 || !Number.isFinite(quote.changePct)
    || !hasText(quote.sourceName ?? quote.source)) return null;
  const rawTime = quote.quoteTime ?? quote.dataAsOf;
  const time = typeof rawTime === 'number' ? rawTime : hasDate(rawTime) ? Date.parse(rawTime) : NaN;
  // Do not use receipt/fetch time to freshen a stale or undated quote.
  if (!Number.isFinite(time) || time > now + 300_000 || now - time > 7 * 86400_000) return null;
  const currency = profile?.tradingCurrency ?? quote.currency ?? profile?.currency;
  if (!/^[A-Z]{3}$/.test(currency ?? '') || (quote.currency && quote.currency !== currency)) return null;
  const timezone = profile?.timezone ?? chart.timezone ?? 'Europe/Stockholm';
  let sessionDate;
  try { sessionDate = new Intl.DateTimeFormat('sv-SE', { timeZone: timezone }).format(new Date(time)); }
  catch { return null; }
  const isSessionDate = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && hasDate(date);
  const previous = intraday?.symbol === symbol && intraday.sessionDate === sessionDate
    && isSessionDate(intraday.previousSessionDate) && Number.isFinite(intraday.previousClose)
    ? { date: intraday.previousSessionDate, close: intraday.previousClose }
    : (Array.isArray(chart.bars) ? chart.bars : [])
      .filter(row => isSessionDate(row?.date) && row.date < sessionDate)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!previous || previous.date >= sessionDate || !Number.isFinite(previous.close) || previous.close <= 0
    || time - Date.parse(previous.date) > 10 * 86400_000) return null;
  const changePct = (quote.price / previous.close - 1) * 100;
  // A missing bar, split adjustment, or stale merged change must not invent a
  // daily return. Confirm the stored baseline against the quote's own change.
  if (Math.abs(changePct - quote.changePct) > 0.05
    || (quote.change != null && (!Number.isFinite(quote.change)
      || Math.abs(quote.price - previous.close - quote.change) > 0.015))) return null;
  return describeBriefingPrice({ symbol, basis: 'daily_change_not_event_return',
    baselineDate: previous.date, baselinePrice: previous.close, price: quote.price,
    observedAt: new Date(time).toISOString(), source: quote.sourceName ?? quote.source,
    currency, timezone, verifiedRealtime: quote.verifiedRealtime === true,
  }, symbol);
}
