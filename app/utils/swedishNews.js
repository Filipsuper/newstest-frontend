// Same listing scope as the Market API, also applied to incoming SSE frames.
const swedishSymbol = /^(?:(?:XSTO|XSAT|XNGM)\.[A-Z0-9_-]+|[A-Z0-9_-]+\.ST)$/i;
export function isSwedishNews(story) {
  const companies = story?.companies ?? [];
  return companies.some(company => company?.exchangeMic
    ? ["XSTO", "XSAT", "XNGM"].includes(company.exchangeMic)
    : swedishSymbol.test(company?.symbol ?? ""))
    || (!companies.length && (story?.primarySource?.name ?? story?.source) === "riksbank");
}
