import { safeSourceUrl } from './newsroom.js';

export const FINANCIAL_GROUPS = [
  { id: 'result', title: 'Resultat', keys: ['revenue', 'ebit'], labels: ['Omsättning', 'EBIT'] },
  { id: 'cash', title: 'Kassaflöde', keys: ['operatingCashFlow', 'freeCashFlow'], labels: ['Från driften', 'Fritt kassaflöde'] },
  { id: 'balance', title: 'Finansiell ställning', keys: ['cash', 'totalDebt', 'netDebt'], labels: ['Kassa', 'Räntebärande skuld', 'Nettoskuld enligt källa'] },
  { id: 'earningsCash', title: 'Vinst och kassaflöde', keys: ['netIncome', 'operatingCashFlow'], labels: ['Nettoresultat', 'Operativt kassaflöde'] },
];

export function availableFinancialGroups(periods) {
  return FINANCIAL_GROUPS.filter(group => periods.some(period => {
    const present = key => Number.isFinite(period[key]);
    // A comparison needs at least one real same-period pair, not unrelated
    // earnings and cash observations from different reporting periods.
    return group.id === 'earningsCash' ? group.keys.every(present) : group.keys.some(present);
  }));
}

export function financialSource(source) {
  return ({ issuer_report: 'Bolagsrapport', yahoo: 'Yahoo Finance', mixed: 'Bolagsrapporter och Yahoo Finance',
    'omxsum-derived': 'Beräknat av OMXsum' })[source] || 'Källa ej angiven';
}

export function researchPeriods(periods = [], currency, frequency, limit = 8) {
  // Do not mix estimates with actuals, or raw amounts in different currencies.
  return periods.filter(p => !p.estimate && p.dataType !== 'estimate'
    && (p.currency ?? currency) === currency
    && (!frequency || !p.frequency || p.frequency === frequency))
    .sort((a, b) => String(a.periodEnd ?? a.fiscalPeriod ?? a.fiscalYear ?? '').localeCompare(String(b.periodEnd ?? b.fiscalPeriod ?? b.fiscalYear ?? '')))
    .slice(-limit);
}

export function financialPeriodLabel(period) {
  if (!period) return 'Period saknas';
  const quarter = String(period.fiscalPeriod ?? '').match(/^(\d{4})-Q([1-4])$/);
  return quarter ? `Q${quarter[2]} ${quarter[1]}` : String(period.fiscalPeriod ?? period.fiscalYear ?? period.periodEnd ?? 'Period saknas');
}

function periodIdentity(period, frequency) {
  const quarter = String(period.fiscalPeriod ?? period.periodKey ?? '').match(/^(\d{4})-Q([1-4])$/);
  const year = Number(period.fiscalYear ?? quarter?.[1] ?? String(period.fiscalPeriod ?? '').match(/^(\d{4})(?:-A)?$/)?.[1]);
  if (!Number.isInteger(year) || year < 1900 || (frequency !== 'annual' && !quarter)) return null;
  return { year, quarter: frequency === 'annual' ? null : quarter[2] };
}

export function financialMargin(period, numerator = 'ebit') {
  if (!['ebit', 'netIncome'].includes(numerator) || period?.estimate || period?.dataType === 'estimate') return null;
  if (!Number.isFinite(period?.[numerator]) || !Number.isFinite(period?.revenue) || period.revenue <= 0) return null;
  const value = period[numerator] / period.revenue * 100;
  return Number.isFinite(value) ? value : null;
}

export function financialComparison(periods, frequency) {
  const latest = periods.at(-1);
  const identity = latest && periodIdentity(latest, frequency);
  const previous = identity && ['quarterly', 'annual'].includes(frequency) ? periods.find(period => {
    const candidate = periodIdentity(period, frequency);
    return candidate?.year === identity.year - 1 && candidate.quarter === identity.quarter
      && period.currency === latest.currency;
  }) : null;
  const change = key => {
    const current = key === 'freeCashFlow' ? cashFlowValue(latest) : latest?.[key];
    const prior = key === 'freeCashFlow' ? cashFlowValue(previous) : previous?.[key];
    return Number.isFinite(current) && Number.isFinite(prior) && prior > 0 ? (current / prior - 1) * 100 : null;
  };
  const currentMargin = financialMargin(latest), previousMargin = financialMargin(previous);
  const netMargin = financialMargin(latest, 'netIncome'), previousNetMargin = financialMargin(previous, 'netIncome');
  return {
    revenue: change('revenue'), ebit: change('ebit'), margin: currentMargin,
    freeCashFlow: change('freeCashFlow'),
    marginChange: currentMargin !== null && previousMargin !== null ? currentMargin - previousMargin : null,
    netMargin,
    netMarginChange: netMargin !== null && previousNetMargin !== null ? netMargin - previousNetMargin : null,
  };
}

// New ingestion distinguishes reported totals from legacy derived fallbacks.
// An explicitly absent reported value must not fall back to the derived one.
export function reportedFinancialValue(period, key) {
  if (period?.[`${key}IsCalculated`] === true) return null;
  const reportedKey = { netDebt: 'reportedNetDebt', freeCashFlow: 'reportedFreeCashFlow' }[key];
  const value = reportedKey && Object.hasOwn(period ?? {}, reportedKey) ? period[reportedKey] : period?.[key];
  return Number.isFinite(value) ? value : null;
}

