// Public company observations only. These display values never enter news
// ranking, saved event returns or a sum of the reader's followed companies.
export const PERSONAL_QUOTE_PAGE_SIZE = 4;
export const PERSONAL_QUOTE_REFRESH_MS = 30_000;
const DAILY_CACHE_MS = 15 * 60_000;
const CACHE_LIMIT = 24;
const cache = new Map();
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const timestamp = value => typeof value === 'string' ? Date.parse(value) : finite(value) ? value : NaN;
const symbolKey = value => typeof value === 'string' ? value.trim().toUpperCase() : '';
const validSymbol = value => /^[A-Z0-9.\-]{1,20}$/.test(value);
const validZone = value => ['Europe/Stockholm', 'Europe/Copenhagen', 'Europe/Helsinki', 'Europe/Oslo'].includes(value)
  ? value : 'Europe/Stockholm';
const dayAt = (value, timezone) => new Intl.DateTimeFormat('sv-SE', {
  timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(value));
const dateLabel = (value, timezone) => new Intl.DateTimeFormat('sv-SE', {
  timeZone: timezone, day: 'numeric', month: 'short', year: 'numeric',
}).format(new Date(value));
const sourceLabel = (name, source) => typeof name === 'string' && name.trim() ? name.trim()
  : typeof source === 'string' && source.startsWith('yahoo') ? 'Yahoo Finance'
    : typeof source === 'string' && source.trim() ? source.trim() : null;

export function personalQuoteSymbols(watchlist = []) {
  return [...new Set((Array.isArray(watchlist) ? watchlist : []).map(symbolKey).filter(validSymbol))];
}

export function personalQuotePage(watchlist, page = 0) {
  const symbols = personalQuoteSymbols(watchlist);
  const lastPage = Math.max(0, Math.ceil(symbols.length / PERSONAL_QUOTE_PAGE_SIZE) - 1);
  const index = Math.min(lastPage, Math.max(0, Math.floor(page) || 0));
  return { symbols: symbols.slice(index * PERSONAL_QUOTE_PAGE_SIZE, (index + 1) * PERSONAL_QUOTE_PAGE_SIZE),
    page: index, total: symbols.length, lastPage, start: index * PERSONAL_QUOTE_PAGE_SIZE };
}

export function personalCompanyQuote(payload, symbol, now = Date.now()) {
  if (payload?.symbol !== symbol || !payload.quote
    || (payload.quote.symbol && payload.quote.symbol !== symbol)) return null;
  const quote = payload.quote;
  const observedAt = timestamp(quote.quoteTime ?? quote.dataAsOf);
  if (!finite(quote.price) || quote.price <= 0 || !Number.isFinite(observedAt) || observedAt <= 0 || observedAt > now) return null;
  // This is the trading currency, never a financial statement's reporting currency.
  const currency = /^[A-Z]{3}$/.test(quote.currency ?? '') ? quote.currency : null;
  const timezone = validZone(payload.timezone);
  let change = finite(quote.changePct) ? quote.changePct : null;
  // With an explicit reference, don't display a contradictory daily percentage.
  if (change !== null && finite(payload.previousClose) && payload.previousClose > 0
    && Math.abs((quote.price / payload.previousClose - 1) * 100 - change) > 0.05) change = null;
  // A paused widget can stay mounted overnight. An actual date stays honest
  // without a new request or a clock-driven change to the observation.
  const period = dateLabel(observedAt, timezone);
  const time = new Intl.DateTimeFormat('sv-SE', { timeZone: timezone, hour: '2-digit', minute: '2-digit' }).format(observedAt);
  const source = sourceLabel(quote.sourceName, quote.source);
  return { symbol, price: quote.price, change, currency, observedAt, timezone, period, time,
    source, delayed: payload.updateMode === 'snapshot' || quote.updateMode === 'snapshot' || quote.delayed === true };
}

// Reject conflicting prices at the same instant instead of choosing a trade.
function orderedPoints(rows, now) {
  const ordered = rows.map(row => [timestamp(row?.[0]), row?.[1]])
    .filter(([time, close]) => Number.isFinite(time) && time > 0 && time <= now && finite(close) && close > 0)
    .sort((a, b) => a[0] - b[0]);
  const unique = [];
  for (const point of ordered) {
    const previous = unique.at(-1);
    if (previous?.[0] === point[0]) {
      if (previous[1] !== point[1]) previous[1] = null;
    } else unique.push([...point]);
  }
  return unique.filter(point => point[1] !== null);
}

export function personalIntradayHistory(payload, symbol, now = Date.now()) {
  if (payload?.symbol !== symbol || !Array.isArray(payload.current)) return null;
  const timezone = validZone(payload.timezone);
  const points = orderedPoints(payload.current.map(row => [row?.time, row?.close]), now);
  if (!points.length) return null;
  const dates = [...new Set(points.map(point => dayAt(point[0], timezone)))];
  const declaredDate = DAY_PATTERN.test(payload.sessionDate ?? '') ? payload.sessionDate : null;
  if (dates.length !== 1 || (declaredDate && declaredDate !== dates[0])) return null;
  const period = dateLabel(points[0][0], timezone);
  return { symbol, points, kind: 'session', timezone, period: `Handelsdagen ${period}`,
    source: sourceLabel(payload.sourceName, null) };
}

export function personalDailyHistory(payload, symbol, now = Date.now()) {
  if (payload?.symbol !== symbol || !Array.isArray(payload.points)) return null;
  const points = orderedPoints(payload.points, now).slice(-22);
  if (!points.length) return null;
  const timezone = 'Europe/Stockholm';
  const first = dateLabel(points[0][0], timezone), last = dateLabel(points.at(-1)[0], timezone);
  return { symbol, points, kind: 'daily', timezone,
    // The public spark response has no completed-session flag; its newest
    // stored daily bar must not be promised as a finalized closing price.
    period: first === last ? `Dagskurs ${last}` : `Dagskurser ${first}–${last}`, source: null };
}

export function personalCompanySparkGeometry(points = []) {
  if (!points.length) return null;
  const values = points.map(point => point[1]);
  if (!points.every(point => Array.isArray(point) && finite(point[0]) && finite(point[1]) && point[1] > 0)) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const first = points[0][0], last = points.at(-1)[0];
  const x = time => points.length === 1 ? 36 : 2 + (time - first) / (last - first || 1) * 68;
  const y = value => max === min ? 12 : 22 - (value - min) / (max - min) * 20;
  return { path: points.map(([time, value], index) => `${index ? 'L' : 'M'}${x(time).toFixed(2)},${y(value).toFixed(2)}`).join(' '),
    dot: points.length === 1 ? { x: 36, y: 12 } : null };
}

async function sourceSnapshot(symbol, kind, { signal, force, fetcher, apiUrl, now }) {
  const key = `${apiUrl}:${kind}:${symbol}`;
  const retained = cache.get(key);
  const ttl = kind === 'session' ? PERSONAL_QUOTE_REFRESH_MS : DAILY_CACHE_MS;
  if (!force && retained && now() - retained.at < ttl) return retained.data;
  const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(12_000)]) : AbortSignal.timeout(12_000);
  const path = kind === 'session' ? `/feed/company/${encodeURIComponent(symbol)}/intraday` : `/feed/spark/${encodeURIComponent(symbol)}`;
  const response = await fetcher(`${apiUrl}${path}`, { credentials: 'include', cache: 'no-store', signal: requestSignal });
  if (!response.ok) throw new Error('Bolagskursen kunde inte hämtas');
  const data = await response.json();
  if (data?.error || data?.symbol !== symbol) throw new Error('Bolagsdata saknar rätt aktiesymbol');
  if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  cache.delete(key);
  cache.set(key, { at: now(), data });
  while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
  return data;
}

