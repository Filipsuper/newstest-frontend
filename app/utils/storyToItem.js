// Maps the Market API's Story v1 payload to the flat shape our news
// components render. Used for both REST responses and SSE events.
import { newsSummary, newsSourceExcerpt } from "./newsSummary.js";
const OFFICIAL_SOURCES = new Set(["fi", "nasdaq", "riksbank"]);

// Carry presentation policy, not the producer's private validation/evidence.
// A false featured flag is a veto even during mixed-version rollout; true does
// not override the reader's existing age, status or editorial ranking checks.
export function storyEditorialPolicy(story) {
    const supplied = story?.editorial;
    const flags = [story?.featuredEligible, supplied?.featuredEligible, supplied?.eligible]
        .filter(value => typeof value === 'boolean');
    const featuredEligible = flags.includes(false) ? false : flags.includes(true) ? true : undefined;
    const editorial = ['omxsum_news', 'source'].includes(supplied?.kind) ? {
        kind: supplied.kind,
        ...(typeof supplied.label === 'string' ? { label: supplied.label.trim().slice(0, 80) } : {}),
        ...(typeof supplied.eligible === 'boolean' ? { eligible: supplied.eligible } : {}),
        ...(featuredEligible !== undefined ? { featuredEligible } : {}),
        ...(['full', 'brief'].includes(supplied.publicationTier) ? { publicationTier: supplied.publicationTier } : {}),
        ...(['partial', 'complete'].includes(supplied.sourceCoverage) ? { sourceCoverage: supplied.sourceCoverage } : {}),
        ...(Number.isFinite(supplied.score) && supplied.score >= 0 && supplied.score <= 100 ? { score: supplied.score } : {}),
        ...(Array.isArray(supplied.originalStoryIds) ? { originalStoryIds: supplied.originalStoryIds
            .filter(id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(id)).slice(0, 30) } : {}),
    } : null;
    // Explicit empties also clear a previous own-news policy when a live row
    // returns to its legacy source fallback under the same story ID.
    return { editorial, featuredEligible };
}

export function storyToItem(story) {
    const company = story.companies?.[0] ?? null;
    const companies = (story.companies ?? []).filter((item) => item?.symbol);
    const source = story.primarySource?.name ?? story.sources?.[0]?.name ?? "wire";
    const sourceRows = story.sources?.length ? story.sources : [story.primarySource];
    const sourceNames = [...new Set(
        sourceRows
            .map((item) => item?.name)
            .filter(Boolean),
    )];

    return {
        id: story.id,
        eventId: story.eventId ?? null,
        eventType: story.eventType ?? null,
        version: story.version ?? 1,
        ts: Date.parse(story.publishedAt),
        source,
        sourceKind: story.primarySource?.sourceKind ?? null,
        sourceNames,
        sourceCount: sourceNames.length,
        language: story.primarySource?.language ?? null,
        title: story.headline,
        company: company?.name ?? null,
        symbol: company?.symbol ?? null,
        companies,
        symbols: companies.map((item) => item.symbol),
        url: story.primarySource?.url ?? story.sources?.[0]?.url ?? null,
        regulatory: (story.tags ?? []).includes("REGULATORY") || OFFICIAL_SOURCES.has(source),
        labels: story.tags ?? [],
        importance: story.importance ?? null,
        summary: story.summary ?? null,
        aiSummary: newsSummary(story.aiSummary),
        sourceExcerpt: newsSourceExcerpt(story.primarySource),
        facts: story.facts ?? null,
        reaction: story.reaction ?? null,
        reactionV2: story.reactionV2,
        marketContext: story.marketContext ?? null,
        companyContext: story.companyContext,
        status: story.status,
        ...storyEditorialPolicy(story),
    };
}

// A company page must not display another member's price change simply
// because that company happened to be first in the wire payload.
export function storyToCompanyItem(story, symbol) {
    const item = storyToItem(story);
    const company = item.companies.find(company => company.symbol === symbol);
    if (!company) return item;
    return {
        ...item,
        company: company.name || company.symbol,
        symbol: company.symbol,
        readerCompany: company.symbol,
        relatedCompany: item.symbol !== company.symbol ? item.company || item.symbol : null,
    };
}
