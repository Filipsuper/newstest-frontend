// Display contract only. The API qualifies and calculates the revenue beta;
// a company-page visit never creates, refreshes or modifies an estimate.
export const REVENUE_BETA_MODEL_VERSION = 'omxsum-revenue-beta-v1';
export const REVENUE_BETA_LABEL = 'OMXsum-estimat · Beta';
export const REVENUE_BETA_UNCERTAINTY = 'Preliminär omsättningsprognos. Utfallet kan avvika tydligt, särskilt vid engångsintäkter.';
export const REVENUE_BETA_METHOD = 'Omsättningsbetan använder medianen av de fyra senaste rapporterade kvartalen, med minst sju sammanhängande kvartal som underlag. Nyheter justerar ännu inte beloppet. Ett betaestimat är inte analytikerkonsensus eller en riktkurs; den framtida prognosprecisionen är ännu inte validerad.';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const fresh = (value, now, days) => {
  const timestamp = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(timestamp) && timestamp <= now + 300_000 && now - timestamp <= days * 86400_000;
};

/** Retirement is independent of beta availability. Turning the new model off,
 * or withholding it for one company, must not reactivate an older estimate.
 * Actual history and consensus are never subject to this publication policy. */
export function legacyModelPublicationHidden(policy, metric, frequency) {
  if (policy?.version !== 1) return false;
  return policy.legacyModels === 'hide_all'
    || (policy.legacyModels === 'hide_quarterly_revenue' && metric === 'revenue' && frequency === 'quarterly');
}

/** Defense against stale or mixed cached API responses. Only the separate
 * public revenue-beta array is read by callers. Never accept another metric,
 * annual period, manual estimate or a mismatched report revision as this beta. */
export function qualifiedRevenueBeta(model, { symbol, currency, quarters, period, now }) {
  if (!model || model.origin !== 'revenue_beta' || model.modelVersion !== REVENUE_BETA_MODEL_VERSION
    || model.releaseStage !== 'beta' || model.symbol !== symbol || model.currency !== currency
    || !/^[A-Z]{3}$/.test(currency ?? '') || model.basis !== 'reported' || model.locked !== false
    || model.method?.basis !== 'recent_four_median' || model.method?.newsAdjustmentApplied !== false
    || model.frequency !== 'quarterly' || period?.frequency !== 'quarterly' || model.fiscalYear !== period.year
    || model.fiscalQuarter !== (period.rank - 1) % 4 + 1 || !fresh(model.updatedAt, now, 30)
    || !model.metrics || Object.keys(model.metrics).length !== 1
    || !finite(model.metrics.revenue) || model.metrics.revenue <= 0
    || !Array.isArray(model.inputPeriods) || ![7, 8].includes(model.inputPeriods.length)
    || !Array.isArray(quarters) || quarters.length < model.inputPeriods.length) return false;
  const actuals = quarters.slice(-model.inputPeriods.length);
  const latest = actuals.at(-1);
  if (period.rank !== latest.period.rank + 1 || !fresh(latest.periodEnd, now, 180)) return false;
  return actuals.every((actual, index) => {
    const input = model.inputPeriods[index];
    return input && input.fiscalPeriod === actual.period.key
      && input.rank === actual.period.rank && input.currency === currency && actual.currency === currency
      && input.periodEnd === actual.periodEnd && (input.source ?? null) === (actual.source ?? null)
      && finite(input.revenue) && input.revenue > 0 && input.revenue === actual.revenue
      && !actual.estimate && [undefined, null, 'actual'].includes(actual.dataType)
      && [undefined, null, 'quarterly'].includes(actual.frequency)
      && (actual.fiscalYear == null || actual.fiscalYear === actual.period.year)
      && (actual.fiscalQuarter == null || actual.fiscalQuarter === (actual.period.rank - 1) % 4 + 1)
      && [undefined, null, 'reported'].includes(actual.basis)
      && !(actual.estimateAdjusted && Object.keys(actual.estimateAdjusted).length)
      && (index === 0 || actual.period.rank === actuals[index - 1].period.rank + 1);
  });
}
