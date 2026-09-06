import { storyToItem } from "./storyToItem.js";
import {
  curateMarketNews,
  normalizedSymbol,
  uniqueNews,
} from "./marketNewsRanking.js";
import { TOPIC_LABELS } from "./topicLabels.js";

export const validStoryId = (id) =>
  /^[A-Za-z0-9_-]{1,80}$/.test(String(id ?? ""));
export const storyHref = (id) =>
  validStoryId(id) ? `/nyhet/${encodeURIComponent(id)}` : null;
export const safeSourceUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};
export const finiteNumber = (value) =>
  value == null || value === ""
    ? null
    : Number.isFinite(Number(value))
      ? Number(value)
      : null;
export const newsDate = (value, options = {}) => {
  if (value == null || value === "") return "Tid saknas";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("sv-SE", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Stockholm",
        ...options,
      }).format(date)
    : "Tid saknas";
};
export function normalizeStory(input = {}) {
  const item = input.headline ? storyToItem(input) : input;
  return {
    ...item,
    title: item.title || "Nyheten saknar rubrik",
    companies: item.companies?.length
      ? item.companies
      : item.symbol
        ? [{ symbol: item.symbol, name: item.company }]
        : [],
    sources: (input.sources?.length
      ? input.sources
      : input.primarySource
        ? [input.primarySource]
        : item.url
          ? [{ name: item.source, url: item.url }]
          : []
    ).map((source) => ({ ...source, url: safeSourceUrl(source.url) })),
  };
}

export const preferenceReason = (story) => {
  if (story.matchedKeyword) return `Matchar ”${story.matchedKeyword}”`;
  if (story.viaWatchlist) return "Bolag du följer";
  if (story.viaIndustry)
    return `Relaterad bransch${story.industry ? `: ${TOPIC_LABELS[story.industry] ?? story.industry}` : ""}`;
  if (story.matchedTopic)
    return `Du följer ${TOPIC_LABELS[story.matchedTopic] ?? story.matchedTopic}`;
  return "Matchar din bevakning";
};
export function personalStoryToItem(story) {
  return normalizeStory({
    ...story,
    companies: story.companies?.length
      ? story.companies
      : story.symbol
        ? [{ symbol: story.symbol, name: story.company }]
        : [],
    reaction:
      story.reaction ??
      (story.reactionPct == null ? null : { pct: story.reactionPct }),
  });
}

// These are administrative notices, not explanations for a day's share-price move.
const ADMINISTRATIVE =
  /invitation to|inbjudan till|notice (?:of|to attend)|kallelse till|financial calendar|finansiell kalender|number of shares and votes|antal aktier och röster/i;
export function featuredNews(items, now, limit = 5) {
  const ranked = curateMarketNews(items, { referenceTs: now });
  const seen = new Set();
  return ranked
    .filter((item) => {
      if (ADMINISTRATIVE.test(item.title ?? "")) return false;
      if (
        !Number.isFinite(item.ts) ||
        item.ts > now ||
        now - item.ts > 96 * 3600_000
      )
        return false;
      const key = normalizedSymbol(item.symbol) || item.eventId || item.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}
export const chronologicalNews = (items) =>
  uniqueNews(items).sort((a, b) => (b.ts || 0) - (a.ts || 0));
export function mergeFeed(items, incoming) {
  const byId = new Map(items.map((item) => [item.id, item]));
  for (const item of incoming) {
    if (!item?.id) continue;
    if (item.status && !["flash", "update"].includes(item.status)) {
      byId.delete(item.id);
      continue;
    }
    const existing = byId.get(item.id);
    if (existing && (existing.version ?? 1) > (item.version ?? 1)) continue;
    byId.set(item.id, { ...existing, ...item });
  }
  return chronologicalNews([...byId.values()]);
}
export const pendingChanges = (current, incoming) =>
  incoming.filter((item) => {
    const old = current.find((row) => row.id === item.id);
    return !old || (item.version ?? 1) > (old.version ?? 1);
  });
