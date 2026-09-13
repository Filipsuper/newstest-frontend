import { letterChange } from "./editorial.js";
import { stripSummaryMarkup } from "./stripSummaryMarkup.js";
import { ogDate, previewText } from "../og/_shared/theme.js";

// Refresh the artwork without changing existing newsletter URLs.
export const LETTER_OG_VERSION = "20260913";
export function letterShareImageHref(id, { encoded = false } = {}) {
  let segment = String(id);
  // Metadata receives the route's encoded segment in production. Decode that
  // transport representation once so Swedish titles do not become %25C3... .
  // Plain callers still pass literal titles, including literal percent signs.
  if (encoded) {
    try { segment = decodeURIComponent(segment); } catch { /* Keep malformed input URL-safe. */ }
  }
  return `/article/${encodeURIComponent(segment)}/opengraph-image?v=${LETTER_OG_VERSION}`;
}

export function letterShareContent(article) {
  if (!article || article.success === false) {
    return {
      title: "Börsdagen, sammanfattad.",
      excerpt: "Läs Morgonbrevet och Kvällsbrevet på OMXsum.",
      edition: "Breven",
      date: null,
      quote: "",
      change: null,
    };
  }
  return {
    title: previewText(article.title || "Börsdagen, sammanfattad.", 164),
    excerpt: previewText(
      stripSummaryMarkup(article.introText || article.summary || ""),
      140,
    ),
    edition: article.isEveningLetter ? "Kvällsbrevet" : "Morgonbrevet",
    date: ogDate(article.createdAt, { year: "numeric" }),
    quote: article.omxPrice == null ? "" : String(article.omxPrice).trim(),
    change: letterChange(article.omxChangePercentage),
  };
}
