import { feedStoryToItem, matchingObservations } from './feedObservations.js';
import { refreshMarketObservations } from './newsroom.js';
import { newsSummary } from './newsSummary.js';

export const PERSONAL_PREVIEW_QUERY = { limit: 2, filter: 'companies', view: 'preview' };
export const PERSONAL_HEADLINES_QUERY = { limit: 20, view: 'headlines' };
export const PERSONAL_IMPORTANT_QUERY = { limit: 20, filter: 'companies', view: 'important' };
export const PERSONAL_OBSERVATION_FIELDS = ['reaction', 'reactionV2', 'marketContext', 'companyContext'];

// Enrichment may change observations, never headlines, identity, read state or
// ordering. Reuse the feed's exact-version/company/time and freshness checks.
export function mergePersonalPreviewObservations(stories, observations) {
  const current = stories.map(feedStoryToItem);
  const matching = matchingObservations(current, observations);
  const summaries = new Map(matching.map(story => [story.id, newsSummary(story.aiSummary)]));
  const updated = refreshMarketObservations(current, matching.map(feedStoryToItem));
  return stories.map((story, index) => ({ ...story,
    ...Object.fromEntries(PERSONAL_OBSERVATION_FIELDS.map(field => [field, updated[index][field]])),
    ...(summaries.get(story.id) ? { aiSummary: summaries.get(story.id) } : {}),
  }));
}
