import test from 'node:test';
import assert from 'node:assert/strict';
import { financialSource, researchPeriods, managementAvailability, managementSource, financialComparison, financialMargin, financialPeriodLabel, financialScale, cashFlowBridge, cashFlowValue, netDebtPosition, netDebtBridge, reportedFinancialValue, availableFinancialGroups } from '../app/utils/companyResearch.js';

test('reported source totals never borrow a derived fallback when explicitly missing', () => {
  assert.equal(reportedFinancialValue({ netDebt: 70, netDebtIsCalculated: true }, 'netDebt'), null);
  assert.equal(reportedFinancialValue({ freeCashFlow: 70, freeCashFlowIsCalculated: true, reportedFreeCashFlow: 80 }, 'freeCashFlow'), null);
  assert.equal(reportedFinancialValue({ netDebt: 70, reportedNetDebt: null }, 'netDebt'), null);
  assert.equal(reportedFinancialValue({ freeCashFlow: 70, reportedFreeCashFlow: null }, 'freeCashFlow'), null);
  assert.equal(reportedFinancialValue({ freeCashFlow: 70, reportedFreeCashFlow: 100 }, 'freeCashFlow'), 100);
  assert.equal(reportedFinancialValue({ netDebt: 70 }, 'netDebt'), 70);
  assert.equal(reportedFinancialValue({ revenue: 100 }, 'revenue'), 100);
});

test('explicit calculated net debt is separate from a differing provider total', () => {
  const period = { totalDebt: 120, cash: 50, netDebt: 80,
    netDebtCalculation: { definition: 'debt_minus_cash', totalDebt: 120, cash: 50, netDebt: 70 } };
  assert.deepEqual(netDebtPosition(period), { status: 'available', calculated: 70, netDebt: 70, basis: 'calculated' });
  assert.equal(netDebtBridge(period).steps.at(-1).value, 70);
  assert.equal(period.netDebt, 80);
  assert.equal(netDebtPosition({ ...period, totalDebt: 131 }).status, 'unreconciled');
  assert.equal(netDebtPosition({ ...period, cash: null }).status, 'missing');
});

test('named capex calculation keeps the provider value and validates every component', () => {
  const period = { operatingCashFlow: 100, capitalExpenditure: -30, freeCashFlow: 100,
    cashFlowCalculation: { definition: 'operating_minus_capex', operatingCashFlow: 100, capitalExpenditure: -30, freeCashFlow: 70 } };
  assert.equal(cashFlowValue(period), 70);
  assert.equal(cashFlowBridge(period).steps.at(-1).value, 70);
  assert.equal(period.freeCashFlow, 100);
  assert.equal(cashFlowBridge({ ...period, capitalExpenditure: null }).status, 'missing');
  assert.equal(cashFlowBridge({ ...period, operatingCashFlow: 110 }).status, 'unreconciled');
  assert.equal(cashFlowValue({ ...period, estimate: true }), null);
});

const hasEarningsCash = periods => availableFinancialGroups(periods).some(group => group.id === 'earningsCash');

test('earnings/cash comparison requires a finite pair in the same period', () => {
  assert.equal(hasEarningsCash([]), false);
  assert.equal(hasEarningsCash([{ netIncome: 5 }, { operatingCashFlow: 6 }]), false);
  assert.equal(hasEarningsCash([{ netIncome: 5, operatingCashFlow: 6 }]), true);
  for (const field of ['netIncome', 'operatingCashFlow']) for (const value of [null, undefined, NaN, Infinity, '5']) {
    assert.equal(hasEarningsCash([{ netIncome: 5, operatingCashFlow: 6, [field]: value }]), false);
  }
});

test('earnings/cash comparison retains zero, losses and negative cash flow without imputing gaps', () => {
  for (const netIncome of [-5, 0, 5]) for (const operatingCashFlow of [-6, 0, 6]) {
    assert.equal(hasEarningsCash([{ netIncome, operatingCashFlow }]), true);
  }
  assert.equal(hasEarningsCash([{ netIncome: 5, operatingCashFlow: 6 }, { netIncome: null, operatingCashFlow: 7 }]), true);
});

