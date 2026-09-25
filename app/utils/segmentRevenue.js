import { safeSourceUrl } from './newsroom.js';

const companySymbol = value => typeof value === 'string' && /^[A-Z0-9.\-]{1,20}$/i.test(value.trim()) ? value.trim().toUpperCase() : null;

/** The stock page only accepts its own qualified API record. Share-class aliases
 * require upstream issuer mapping; never guess them or import preview snapshots.
 * This annual card keeps its own currency/period, independently of the charts.
 */
export function segmentRevenueForCompany(financials, symbol) {
  return breakdownForCompany(financials, symbol, 'segmentRevenue', segmentRevenueView);
}

export function geographicRevenueForCompany(financials, symbol) {
  return breakdownForCompany(financials, symbol, 'geographicRevenue', geographicRevenueView);
}

function breakdownForCompany(financials, symbol, field, validate) {
  const expected = companySymbol(symbol);
  if (!expected || !financials || (financials.symbol !== undefined && companySymbol(financials.symbol) !== expected)
    || companySymbol(financials[field]?.symbol) !== expected) return null;
  return validate(financials[field]) ? financials[field] : null;
}

/** Defensive display adapter for the source-verified annual pilot contract.
 * Never trust precomputed percentages or normalize an incomplete sum to 100%.
 */
export function segmentRevenueView(record) {
  if (record?.dimension !== 'business_area') return null;
  return revenueBreakdownView(record, ['segment', 'corporate'], ['segment', 'corporate', 'eliminations', 'group']);
}

/** Geography is a separate optional contract, not inferred from issuer domicile,
 * operating segments or assets. Preserve the report's country/region granularity.
 */
export function geographicRevenueView(record) {
  if (!['country', 'region'].includes(record?.dimension) || record.geographicBasis !== 'customer_location'
    || typeof record.geographicBasisEvidence?.text !== 'string' || !record.geographicBasisEvidence.text.trim()
    || record.geographicBasisEvidence.pdfPage !== record.source?.pdfPage) return null;
  return revenueBreakdownView(record, ['geography'], ['geography', 'group']);
}

function revenueBreakdownView(record, componentRoles, allowedRoles) {
  if (!record || record.schemaVersion !== 1 || record.status !== 'available'
    || record.basis !== 'external_customer_revenue'
    || record.frequency !== 'annual' || !/^20\d{2}-FY$/.test(record.fiscalPeriod)
    || record.periodEnd !== `${record.fiscalPeriod.slice(0, 4)}-12-31`
    || !/^[A-Z]{3}$/.test(record.currency) || !record.symbol
    || ![1, 1000, 1e6].includes(record.unitMultiplier)
    || record.verification?.method !== 'reviewed_pdf_layout') return null;
  const source = record.source;
  const href = safeSourceUrl(source?.url);
  if (!href || !href.startsWith('https://') || new URL(href).username || new URL(href).password
    || !/^[a-f0-9]{64}$/.test(source.pdfSha256)
    || !Number.isInteger(source.pdfPage) || source.pdfPage < 1) return null;
  const rows = record.rows;
  if (!Array.isArray(rows) || rows.length < 2 || rows.length > 30
    || new Set(rows.map(row => row?.label)).size !== rows.length) return null;
  for (const row of rows) {
    if (!row || typeof row.label !== 'string' || !row.label.trim()
      || !allowedRoles.includes(row.role)) return null;
    const raw = row.evidence?.cellText;
    if (typeof raw !== 'string' || row.evidence.pdfPage !== source.pdfPage) return null;
    const normalized = raw.normalize('NFKC').trim().replace(/[−–]/g, '-');
    if (row.revenue === null) {
      if (!['corporate', 'eliminations'].includes(row.role) || normalized !== '-') return null;
    } else {
      if (!Number.isFinite(row.revenue) || row.revenue < 0 || (row.role === 'eliminations' && row.revenue !== 0)
        || !/^-?(?:\d+|\d{1,3}(?:[ ,]\d{3})+)$/.test(normalized)
        || Number(normalized.replace(/[ ,]/g, '')) * record.unitMultiplier !== row.revenue) return null;
    }
  }
  const groups = rows.filter(row => row.role === 'group');
  if (groups.length !== 1 || !(groups[0].revenue > 0)) return null;
  const total = groups[0].revenue;
  const components = rows.filter(row => componentRoles.includes(row.role) && row.revenue !== null);
  if (!components.some(row => row.role === componentRoles[0]) || components.some(row => row.revenue > total)) return null;
  const difference = components.reduce((sum, row) => sum + row.revenue, 0) - total;
  const tolerance = (components.length + 1) * record.unitMultiplier / 2;
  if (Math.abs(difference) > tolerance) return null;
  return { ...record, href: `${href.split('#')[0]}#page=${source.pdfPage}`, total, difference,
    segments: components.map(row => ({ ...row, sharePct: row.revenue / total * 100 })) };
}
