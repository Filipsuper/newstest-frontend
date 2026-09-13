export const validStoryId = (id) =>
  typeof id === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(id);

// Headlines can change and two stories can have the same headline. Retain the
// immutable API id after an unreserved separator that cannot occur in that id.
// Legacy ID-only links and links with an older headline still resolve exactly.
const SEPARATOR = "~";
const MAX_SLUG_LENGTH = 120;

export function storySlug(headline = "") {
  const words = String(headline)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (words.length <= MAX_SLUG_LENGTH) return words;
  const bounded = words.slice(0, MAX_SLUG_LENGTH);
  const end = bounded.lastIndexOf("-");
  return end > 0 ? bounded.slice(0, end) : bounded;
}

export function storyHref(id, headline = "") {
  if (!validStoryId(id)) return null;
  const slug = storySlug(headline);
  return `/nyhet/${slug ? `${slug}${SEPARATOR}` : ""}${id}`;
}

export function storyIdFromPath(segment) {
  if (typeof segment !== "string") return null;
  if (!segment.includes(SEPARATOR)) return validStoryId(segment) ? segment : null;
  const [slug, id, extra] = segment.split(SEPARATOR);
  if (extra !== undefined || slug.length > MAX_SLUG_LENGTH
      || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug) || !validStoryId(id)) return null;
  return id;
}
