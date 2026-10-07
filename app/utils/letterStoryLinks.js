import { letterBlocks } from './editorial.js';
import { storyHref, validStoryId } from './storyUrls.js';

/** Citations belong to the exact stored text, never a company/headline match. */
export function linkedLetterBlocks(summary, storyLinks) {
  const fallback = () => letterBlocks(summary).map(block => ({ ...block, sources: [] }));
  if (typeof summary !== 'string' || summary.length > 200_000
      || storyLinks?.schemaVersion !== 1 || !Array.isArray(storyLinks.blocks)
      || !storyLinks.blocks.length || storyLinks.blocks.length > 200
      || !Array.isArray(storyLinks.sources) || storyLinks.sources.length > 100) return fallback();
  const blocks = storyLinks.blocks;
  if (blocks.some(block => !block || !['heading', 'paragraph'].includes(block.type)
      || typeof block.text !== 'string' || !block.text.trim() || block.text.length > 10_000
      || block.text !== block.text.trim() || /[\r\n\u2028\u2029]|##/.test(block.text)
      || !Array.isArray(block.sourceStoryIds) || block.sourceStoryIds.length > 10
      || block.sourceStoryIds.some(id => !validStoryId(id))
      || (block.type === 'heading' && block.sourceStoryIds.length))) return fallback();
  const serialized = blocks.map(block => block.type === 'heading' ? `##${block.text}##` : block.text).join('\n\n');
  if (serialized !== summary) return fallback();
  const sources = new Map();
  for (const source of storyLinks.sources) {
    if (!source || !validStoryId(source.id) || typeof source.headline !== 'string'
        || !source.headline.trim() || source.headline.length > 2000 || sources.has(source.id)) return fallback();
    sources.set(source.id, { id: source.id, headline: source.headline, href: storyHref(source.id, source.headline) });
  }
  // Reject an incomplete provenance document rather than attaching partial or
  // invented evidence. The original summary remains fully readable.
  if (blocks.some(block => block.sourceStoryIds.some(id => !sources.has(id)))) return fallback();
  return blocks.map(block => ({ type: block.type, text: block.text,
    sources: [...new Set(block.sourceStoryIds)].map(id => sources.get(id)) }));
}
