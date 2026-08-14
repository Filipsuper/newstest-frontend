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
    [["INSIDER"], "text-secondary border-secondary/40"],
    [["ACQUISITION", "DISPOSAL", "DIVESTMENT", "M&A", "MA", "MERGER"], "text-primary border-primary/40"],
    [["EARNINGS", "GUIDANCE"], "text-emerald-400 border-emerald-400/40"],
    [["ORDER", "AGREEMENT", "PARTNERSHIP", "PRODUCT", "LISTING"], "text-sky-400 border-sky-400/40"],
    [["CAPITAL_RAISE", "RIGHTS_ISSUE", "BUYBACK", "DIVIDEND"], "text-violet-400 border-violet-400/40"],
    [["REGULATORY", "HALT", "LEGAL", "DELISTING", "OBSERVATION"], "text-rose-400 border-rose-400/40"],
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
    [["INSIDER"], "#fbbf24"],
    [["ACQUISITION", "DISPOSAL", "DIVESTMENT", "M&A", "MA", "MERGER"], "#668CF4"],
    [["EARNINGS", "GUIDANCE"], "#34d399"],
    [["ORDER", "AGREEMENT", "PARTNERSHIP", "PRODUCT", "LISTING"], "#38bdf8"],
    [["CAPITAL_RAISE", "RIGHTS_ISSUE", "BUYBACK", "DIVIDEND"], "#a78bfa"],
    [["REGULATORY", "HALT", "LEGAL", "DELISTING", "OBSERVATION"], "#fb7185"],
];

export const tagHex = (tags = []) => {
    for (const [group, hex] of CATEGORY_HEX) {
        if (tags.some((tag) => group.includes(tag))) return hex;
    }
    return "#9ca3af";
};
