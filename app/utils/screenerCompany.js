const SYMBOL = /^[A-Za-z0-9._:-]{1,64}$/;
export const COMPANY_PREVIEW_TTL = 30_000;

export function readScreenerCompany(search) {
  const symbol = new URLSearchParams(search).get('company');
  return symbol && SYMBOL.test(symbol) ? symbol : null;
}

export function screenerCompanyQuery(search, symbol) {
  const params = new URLSearchParams(search);
  if (symbol && SYMBOL.test(symbol)) params.set('company', symbol);
  else params.delete('company');
  return params.toString();
}

export function matchingCompanyOverview(data, symbol) {
  const identities = [data?.symbol, data?.summary?.symbol, data?.summary?.profile?.symbol, data?.chart?.symbol].filter(Boolean);
  return Boolean(data?.summary?.profile && identities.length && identities.every(value => value === symbol));
}

// Owned by one mounted, account/plan-scoped screener. No persistence or private
// global cache, no adjacent-company prefetch or per-row requests.
export function cacheCompanyPreview(cache, symbol, data, now = Date.now()) {
  if (!matchingCompanyOverview(data, symbol)) return false;
  cache.delete(symbol);
  cache.set(symbol, { data, at: now });
  while (cache.size > 12) cache.delete(cache.keys().next().value);
  return true;
}
