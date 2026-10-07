// AI copy is a separate editorial field, never an alias for the wire template.
// Keep the deterministic summary intact for ranking/search, not presentation.
export function newsSummary(value) {
  const text = typeof value?.text === "string" ? value.text.trim() : "";
  const bullets = Array.isArray(value?.bullets)
    ? [...new Set(value.bullets.filter((entry) => typeof entry === "string")
      .map((entry) => entry.trim()).filter(Boolean))].slice(0, 3)
    : [];
  return text || bullets.length ? { text, bullets } : null;
}

// Publisher RSS copy is a distinct fallback, never stored/labeled as AI prose.
// Require explicit provenance so generic wire templates cannot leak into cards.
const RSS_PUBLISHERS = { placera: 'Placera', efn: 'EFN', borskollen: 'Börskollen' };
export function newsSourceExcerpt(source) {
  if (source?.lane !== 'context') return null;
  if (Object.hasOwn(RSS_PUBLISHERS, source.name) && source.contentOrigin === 'rss' && source.contentRights === 'full_text') {
    const text = typeof source.rssExcerpt === 'string' ? source.rssExcerpt.trim().slice(0, 600) : '';
    return text ? { text, publisher: RSS_PUBLISHERS[source.name], kind: 'rss' } : null;
  }
  if (source.name === 'mfn' && source.sourceKind === 'research' && source.contentRights === 'excerpt_only') {
    const text = typeof source.researchExcerpt === 'string' ? source.researchExcerpt.trim().slice(0, 600) : '';
    const publisher = typeof source.publisher === 'string' ? source.publisher.trim().slice(0, 200) : '';
    return text && publisher ? { text, publisher, kind: 'research' } : null;
  }
  return null;
}

export function newsDescription(item) {
  const ai = newsSummary(item?.aiSummary);
  if (ai) return { value: ai, label: "AI-sammanfattning", shortLabel: "Kort AI-sammanfattning" };
  const excerpt = item?.sourceExcerpt;
  const text = typeof excerpt?.text === "string" ? excerpt.text.trim().slice(0, 600) : "";
  const validRss = excerpt?.kind === 'rss' && Object.values(RSS_PUBLISHERS).includes(excerpt.publisher);
  const validResearch = excerpt?.kind === 'research' && typeof excerpt.publisher === 'string' && excerpt.publisher.trim();
  if (!text || !(validRss || validResearch)) return null;
  const publisher = excerpt.publisher.trim().slice(0, 200);
  const attribution = `${publisher} (${validRss ? 'RSS' : 'analysingress'})`;
  return { value: { text, bullets: [] }, label: `Källtext · ${attribution}`, shortLabel: `Kort källtext från ${attribution}` };
}