export function cashFlowValue(period) {
  if (!period || period.estimate || period.dataType === 'estimate') return null;
  const calc = period.cashFlowCalculation;
  if (calc?.definition === 'operating_minus_capex'
    && [period.operatingCashFlow, period.capitalExpenditure, calc.freeCashFlow].every(Number.isFinite)
    && calc.operatingCashFlow === period.operatingCashFlow && calc.capitalExpenditure === -Math.abs(period.capitalExpenditure)
    && calc.freeCashFlow === period.operatingCashFlow - Math.abs(period.capitalExpenditure)) return calc.freeCashFlow;
  return Number.isFinite(period.freeCashFlow) ? period.freeCashFlow : null;
}

export function cashFlowBridge(period) {
  if (period?.estimate || period?.dataType === 'estimate') return { status: 'missing' };
  const { operatingCashFlow: operating, capitalExpenditure: capex } = period ?? {};
  const free = cashFlowValue(period);
  if (![operating, capex, free].every(Number.isFinite)) return { status: 'missing' };
  // The provider contract accepts capex as either a signed outflow or an
  // expenditure magnitude. Never infer capex as the difference between totals.
  const investments = Math.abs(capex);
  const expected = operating - investments;
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(operating), investments, Math.abs(free)) * 16;
  // Allow floating-point noise only, not an invented "other"/rounding step.
  if (Math.abs(expected - free) > tolerance) return { status: 'unreconciled' };
  return {
    status: 'available',
    steps: [
      { key: 'operating', label: 'Från driften', value: operating, range: [Math.min(0, operating), Math.max(0, operating)] },
      { key: 'investments', label: 'Investeringar', value: investments === 0 ? 0 : -investments, range: [Math.min(operating, free), Math.max(operating, free)] },
      { key: 'free', label: 'Fritt kassaflöde', value: free, range: [Math.min(0, free), Math.max(0, free)] },
    ],
  };
}

export function netDebtPosition(period) {
  const empty = { status: 'missing', netDebt: null, calculated: null, basis: null };
  if (!period || period.estimate || period.dataType === 'estimate') return empty;
  const supplied = Number.isFinite(period.netDebt) ? (period.netDebt === 0 ? 0 : period.netDebt) : null;
  const retained = { ...empty, netDebt: supplied, basis: supplied === null ? null : 'source' };
  const { totalDebt, cash } = period;
  if (![totalDebt, cash].every(Number.isFinite)) return retained;
  // These are balance-sheet stocks, not signed cash-flow entries. Never turn
  // negative/invalid debt or cash positive, infer a missing component or use
  // total liabilities as interest-bearing debt.
  if (totalDebt < 0 || cash < 0) return { ...retained, status: 'invalid' };
  const difference = totalDebt - cash;
  if (!Number.isFinite(difference)) return { ...retained, status: 'invalid' };
  const calculated = difference === 0 ? 0 : difference;
  const definition = period.netDebtCalculation;
  if (definition?.definition === 'debt_minus_cash' && definition.totalDebt === totalDebt
    && definition.cash === cash && definition.netDebt === difference) {
    return { status: 'available', netDebt: calculated, calculated, basis: 'calculated' };
  }
  const tolerance = Number.EPSILON * Math.max(1, totalDebt, cash, Math.abs(supplied ?? 0)) * 16;
  if (supplied !== null && Math.abs(calculated - supplied) > tolerance) {
    return { ...retained, status: 'unreconciled', calculated };
  }
  return { status: 'available', netDebt: supplied ?? calculated, calculated, basis: supplied === null ? 'calculated' : 'source' };
}

export function netDebtBridge(period) {
  const position = netDebtPosition(period);
  if (position.status !== 'available') return { status: position.status };
  const { totalDebt: debt, cash } = period;
  const net = position.calculated;
  return {
    status: 'available',
    steps: [
      { key: 'debt', label: 'Räntebärande skuld', value: debt, range: [0, debt] },
      { key: 'cash', label: 'Kassa', value: cash === 0 ? 0 : -cash, range: [net, debt] },
      { key: 'net', label: 'Nettoskuld', value: net, range: [Math.min(0, net), Math.max(0, net)] },
    ],
  };
}

export function financialScale(periods, currency) {
  const values = periods.flatMap(period => FINANCIAL_GROUPS.flatMap(group => group.keys.map(key => period[key]))).filter(Number.isFinite);
  const max = Math.max(0, ...values.map(Math.abs));
  const divisor = max >= 1e6 ? 1e6 : max >= 1e3 ? 1e3 : 1;
  return { divisor, label: `${divisor === 1e6 ? 'M' : divisor === 1e3 ? 'k' : ''}${currency || ' (valuta saknas)'}`.trim() };
}

export function managementAvailability(report) {
  return ({ pending: 'VD-ordet bearbetas.', processing: 'VD-ordet bearbetas.',
    no_section: 'Inget VD-ord har identifierats i den här rapporten.',
    needs_ocr: 'Rapportens text kunde inte läsas in.', failed: 'VD-ordet kunde inte hämtas.' })[report?.status]
    || 'Inget VD-ord finns tillgängligt ännu.';
}

export function managementSource(comment, report) {
  const href = safeSourceUrl(comment?.source?.url) || safeSourceUrl(comment?.source?.releaseUrl)
    || (!comment ? safeSourceUrl(report?.attachmentUrl) || safeSourceUrl(report?.releaseUrl) : null);
  // Never borrow the latest report's link for an older management comment.
  return href;
}
