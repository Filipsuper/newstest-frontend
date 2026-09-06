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
