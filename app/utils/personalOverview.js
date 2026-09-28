import { normalizedSymbol, insiderMateriality } from './marketNewsRanking.js';

// Personal editorial selection, not email eligibility or a market-wide score.
// Daily prices must not promote routine notices or change reading order.
const ROUTINE = /inbjudan till|invitation to|kallelse till|notice of|financial calendar|finansiell kalender|antal aktier och röster|number of shares and votes|(?:återköp|repurchases?).{0,100}(?:under perioden|under vecka|during the period|during week)/i;
const DAY = 86_400_000;

export function followedCompanies(item, watchlist) {
  const followed = new Set(watchlist.map(normalizedSymbol));
  const companies = item.companies?.length ? item.companies : [{ symbol: item.symbol, name: item.company }];
  const matches = new Map();
  for (const company of companies) {
    const symbol = normalizedSymbol(company?.symbol);
    if (followed.has(symbol) && !matches.has(symbol)) matches.set(symbol, { ...company, symbol });
  }
  return [...matches.values()];
}

// Only exact event IDs are grouped here. Similar headlines/facts can describe
// a subsequent order, correction or financing stage and are not duplicates.
export function personalEvents(items) {
  const events = new Map();
  for (const item of items) {
    if (!item.id || (item.status && !['flash', 'update'].includes(item.status))) continue;
    const key = item.eventId || item.id;
    const old = events.get(key);
    if (!old || item.ts > old.ts || (item.ts === old.ts && (item.version ?? 1) > (old.version ?? 1))) events.set(key, item);
  }
  return [...events.values()].sort((a, b) => b.ts - a.ts || a.id.localeCompare(b.id));
}

export function importantPersonalNews(items, watchlist, now, limit = 3) {
  return personalEvents(items).filter(item => item.readState?.status !== 'read' && item.title?.trim() && followedCompanies(item, watchlist).length
    && Number.isFinite(item.ts) && item.ts <= now && now - item.ts <= 7 * DAY
    && Number(item.importance) >= 75 && !ROUTINE.test(item.title ?? '')
    && insiderMateriality(item) !== 'routine')
    .sort((a, b) => Number(b.importance) - Number(a.importance) || b.ts - a.ts || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function groupPersonalCompanies(items, watchlist) {
  const groups = new Map();
  for (const item of personalEvents(items)) {
    for (const company of followedCompanies(item, watchlist)) {
      if (!groups.has(company.symbol)) groups.set(company.symbol, { ...company, items: [] });
      groups.get(company.symbol).items.push(item);
    }
  }
  return [...groups.values()].sort((a, b) => b.items[0].ts - a.items[0].ts || a.symbol.localeCompare(b.symbol));
}
