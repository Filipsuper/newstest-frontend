const INSIDER_TAG = "INSIDER";
const MATERIAL_INSIDER_VALUE = 25_000_000;
const EXCEPTIONAL_INSIDER_VALUE = 100_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const CONTEXT_TAGS = new Set([
    "CONTEXT",
    "RESEARCH",
    "RECOMMENDATION",
    "MEDIA",
    "MEDIA_REPORT",
]);

const finite = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

export const storyReaction = (item) => finite(item?.reaction?.pct);

export const normalizedSymbol = (value) => String(value ?? "").trim().toUpperCase();

export const storySymbols = (item) => {
    const symbols = item?.symbols?.length ? item.symbols : [item?.symbol];
    return symbols.map(normalizedSymbol).filter(Boolean);
};

const isInsiderStory = (item) => (item?.labels ?? []).includes(INSIDER_TAG);

export const insiderMateriality = (item) => {
    if (!isInsiderStory(item)) return null;
    const grossValue = finite(item?.facts?.grossValue) ?? 0;
    if (grossValue >= EXCEPTIONAL_INSIDER_VALUE) return "exceptional";
    if (grossValue >= MATERIAL_INSIDER_VALUE) return "material";
    return "routine";
};

export const impactScore = (item, { personalized = false, referenceTs = null } = {}) => {
    const importance = finite(item.importance) ?? 0;
    const reaction = Math.abs(storyReaction(item) ?? 0);
    const contextStory = (item.labels ?? []).some((label) => CONTEXT_TAGS.has(label));
    const publishedAt = finite(item.ts);
    const ageDays = publishedAt !== null && referenceTs !== null
        ? Math.max(referenceTs - publishedAt, 0) / DAY_MS
        : 0;
    const freshnessPenalty = Math.min(ageDays * 10, 32);
    const insiderLevel = insiderMateriality(item);
    // Daily movement alone is not evidence that an insider filing mattered.
    const reactionBoost = insiderLevel
        ? 0
        : contextStory
            ? Math.min(reaction * 2, 12)
            : Math.min(reaction * 8, 40);
    const insiderPenalty = insiderLevel === "exceptional"
        ? personalized ? 0 : 10
        : insiderLevel === "material"
            ? personalized ? 8 : 22
            : insiderLevel === "routine"
                ? personalized ? 18 : 45
                : 0;
    return importance + reactionBoost - insiderPenalty - freshnessPenalty;
};

export const rankNews = (items, options = {}) => {
    const timestamps = items.map((item) => finite(item.ts)).filter((value) => value !== null);
    const referenceTs = finite(options.referenceTs)
        ?? (timestamps.length ? Math.max(...timestamps) : null);
    const scoringOptions = { ...options, referenceTs };
    return [...items].sort((left, right) =>
        impactScore(right, scoringOptions) - impactScore(left, scoringOptions)
        || (finite(right.ts) ?? 0) - (finite(left.ts) ?? 0));
};

const stableValue = (value) => {
    if (Array.isArray(value)) return value.map(stableValue);
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.keys(value).sort().map((key) => [key, stableValue(value[key])]),
        );
    }
    return value;
};

const hasSpecificFacts = (facts) => {
    if (!facts || typeof facts !== "object") return false;
    return Object.entries(facts).some(([key, value]) => {
        if (key === "kind" && ["unclassified", "context"].includes(String(value).toLowerCase())) {
            return false;
        }
        if (value === null || value === undefined || value === "") return false;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === "object") return Object.keys(value).length > 0;
        return true;
    });
};

const eventClusterKey = (item) => {
    const companies = storySymbols(item).sort().join(",") || "market";
    if (hasSpecificFacts(item.facts)) {
        return `facts:${companies}:${item.eventType ?? "event"}:${JSON.stringify(stableValue(item.facts))}`;
    }
    if (item.eventId) return `event:${item.eventId}`;
    return `story:${item.id}`;
};

const storyPreference = (item) => (
    (item.language === "sv" ? 20 : 0)
    + (item.sourceKind === "issuer_release" ? 10 : 0)
    + (finite(item.importance) ?? 0)
    + Math.min(item.sourceCount ?? 0, 5)
);

const mergeClusteredStories = (left, right) => {
    const preferred = storyPreference(right) > storyPreference(left) ? right : left;
    const sourceNames = [...new Set([...(left.sourceNames ?? []), ...(right.sourceNames ?? [])])];
    return {
        ...preferred,
        sourceNames,
        sourceCount: sourceNames.length,
    };
};

export const uniqueNews = (items) => {
    const clustered = new Map();
    for (const item of items) {
        if (!item?.id) continue;
        const key = eventClusterKey(item);
        const existing = clustered.get(key);
        clustered.set(key, existing ? mergeClusteredStories(existing, item) : item);
    }
    return [...clustered.values()];
};

// The overview is an editorial digest, not the complete wire. Routine insider
// trades remain available in the full and personalized feeds. Only factually
// large transactions can enter the general market ranking.
export const curateMarketNews = (items) => {
    const seenInsiderSymbols = new Set();
    let supportingInsiders = 0;
    return rankNews(uniqueNews(items)).filter((item) => {
        const level = insiderMateriality(item);
        if (!level) return true;
        if (level === "routine") return false;
        const symbol = storySymbols(item)[0];
        if (symbol && seenInsiderSymbols.has(symbol)) return false;
        if (level === "material" && supportingInsiders >= 2) return false;
        if (symbol) seenInsiderSymbols.add(symbol);
        if (level === "material") supportingInsiders += 1;
        return true;
    });
};

