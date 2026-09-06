import { marketDateKey } from "./letters.js";
import { stripSummaryMarkup } from "./stripSummaryMarkup.js";

export const articleHref = (title) =>
  `/article/${encodeURIComponent(
    String(title ?? "")
      .replaceAll("-", "_")
      .replaceAll(" ", "-"),
  )}`;
export const readingMinutes = (summary) =>
  Math.max(
    1,
    Math.ceil(
      stripSummaryMarkup(String(summary ?? ""))
        .split(/\s+/)
        .filter(Boolean).length / 200,
    ),
  );
export function letterDate(value) {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Stockholm",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    : "Datum saknas";
}
export function letterBlocks(summary) {
  return String(summary ?? "")
    .split(/(##[^#]+##)/g)
    .flatMap((part) => {
      if (part.startsWith("##") && part.endsWith("##"))
        return [{ type: "heading", text: part.slice(2, -2).trim() }];
      return part
        .split(/\n+/)
        .map((text) => text.trim())
        .filter(Boolean)
        .map((text) => ({ type: "paragraph", text }));
    });
}
export function latestEdition(articles, evening, now = new Date()) {
  const rows = (Array.isArray(articles) ? articles : [])
    .filter(
      (article) =>
        Boolean(article.isEveningLetter) === evening &&
        Date.parse(article.createdAt) <= new Date(now).getTime(),
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const article = rows[0] ?? null;
  return {
    article,
    isToday: Boolean(
      article && marketDateKey(article.createdAt) === marketDateKey(now),
    ),
  };
}
export function letterChange(value) {
  if (value == null || value === "") return null;
  const cleaned = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(/%$/, "")
    .replace(",", ".")
    .replace("−", "-");
  return /^[+-]?\d+(?:\.\d+)?$/.test(cleaned) ? Number(cleaned) : null;
}
