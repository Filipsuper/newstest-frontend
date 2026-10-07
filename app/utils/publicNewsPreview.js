import { chronologicalNews } from './newsroom.js';
import { storyToItem } from './storyToItem.js';
import { isSwedishNews } from './swedishNews.js';

export const PUBLIC_NEWS_PREVIEW_LIMIT = 16;

// Prefer the ordinary chronological pool, separate from featured candidates.
// Older servers retain their previous public snapshot contract during rollout.
// A fixed cap cannot be enlarged through feed search/filter/cursor parameters.
export function publicNewsPreview(data) {
  const hasLatest = data != null && Object.hasOwn(data, 'latestNews');
  const pool = hasLatest ? data.latestNews : data?.news;
  const news = Array.isArray(pool) ? pool : pool?.items;
  if (!Array.isArray(news)) throw new Error('Nyhetsurvalet kunde inte hämtas.');
  return chronologicalNews([
    ...news,
    ...(!hasLatest && Array.isArray(data.moverNews) ? data.moverNews : []),
  ].filter(story => story?.id && story?.headline
    && Number.isFinite(Date.parse(story.publishedAt))
    && (!story.status || ['flash', 'update'].includes(story.status))
    && isSwedishNews(story)).map(storyToItem)).slice(0, PUBLIC_NEWS_PREVIEW_LIMIT);
}
