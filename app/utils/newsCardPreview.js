import { newsSummary } from './newsSummary.js';

// Presentation-only excerpts. Full AI/source fields and ranking inputs stay intact.
export function newsCardExcerpt(value, maxLength = 220) {
  const summary = newsSummary(value);
  const text = (summary?.text || summary?.bullets[0] || '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  if (text.length <= maxLength) return text;
  const sentences = [...text.matchAll(/[.!?](?=\s|$)/g)];
  const end = sentences.map(match => match.index + 1).filter(index => index <= maxLength).at(-1);
  if (end) return text.slice(0, end);
  const prefix = text.slice(0, maxLength - 1);
  const wordEnd = prefix.lastIndexOf(' ');
  return `${prefix.slice(0, wordEnd > 0 ? wordEnd : prefix.length).trimEnd()}…`;
}

// Remove only an exact, redundant company prefix, not words inside the headline.
// Do not invent an editorial headline or strip a different share class/name.
export function newsCardHeadline(title, company) {
  if (typeof title !== 'string' || typeof company !== 'string' || !company.trim()) return title;
  const text = title.trim(), name = company.trim();
  if (text.slice(0, name.length).toLocaleLowerCase('sv-SE') !== name.toLocaleLowerCase('sv-SE')) return title;
  const remainder = text.slice(name.length);
  const match = remainder.match(/^\s*(?::|—|–| - )\s*(\S[\s\S]*)$/);
  return match?.[1] || title;
}
