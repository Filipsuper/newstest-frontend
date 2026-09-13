// Read-only replay of a saved public /api/feed/market-overview response.
// Usage: node scripts/audit-featured-news.mjs /path/to/overview.json
import { readFile } from "node:fs/promises";
import { storyToItem } from "../app/utils/storyToItem.js";
import { curateMarketNews, normalizedSymbol, uniqueNews } from "../app/utils/marketNewsRanking.js";
import { assessFeaturedNews, selectFeaturedNews } from "../app/utils/featuredNewsRanking.js";
import { marketDateKey } from "../app/utils/letters.js";

if (!process.argv[2]) {
  console.error("Usage: node scripts/audit-featured-news.mjs /path/to/overview.json");
  process.exit(1);
}
const snapshot = JSON.parse(await readFile(process.argv[2], "utf8"));
const now = Date.parse(snapshot.generatedAt);
if (!Number.isFinite(now) || !Array.isArray(snapshot.news)) throw new Error("Expected a dated public market snapshot");
const input = [...snapshot.news, ...(snapshot.moverNews ?? [])].map(storyToItem);
const rows = uniqueNews(input);
const countBy = (values) => values.reduce((result, value) => {
  result[value] = (result[value] ?? 0) + 1;
  return result;
}, {});
// Preserve the released 0d78fb2 selection for an explicit before/after replay.
const seen = new Set();
const before = curateMarketNews(input, { referenceTs: now }).filter((item) => {
  if (/invitation to|inbjudan till|notice (?:of|to attend)|kallelse till|financial calendar|finansiell kalender|number of shares and votes|antal aktier och röster/i.test(item.title ?? "")) return false;
  if (!Number.isFinite(item.ts) || item.ts > now || now - item.ts > 96 * 3600_000) return false;
  const key = normalizedSymbol(item.symbol) || item.eventId || item.id;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}).slice(0, 5);
const after = selectFeaturedNews(input, now);
const describe = (items) => ({
  todayCount: items.filter((item) => marketDateKey(item.ts) === marketDateKey(now)).length,
  financingCount: items.filter((item) => assessFeaturedNews(item, now).topic === "financing").length,
  followUpCount: items.filter((item) => assessFeaturedNews(item, now).followUpPenalty > 0).length,
  topics: countBy(items.map((item) => assessFeaturedNews(item, now).topic)),
  stories: items.map((item) => ({
    id: item.id, company: item.company, title: item.title,
    publishedAt: new Date(item.ts).toISOString(),
    assessment: assessFeaturedNews(item, now),
  })),
});
console.log(JSON.stringify({
  asOf: snapshot.generatedAt,
  scope: "Bounded public selection, not a complete archive or historical point-in-time feed",
  sourceRows: snapshot.news.length, moverRows: snapshot.moverNews?.length ?? 0,
  uniqueIds: new Set(input.map((item) => item.id)).size, deduplicatedRows: rows.length,
  dates: countBy(rows.map((item) => marketDateKey(item.ts))),
  tags: countBy(rows.flatMap((item) => item.labels)),
  eligibility: countBy(rows.map((item) => assessFeaturedNews(item, now).reason)),
  before: describe(before), after: describe(after),
}, null, 2));
