// Wire tags -> reader-friendly Swedish labels
const TAG_LABELS = {
    "M&A": "M&A",
    MA: "M&A",
    ACQUISITION: "Förvärv",
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
