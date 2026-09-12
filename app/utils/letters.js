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
/** Only supplied newsletter bullets qualify as takeaways. */
export function letterTakeaways(article, limit = 2) {
  const source = article?.bulletPoints;
  const lines = Array.isArray(source)
    ? source.filter((line) => typeof line === "string")
    : typeof source === "string" ? source.split(/\r?\n/) : [];
  return lines
    .map((line) => stripSummaryMarkup(
      line.replace(/^\s*(?:[-*•](?:\s+|$)|\d+[.)]\s+)/, ""),
    ))
    .filter(Boolean)
    .slice(0, limit);
}

export function letterExcerpt(article, limit = 220) {
  const text = [article?.introText, letterTakeaways(article, 1)[0], article?.summary]
    .filter((value) => typeof value === "string")
    .map(stripSummaryMarkup)
    .find(Boolean) || "";
  if (text.length <= limit) return text;
  let boundary = text.lastIndexOf(" ", limit - 1);
  // A long first word remains whole; wrapping is the presentation's concern.
  if (boundary < 0) boundary = text.indexOf(" ", limit);
  return boundary < 0 ? text : `${text.slice(0, boundary).trimEnd()}…`;
}
