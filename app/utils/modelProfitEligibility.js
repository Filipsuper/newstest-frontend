// Publication policy only. Never change stored forecasts or reported actuals.
const finite = value => typeof value === 'number' && Number.isFinite(value);
export const isModelProfitMetric = metric => ['ebit', 'ebitda', 'netIncome', 'eps'].includes(metric);

/** Four consecutive reported quarters, one currency and one profit definition.
 * Prefer operating income; use EBIT only when the entire four-quarter EBIT
 * series is available. Missing operating income must never be treated as zero.
 * @param {Array<Record<string, any>>} quarters
 * @param {string} currency
 */
export function modelProfitEligibility(quarters, currency) {
  const unavailable = () => ({ version: 1, status: 'insufficient_operating_history',
    reason: 'model_profit_operating_history_missing', basis: null,
    currency, fiscalPeriods: [], operatingResultR12: null });
  if (!Array.isArray(quarters) || quarters.length < 4 || !/^[A-Z]{3}$/.test(currency ?? '')) return unavailable();
  const ranked = quarters.map(q => {
    const match = /^(\d{4})-Q([1-4])$/.exec(String(q?.fiscalPeriod ?? `${q?.fiscalYear}-Q${q?.fiscalQuarter}`));
    return { row: q, period: match?.[0], rank: match ? +match[1] * 4 + +match[2] : NaN };
  });
  if (ranked.some(q => !finite(q.rank))) return unavailable();
  ranked.sort((a, b) => a.rank - b.rank);
  const recent = ranked.slice(-4);
  if (ranked.filter(q => q.rank >= recent[0].rank).length !== 4
    || recent.some((q, i) => (i > 0 && q.rank !== recent[i - 1].rank + 1)
      || q.row.estimate || ![undefined, null, 'actual'].includes(q.row.dataType)
      || ![undefined, null, 'reported'].includes(q.row.basis)
      || (q.row.estimateAdjusted && Object.keys(q.row.estimateAdjusted).length)
      || (q.row.currency ?? currency) !== currency
      || !['yahoo', 'issuer_report'].includes(q.row.source)
      || (q.row.frequency != null && q.row.frequency !== 'quarterly')
      || (q.row.fiscalYear != null && q.row.fiscalYear !== Math.floor((q.rank - 1) / 4))
      || (q.row.fiscalQuarter != null && q.row.fiscalQuarter !== (q.rank - 1) % 4 + 1))) return unavailable();
  const basis = recent.every(q => finite(q.row.operatingIncome)) ? 'operatingIncome'
    : recent.every(q => finite(q.row.ebit)) ? 'ebit' : null;
  if (!basis) return unavailable();
  const operatingResultR12 = recent.reduce((sum, q) => sum + q.row[basis], 0);
  if (!finite(operatingResultR12)) return unavailable();
  const loss = operatingResultR12 < 0;
  return { version: 1, status: loss ? 'withheld_operating_loss' : 'eligible',
    reason: loss ? 'model_profit_withheld_operating_loss' : null, basis, currency,
    fiscalPeriods: recent.map(q => q.period), operatingResultR12 };
}