test('earnings/cash chart availability uses only selected actual periods and currency', () => {
  const pair = { netIncome: 5, operatingCashFlow: 6, currency: 'SEK', frequency: 'quarterly' };
  for (const excluded of [{ estimate: true }, { dataType: 'estimate' }, { currency: 'EUR' }, { frequency: 'annual' }]) {
    const periods = researchPeriods([{ ...pair, ...excluded }, { ...pair, operatingCashFlow: null }], 'SEK', 'quarterly');
    assert.equal(hasEarningsCash(periods), false);
  }
  assert.equal(hasEarningsCash(researchPeriods([pair], 'SEK', 'quarterly')), true);
});

test('financial scaling includes net income even without revenue or other statement values', () => {
  assert.deepEqual(financialScale([{ netIncome: -3_000_000, operatingCashFlow: 600 }], 'SEK'), { divisor: 1e6, label: 'MSEK' });
});

test('net-debt waterfall plots debt minus cash, preserving negative and zero totals', () => {
  for (const [debt, cash, net, ranges] of [
    [100, 40, 60, [[0, 100], [60, 100], [0, 60]]],
    [40, 100, -60, [[0, 40], [-60, 40], [-60, 0]]],
    [100, 100, 0, [[0, 100], [0, 100], [0, 0]]],
    [0, 0, 0, [[0, 0], [0, 0], [0, 0]]],
  ]) {
    const bridge = netDebtBridge({ totalDebt: debt, cash, netDebt: net });
    assert.equal(bridge.status, 'available');
    assert.deepEqual(bridge.steps.map(step => step.value), [debt, cash === 0 ? 0 : -cash, net]);
    assert.deepEqual(bridge.steps.map(step => step.range), ranges);
  }
});

test('net-debt waterfall is unavailable for incomplete, conflicting, invalid or estimated inputs', () => {
  for (const period of [undefined, { netDebt: 60 }, { totalDebt: 100, cash: 40, netDebt: 70 },
    { totalDebt: 100, cash: -40 }, { totalDebt: 100, cash: 40, estimate: true },
    { totalDebt: 100, cash: 40, dataType: 'estimate' }]) {
    const bridge = netDebtBridge(period);
    assert.notEqual(bridge.status, 'available');
    assert.equal(bridge.steps, undefined);
  }
});

test('net debt uses same-period debt less cash, with explicit source or calculated provenance', () => {
  assert.deepEqual(netDebtPosition({ totalDebt: 100, cash: 40 }), { status: 'available', netDebt: 60, calculated: 60, basis: 'calculated' });
  assert.deepEqual(netDebtPosition({ totalDebt: 100, cash: 40, netDebt: 60 }), { status: 'available', netDebt: 60, calculated: 60, basis: 'source' });
  assert.equal(netDebtPosition({ totalDebt: .3, cash: .1, netDebt: .2 }).status, 'available');
});

test('negative net debt means net cash; zero debt and cash are real observations', () => {
  assert.equal(netDebtPosition({ totalDebt: 40, cash: 100 }).netDebt, -60);
  for (const period of [{ totalDebt: 0, cash: 0 }, { totalDebt: 100, cash: 100, netDebt: -0 }]) {
    const position = netDebtPosition(period);
    assert.equal(position.status, 'available');
    assert.equal(Object.is(position.netDebt, -0), false);
    assert.equal(position.netDebt, 0);
  }
});

test('a conflicting source total is retained, not silently overwritten or charted as reconciled', () => {
  for (const netDebt of [61, 59.99, 0, -60]) {
    assert.deepEqual(netDebtPosition({ totalDebt: 100, cash: 40, netDebt }), { status: 'unreconciled', netDebt, calculated: 60, basis: 'source' });
  }
});

