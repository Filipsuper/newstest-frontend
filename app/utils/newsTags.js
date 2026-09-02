// Wire tags -> reader-friendly Swedish labels
const TAG_LABELS = {
    "M&A": "M&A",
    MA: "M&A",
    M_AND_A: "M&A",
    ACQUISITION: "Förvärv",
    DISPOSAL: "Försäljning",
    DIVESTMENT: "Avyttring",
    MERGER: "Fusion",
    EARNINGS: "Rapport",
    ORDER: "Order",
    INSIDER: "Insynshandel",
    BUYBACK: "Återköp",
    DIVIDEND: "Utdelning",
    GUIDANCE: "Prognos",
    CAPITAL_RAISE: "Emission",
    RIGHTS_ISSUE: "Företrädesemission",
    REGULATORY: "Regulatoriskt",
    HALT: "Handelsstopp",
    RESUMPTION: "Handel återupptagen",
    LISTING: "Notering",
    DELISTING: "Avnotering",
    MANAGEMENT: "Ledning",
    PERSONNEL: "Ledning",
    AGREEMENT: "Avtal",
    PARTNERSHIP: "Samarbete",
    PRODUCT: "Produkt",
    LEGAL: "Juridik",
    MACRO: "Makro",
    RATES: "Räntor",
    MONETARY_POLICY: "Penningpolitik",
    OBSERVATION: "Observationslista",
};

export const tagLabel = (tag = "") =>
    TAG_LABELS[tag] ??
    tag.charAt(0) + tag.slice(1).toLowerCase().replaceAll("_", " ");

// Tag category -> chip colors
const TAG_COLORS = [
    [["INSIDER"], "news-tag--amber"],
    [["ACQUISITION", "DISPOSAL", "DIVESTMENT", "M&A", "MA", "MERGER"], "news-tag--blue"],
    [["EARNINGS", "GUIDANCE"], "news-tag--neutral"],
    [["ORDER", "AGREEMENT", "PARTNERSHIP", "PRODUCT", "LISTING"], "news-tag--blue"],
    [["CAPITAL_RAISE", "RIGHTS_ISSUE", "BUYBACK", "DIVIDEND"], "news-tag--amber"],
    [["REGULATORY", "HALT", "LEGAL", "DELISTING", "OBSERVATION"], "news-tag--negative"],
];

export const tagColor = (tag = "") => {
    for (const [tags, className] of TAG_COLORS) {
        if (tags.includes(tag)) return className;
    }
    return "text-text-muted border-border";
};

// Same categories as hex values, for SVG chart markers. First matching
// category (in priority order) decides the dot color.
const CATEGORY_HEX = [
    [["INSIDER"], "var(--color-secondary)"],
    [["ACQUISITION", "DISPOSAL", "DIVESTMENT", "M&A", "MA", "MERGER"], "var(--color-primary)"],
    [["EARNINGS", "GUIDANCE"], "var(--color-text-muted)"],
    [["ORDER", "AGREEMENT", "PARTNERSHIP", "PRODUCT", "LISTING"], "var(--color-primary)"],
    [["CAPITAL_RAISE", "RIGHTS_ISSUE", "BUYBACK", "DIVIDEND"], "var(--color-secondary)"],
    [["REGULATORY", "HALT", "LEGAL", "DELISTING", "OBSERVATION"], "var(--market-negative)"],
];

export const tagHex = (tags = []) => {
    for (const [group, hex] of CATEGORY_HEX) {
        if (tags.some((tag) => group.includes(tag))) return hex;
    }
    return "var(--color-text-muted)";
};
