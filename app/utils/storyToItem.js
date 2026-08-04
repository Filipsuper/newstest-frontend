// Maps the Market API's Story v1 payload to the flat shape our news
// components render. Used for both REST responses and SSE events.
const OFFICIAL_SOURCES = new Set(["fi", "nasdaq", "riksbank"]);

export function storyToItem(story) {
    const company = story.companies?.[0] ?? null;
    const source = story.primarySource?.name ?? story.sources?.[0]?.name ?? "wire";

    return {
        id: story.id,
        version: story.version ?? 1,
        ts: Date.parse(story.publishedAt),
        source,
        title: story.headline,
        company: company?.name ?? null,
        symbol: company?.symbol ?? null,
        url: story.primarySource?.url ?? story.sources?.[0]?.url ?? null,
        regulatory: (story.tags ?? []).includes("REGULATORY") || OFFICIAL_SOURCES.has(source),
        labels: story.tags ?? [],
        importance: story.importance ?? null,
        summary: story.summary ?? null,
        facts: story.facts ?? null,
        status: story.status,
    };
}