test('net debt does not fill missing inputs, use total liabilities, or accept signed cash-flow values', () => {
  for (const field of ['cash', 'totalDebt']) for (const value of [null, undefined, NaN, Infinity, '40']) {
    const position = netDebtPosition({ cash: 40, totalDebt: 100, [field]: value });
    assert.equal(position.status, 'missing');
    assert.equal(position.netDebt, null);
    assert.equal(position.calculated, null);
  }
  assert.deepEqual(netDebtPosition({ netDebt: 60 }), { status: 'missing', netDebt: 60, calculated: null, basis: 'source' });
  assert.equal(netDebtPosition({ totalLiabilities: 100, cash: 40 }).netDebt, null);
  for (const field of ['cash', 'totalDebt']) {
    const position = netDebtPosition({ cash: 40, totalDebt: 100, netDebt: 60, [field]: -1 });
    assert.equal(position.status, 'invalid');
    assert.equal(position.netDebt, 60);
    assert.equal(position.calculated, null);
  }
  assert.equal(netDebtPosition().netDebt, null);
});

test('net debt rejects estimates and retains a usable scale when only source net debt exists', () => {
  for (const estimate of [{ estimate: true }, { dataType: 'estimate' }]) {
    assert.equal(netDebtPosition({ totalDebt: 100, cash: 40, netDebt: 60, ...estimate }).netDebt, null);
  }
  assert.deepEqual(financialScale([{ netDebt: -2_000_000 }], 'EUR'), { divisor: 1e6, label: 'MEUR' });
});

test('margin series use the exact same-period numerator, not provider ratios or EBIT as net income', () => {
  const period = { revenue: 100, ebit: 20, netIncome: 8, ebitMarginPct: 99, netMarginPct: 99 };
  assert.equal(financialMargin(period), 20);
  assert.equal(financialMargin(period, 'netIncome'), 8);
  assert.equal(financialMargin({ ...period, netIncome: null }, 'netIncome'), null);
  assert.equal(financialMargin({ ...period, ebit: null }, 'netIncome'), 8);
  for (const invalid of [null, undefined, NaN, Infinity, '8']) {
    assert.equal(financialMargin({ ...period, netIncome: invalid }, 'netIncome'), null);
    assert.equal(financialMargin({ ...period, revenue: invalid }, 'netIncome'), null);
  }
  for (const revenue of [0, -1]) assert.equal(financialMargin({ ...period, revenue }, 'netIncome'), null);
  assert.equal(financialMargin({ ...period, netIncome: -8 }, 'netIncome'), -8);
  assert.equal(financialMargin({ ...period, netIncome: 0 }, 'netIncome'), 0);
  assert.equal(financialMargin({ ...period, estimate: true }), null);
  assert.equal(financialMargin({ ...period, dataType: 'estimate' }), null);
  assert.equal(financialMargin(period, 'cash'), null);
  assert.equal(financialMargin(), null);
});

test('net margin changes are percentage points against the matching fiscal period and currency', () => {
  const periods = [{ fiscalPeriod: '2025-Q2', currency: 'SEK', revenue: 100, netIncome: 8 },
    { fiscalPeriod: '2026-Q2', currency: 'SEK', revenue: 120, netIncome: 12 }];
  const result = financialComparison(periods, 'quarterly');
  assert.equal(result.netMargin, 10);
  assert.equal(result.netMarginChange, 2);
  assert.equal(result.margin, null);
  assert.equal(financialComparison([{ ...periods[0], currency: 'EUR' }, periods[1]], 'quarterly').netMarginChange, null);
  assert.equal(financialComparison([{ ...periods[0], fiscalPeriod: '2025-Q1' }, periods[1]], 'quarterly').netMarginChange, null);
  assert.equal(financialComparison([{ ...periods[0], netIncome: null }, periods[1]], 'quarterly').netMarginChange, null);
});

