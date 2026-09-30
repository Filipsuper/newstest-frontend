import test from 'node:test';
import assert from 'node:assert/strict';
import { modelProfitEligibility, isModelProfitMetric } from '../app/utils/modelProfitEligibility.js';
function quarters() {
  return Array.from({ length: 7 }, (_, i) => {
    const rank = 2024 * 4 + 4 + i, year = Math.floor((rank - 1) / 4), quarter = (rank - 1) % 4 + 1;
    return { fiscalPeriod: `${year}-Q${quarter}`, fiscalYear: year, fiscalQuarter: quarter,
      frequency: 'quarterly', currency: 'SEK', source: 'yahoo', dataType: 'actual', basis: 'reported',
      operatingIncome: 10, ebit: 20 };
  });
}
test('four-quarter operating loss withholds profit metrics, not revenue', () => {
  const q = quarters(); q.at(-1).operatingIncome = -40;
  const before = structuredClone(q), out = modelProfitEligibility(q, 'SEK');
  assert.equal(out.status, 'withheld_operating_loss');
  assert.equal(out.basis, 'operatingIncome'); assert.equal(out.operatingResultR12, -10);
  assert.equal(out.reason, 'model_profit_withheld_operating_loss');
  assert.deepEqual(out.fiscalPeriods, q.slice(-4).map(q => q.fiscalPeriod));
  for (const metric of ['ebit', 'ebitda', 'netIncome', 'eps']) assert.ok(isModelProfitMetric(metric));
  assert.equal(isModelProfitMetric('revenue'), false); assert.deepEqual(q, before);
});
test('an isolated loss quarter does not withhold a profitable R12; zero is valid', () => {
  const q = quarters(); q.at(-1).operatingIncome = -20;
  assert.equal(modelProfitEligibility(q, 'SEK').status, 'eligible');
  q.at(-1).operatingIncome = -30;
  assert.equal(modelProfitEligibility(q, 'SEK').operatingResultR12, 0);
  assert.equal(modelProfitEligibility(q, 'SEK').status, 'eligible');
});
test('operating income wins over contrary EBIT; fallback uses the entire EBIT series', () => {
  const q = quarters(); q.forEach(q => { q.operatingIncome = -10; q.ebit = 20; });
  assert.equal(modelProfitEligibility(q, 'SEK').status, 'withheld_operating_loss');
  delete q.at(-1).operatingIncome;
  const out = modelProfitEligibility(q, 'SEK');
  assert.equal(out.status, 'eligible'); assert.equal(out.basis, 'ebit');
  assert.equal(out.operatingResultR12, 80);
});
test('missing series cannot be mixed or replaced with net income, EPS or annual profit', () => {
  const q = quarters(); delete q.at(-1).operatingIncome; delete q.at(-2).ebit;
  q.forEach(q => { q.netIncome = 100; q.basicEps = 5; });
  const out = modelProfitEligibility(q, 'SEK');
  assert.equal(out.status, 'insufficient_operating_history');
  assert.equal(out.operatingResultR12, null); assert.equal(out.basis, null);
});
test('gaps, boundary duplicates, adjusted/estimated rows and mixed currency fail closed', () => {
  for (const mutate of [q => q.splice(-2, 1), q => q.push({ ...q.at(-4) }),
    q => q.at(-1).dataType = 'estimate', q => q.at(-1).estimate = true,
    q => q.at(-1).basis = 'adjusted', q => q.at(-1).estimateAdjusted = { ebit: 20 },
    q => q.at(-1).currency = 'EUR', q => q.at(-1).source = 'unknown',
    q => q.at(-1).frequency = 'annual', q => q.at(-1).fiscalQuarter = 4,
    q => q.at(-1).fiscalPeriod = 'bad']) {
    const q = quarters(); mutate(q);
    assert.equal(modelProfitEligibility(q, 'SEK').status, 'insufficient_operating_history');
  }
  assert.equal(modelProfitEligibility(quarters(), null).status, 'insufficient_operating_history');
  assert.equal(modelProfitEligibility(quarters().slice(-3), 'SEK').status, 'insufficient_operating_history');
});
test('input order is irrelevant and no rows or unknown values are rewritten', () => {
  const q = quarters().reverse(), before = structuredClone(q);
  assert.equal(modelProfitEligibility(q, 'SEK').operatingResultR12, 40);
  assert.deepEqual(q, before);
  q.at(0).operatingIncome = Infinity; q.at(0).ebit = NaN;
  assert.equal(modelProfitEligibility(q, 'SEK').status, 'insufficient_operating_history');
});
