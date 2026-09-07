import { featuredNews, normalizeStory, validStoryId } from "./newsroom.js";
import { currentLetter, marketDateKey } from "./letters.js";

// Public, bounded examples using the same selection rules as Marknaden.
// Never fetch the paid wire, rank purely by price move, or invent demo figures.
export function landingNews(overview, now) {
  const source = Array.isArray(overview?.news)
    ? overview.news
    : overview?.news?.items;
  if (overview?.unavailable || overview?.error || !Array.isArray(source))
    return { status: "unavailable", stories: [] };
  const stories = featuredNews(
    source
      .filter(
        (story) =>
          story &&
          validStoryId(story.id) &&
          typeof story.headline === "string" &&
          story.headline.trim() &&
          (!story.status || ["flash", "update"].includes(story.status)),
      )
      .map(normalizeStory),
    new Date(now).getTime(),
    2,
  );
  return {
    status: stories.length ? "ready" : "empty",
    stories,
    stale: Boolean(overview.stale),
  };
}

export function landingLetter(articles, now) {
  if (!Array.isArray(articles)) return { status: "unavailable", article: null };
  const eligible = articles.filter(
    (article) =>
      article &&
      typeof article.title === "string" &&
      article.title.trim() &&
      Number.isFinite(Date.parse(article.createdAt)) &&
      Date.parse(article.createdAt) <= new Date(now).getTime(),
  );
  const article =
    currentLetter(eligible, now) ??
    eligible
      .filter((item) => marketDateKey(item.createdAt) !== marketDateKey(now))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ??
    null;
  return { status: article ? "ready" : "empty", article };
}