test('cash-flow bridge reconciles both provider capex sign conventions without inventing deductions', () => {
  for (const capex of [148, -148]) {
    const bridge = cashFlowBridge({ operatingCashFlow: 390, capitalExpenditure: capex, freeCashFlow: 242 });
    assert.equal(bridge.status, 'available');
    assert.deepEqual(bridge.steps.map(step => step.value), [390, -148, 242]);
    assert.deepEqual(bridge.steps.map(step => step.range), [[0, 390], [242, 390], [0, 242]]);
  }
  assert.equal(cashFlowBridge({ operatingCashFlow: .3, capitalExpenditure: .1, freeCashFlow: .2 }).status, 'available');
});

test('cash-flow bridge never backfills missing fields, estimates or unreconciled free cash flow', () => {
  const period = { operatingCashFlow: 390, capitalExpenditure: -148, freeCashFlow: 242 };
  for (const key of Object.keys(period)) for (const value of [null, undefined, NaN, Infinity, '242']) {
    assert.equal(cashFlowBridge({ ...period, [key]: value }).status, 'missing');
  }
  assert.equal(cashFlowBridge({ ...period, estimate: true }).status, 'missing');
  assert.equal(cashFlowBridge({ ...period, dataType: 'estimate' }).status, 'missing');
  assert.equal(cashFlowBridge({ ...period, freeCashFlow: 241.9 }).status, 'unreconciled');
  assert.equal(cashFlowBridge({ ...period, freeCashFlow: 538 }).status, 'unreconciled');
  assert.equal(cashFlowBridge().status, 'missing');
});

test('cash-flow bridge preserves negative operating/free cash flow and real zero values', () => {
  for (const [operating, capex, free, ranges] of [
    [100, 150, -50, [[0, 100], [-50, 100], [-50, 0]]],
    [-100, 50, -150, [[-100, 0], [-150, -100], [-150, 0]]],
    [100, 100, 0, [[0, 100], [0, 100], [0, 0]]],
    [0, 0, 0, [[0, 0], [0, 0], [0, 0]]],
  ]) {
    const bridge = cashFlowBridge({ operatingCashFlow: operating, capitalExpenditure: capex, freeCashFlow: free });
    assert.equal(bridge.status, 'available');
    assert.deepEqual(bridge.steps.map(step => step.range), ranges);
    if (capex === 0) assert.equal(Object.is(bridge.steps[1].value, -0), false);
  }
});

test('free-cash-flow growth uses the shared comparable fiscal period', () => {
  const previous = { fiscalPeriod: '2025-Q2', freeCashFlow: 200 };
  const latest = { fiscalPeriod: '2026-Q2', freeCashFlow: 250 };
  assert.equal(financialComparison([previous, latest], 'quarterly').freeCashFlow, 25);
  assert.equal(financialComparison([{ ...previous, freeCashFlow: -200 }, latest], 'quarterly').freeCashFlow, null);
  assert.equal(financialComparison([{ ...previous, fiscalPeriod: '2025-Q3' }, latest], 'quarterly').freeCashFlow, null);
});

test('quarterly comparison uses the same fiscal quarter, never adjacent rows', () => {
  const periods = [
    { fiscalPeriod: '2025-Q2', currency: 'SEK', revenue: 100, ebit: 10 },
    { fiscalPeriod: '2026-Q1', currency: 'SEK', revenue: 500, ebit: 90 },
    { fiscalPeriod: '2026-Q2', currency: 'SEK', revenue: 120, ebit: 18 },
  ];
  const result = financialComparison(periods, 'quarterly');
  assert.ok(Math.abs(result.revenue - 20) < 1e-8);
  assert.equal(result.ebit, 80);
  assert.equal(result.margin, 15);
  assert.equal(result.marginChange, 5);
  assert.equal(financialComparison(periods.slice(1), 'quarterly').revenue, null);
});

