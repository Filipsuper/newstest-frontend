import { safeSourceUrl } from './newsroom.js';

/** Optional reviewed report excerpts, not conclusions inferred from radar scores.
 * The public API does not deliver these yet; local fixtures exercise the UI.
 */
export function companyProfileInsights(profile, symbol) {
  const record = profile?.insights;
  if (profile?.symbol !== symbol || record?.symbol !== symbol
    || record?.status !== 'available' || record.kind !== 'report_excerpts'
    || !/^20\d{2}-(FY|Q[1-4])$/.test(record.fiscalPeriod)
    || record.verification?.method !== 'reviewed_report_excerpts') return null;
  const href = safeSourceUrl(record.source?.url);
  if (!href || !href.startsWith('https://') || new URL(href).username || new URL(href).password
    || !/^[a-f0-9]{64}$/.test(record.source?.pdfSha256)
    || typeof record.source?.title !== 'string' || !record.source.title.trim()) return null;
  const result = { fiscalPeriod: record.fiscalPeriod, source: record.source };
  for (const category of ['opportunities', 'risks']) {
    const rows = record[category];
    if (!Array.isArray(rows) || rows.length > 20) return null;
    if (rows.some(row => typeof row?.text !== 'string' || !row.text.trim() || row.text.length > 800
      || !Number.isInteger(row.pdfPage) || row.pdfPage < 1)) return null;
    result[category] = rows.map(row => ({ text: row.text.trim(), pdfPage: row.pdfPage,
      href: `${href.split('#')[0]}#page=${row.pdfPage}` }));
  }
  return result;
}
