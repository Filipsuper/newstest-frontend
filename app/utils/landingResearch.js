// Dated, public marketing sample. Never use this snapshot as a fallback in
// company research or imply that its figures update while the page is open.
// GET verified 2026-10-06, without authentication:
// https://omxsum.com/api/feed/company/ATCO-A.ST/financial-preview
// The API returned preview:true, status:available, currency:SEK and source:yahoo
// for all four annual observations. Amounts below retain the exact SEK values.
export const LANDING_RESEARCH_EXAMPLE = {
  symbol: 'ATCO-A.ST',
  name: 'Atlas Copco A',
  capturedAt: '2026-10-06',
  source: 'Yahoo Finance',
  sourceUrl: 'https://omxsum.com/api/feed/company/ATCO-A.ST/financial-preview',
  currency: 'SEK',
  annual: [
    { periodEnd: '2022-12-31', revenue: 141325000000, ebit: 30483000000 },
    { periodEnd: '2023-12-31', revenue: 172664000000, ebit: 37356000000 },
    { periodEnd: '2024-12-31', revenue: 176771000000, ebit: 38718000000 },
    { periodEnd: '2025-12-31', revenue: 168343000000, ebit: 34553000000 },
  ],
};