test('annual comparisons require the previous year and matching currency', () => {
  const periods = [{ fiscalYear: 2024, revenue: 100, ebit: 10, currency: 'SEK' }, { fiscalYear: 2025, revenue: 150, ebit: 30, currency: 'SEK' }];
  assert.equal(financialComparison(periods, 'annual').revenue, 50);
  assert.equal(financialComparison(periods, 'annual').marginChange, 10);
  assert.equal(financialComparison([{ ...periods[0], fiscalYear: 2023 }, periods[1]], 'annual').revenue, null);
  assert.equal(financialComparison([{ ...periods[0], currency: 'EUR' }, periods[1]], 'annual').revenue, null);
  assert.equal(financialComparison(periods, 'ttm').revenue, null);
});

test('zero, losses and missing baselines never produce misleading growth ratios', () => {
  const prior = { fiscalYear: 2024, revenue: 100, ebit: 10 };
  const latest = { fiscalYear: 2025, revenue: 120, ebit: null };
  assert.equal(financialComparison([prior, latest], 'annual').ebit, null);
  assert.equal(financialComparison([prior, latest], 'annual').margin, null);
  for (const ebit of [0, -10, null, undefined]) {
    assert.equal(financialComparison([{ ...prior, ebit }, { ...latest, ebit: 8 }], 'annual').ebit, null);
  }
  assert.equal(financialComparison([prior, { ...latest, ebit: 0 }], 'annual').ebit, -100);
  assert.equal(financialComparison([prior, { ...latest, revenue: 0, ebit: 1 }], 'annual').margin, null);
  assert.equal(financialComparison([], 'quarterly').margin, null);
});

test('history separates frequencies, sorts without mutating, and retains full table history', () => {
  const periods = Array.from({ length: 12 }, (_, i) => ({ fiscalYear: 2010 + i, frequency: 'annual', currency: 'SEK', revenue: i }));
  const reverse = [...periods].reverse();
  assert.deepEqual(researchPeriods(reverse, 'SEK', 'annual'), periods.slice(-8));
  assert.deepEqual(researchPeriods(reverse, 'SEK', 'annual', Infinity), periods);
  assert.equal(reverse[0].fiscalYear, 2021);
  assert.deepEqual(researchPeriods([...periods, { frequency: 'ttm', revenue: 999 }], 'SEK', 'quarterly'), []);
  assert.equal(financialPeriodLabel({ fiscalPeriod: '2026-Q2' }), 'Q2 2026');
  assert.equal(financialPeriodLabel({ fiscalYear: 2025 }), '2025');
  assert.deepEqual(financialScale([{ revenue: 2_450_000_000, ebit: null }], 'SEK'), { divisor: 1e6, label: 'MSEK' });
  assert.deepEqual(financialScale([{ revenue: 0 }], 'EUR'), { divisor: 1, label: 'EUR' });
});

test('financial overview separates currencies and estimates without inventing values', () => {
  const periods = [{ revenue: 0 }, { revenue: null }, { revenue: 12, currency: 'EUR' }, { revenue: 99, estimate: true }, { revenue: 66, dataType: 'estimate' }];
  assert.deepEqual(researchPeriods(periods, 'SEK'), periods.slice(0, 2));
  assert.equal(financialSource('yahoo'), 'Yahoo Finance');
  assert.equal(financialSource('issuer_report'), 'Bolagsrapport');
  assert.equal(financialSource(undefined), 'Källa ej angiven');
});

test('management extraction distinguishes processing, failure and missing section', () => {
  assert.match(managementAvailability({ status: 'pending' }), /bearbetas/);
  assert.match(managementAvailability({ status: 'failed' }), /kunde inte/);
  assert.match(managementAvailability({ status: 'no_section' }), /identifierats/);
  assert.notEqual(managementAvailability(), managementAvailability({ status: 'failed' }));
});

test('source links are safe and never borrowed from a different management report', () => {
  assert.equal(managementSource({ source: { url: 'javascript:alert(1)', releaseUrl: 'https://example.test/release' } }), 'https://example.test/release');
  assert.equal(managementSource({ text: 'Old text' }, { attachmentUrl: 'https://example.test/new.pdf' }), null);
  assert.equal(managementSource(null, { attachmentUrl: 'https://example.test/new.pdf' }), 'https://example.test/new.pdf');
});