// Emit the quote before an optional daily-history fallback finishes. One
// visible company costs one request, or two when minute history is absent.
export async function fetchPersonalQuoteSnapshot(symbol, { signal, force = false, onPartial,
  fetcher = fetch, apiUrl = process.env.NEXT_PUBLIC_API_URL, now = Date.now } = {}) {
  if (!validSymbol(symbol)) throw new Error('Ogiltig aktiesymbol');
  const options = { signal, force, fetcher, apiUrl, now };
  let snapshot = { symbol, quote: null, history: null, quoteStatus: 'unavailable', historyStatus: 'loading' };
  try {
    const body = await sourceSnapshot(symbol, 'session', options);
    const quote = personalCompanyQuote(body, symbol, now());
    const history = personalIntradayHistory(body, symbol, now());
    snapshot = { symbol, quote, history, quoteStatus: quote ? 'available' : 'missing', historyStatus: history ? 'available' : 'loading' };
    if (history) return snapshot;
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  onPartial?.(snapshot);
  try {
    const daily = await sourceSnapshot(symbol, 'daily', options);
    const history = personalDailyHistory(daily, symbol, now());
    return { ...snapshot, history, historyStatus: history ? 'available' : 'missing' };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { ...snapshot, historyStatus: 'unavailable' };
  }
}

export function mergePersonalQuoteSnapshot(previous, incoming) {
  return { ...incoming,
    quote: incoming.quoteStatus === 'unavailable' ? previous?.quote ?? null : incoming.quote,
    history: ['unavailable', 'loading'].includes(incoming.historyStatus) ? previous?.history ?? null : incoming.history,
    quoteRetained: incoming.quoteStatus === 'unavailable' && Boolean(previous?.quote),
    historyRetained: incoming.historyStatus === 'unavailable' && Boolean(previous?.history),
  };
}
