import { storyToItem } from "./storyToItem.js";

// A missing optional field means the fast response did not fetch it. An
// explicit null means the source has no such observation. Keep that distinction.
export function feedStoryToItem(story) {
  const item = storyToItem(story);
  for (const field of ["reaction", "marketContext", "reactionV2", "companyContext"])
    if (!(field in story)) item[field] = undefined;
  return item;
}

export function matchingObservations(current, incoming) {
  const byId = new Map(current.map(item => [item.id, item]));
  return incoming.filter(row => {
    const item = byId.get(row.id);
    return item && (item.version ?? 1) === (row.version ?? 1)
      && item.ts === Date.parse(row.publishedAt)
      && JSON.stringify(item.symbols) === JSON.stringify((row.companies ?? []).map(company => company.symbol));
  });
}
