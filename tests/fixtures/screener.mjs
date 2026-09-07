// Fictional, browser-only comparison data. No live stock or account writes.
export const screenerRows = [
  { symbol: "NORD.TEST", nativeSymbol: "NORD", name: "Norden Industri", segment: "LARGE_CAP", sector: "Industri", price: 124.5, changePct: 4.2,
    fundamentals: { marketCap: 300, revenueGrowthPct: 18, ebitMarginPct: 16, roePct: 12, pe: 12, evEbit: 10 }, metrics: { rvolAtTime: 2.5, return15mPct: 0.8 } },
  { symbol: "SKAR.TEST", nativeSymbol: "SKAR", name: "Skärgården Teknik", segment: "MID_CAP", sector: "Teknik", price: 87.1, changePct: -2.3,
    fundamentals: { marketCap: 100, revenueGrowthPct: 5, ebitMarginPct: 9, roePct: 8, pe: 8, evEbit: 7 }, metrics: { rvolAtTime: 1.9, return15mPct: -0.2 } },
  { symbol: "FJALL.TEST", nativeSymbol: "FJALL", name: "Fjäll Energi", segment: "SMALL_CAP", sector: "Energi", price: 42.3, changePct: 0,
    fundamentals: { marketCap: 30, revenueGrowthPct: -8, ebitMarginPct: 0, roePct: -3, pe: 21, evEbit: 16 }, metrics: { rvolAtTime: 0.8, return15mPct: 0 } },
  ...Array.from({ length: 60 }, (_, index) => ({ symbol: `OTHER-${index}.TEST`, nativeSymbol: `OTHER${index}`, name: `Övrigt Testbolag ${String(index + 1).padStart(2, "0")}`,
    segment: "FIRST_NORTH", sector: "Teknik", price: null, changePct: null, fundamentals: { marketCap: 1 }, metrics: {} })),
];
export const screenerResponse = { items: screenerRows, meta: { financialCoverage: 3, dataAsOf: "2026-09-07T09:05:00Z" } };
export const profileResponse = symbols => ({ items: symbols.filter(symbol => ["NORD.TEST", "SKAR.TEST", "FJALL.TEST"].includes(symbol)).map(symbol => ({
  symbol, axes: ["value", "growth", "past", "health", "insiders", "dividend"].map((key, index) => ({ key, score: symbol === "NORD.TEST" ? 4 : symbol === "SKAR.TEST" ? 2.5 : index === 3 ? 3 : index === 0 ? null : 0 })),
})), missing: symbols.filter(symbol => symbol.startsWith("OTHER")) });
