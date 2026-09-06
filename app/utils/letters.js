import { stripSummaryMarkup } from "./stripSummaryMarkup.js";

export const marketDateKey = (value, timeZone = "Europe/Stockholm") => {
  if (value == null) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("sv-SE", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date)
    : null;
};
export function currentLetter(articles, now) {
  const sorted = [...articles]
    .filter(
      (article) => Date.parse(article.createdAt) <= new Date(now).getTime(),
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Stockholm",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(now));
  const evening = sorted.find(
    (article) =>
      article.isEveningLetter &&
      marketDateKey(article.createdAt) === marketDateKey(now),
  );
  return time >= "17:30" && evening
    ? evening
    : (sorted.find((article) => !article.isEveningLetter) ?? null);
}
export function letterExcerpt(article, limit = 220) {
  const bullet = article?.bulletPoints
    ?.split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .find(Boolean);
  const text = stripSummaryMarkup(
    article?.introText || bullet || article?.summary || "",
  );
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
}
