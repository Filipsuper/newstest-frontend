import { finite, valuationActuals, valuationForecasts, valuationPeriod } from './companyValuation.js';
import { legacyModelPublicationHidden, REVENUE_BETA_UNCERTAINTY } from './revenueBeta.js';
import { modelProfitEligibility, isModelProfitMetric } from './modelProfitEligibility.js';
import { estimateChartModel, chartModel } from './chartPresentation.js';

export const STORY_ESTIMATE_VERSION = 'stories-estimate-context-v1';
export const STORY_ESTIMATE_REASONS = {
  snapshot_missing: 'Inget fryst estimatunderlag har kopplats till den här artikelversionen.',
  sidecar_invalid: 'Estimatfilen är ogiltig eller gäller en annan snapshot/artikelversion. Inga estimat från den används.',
  unavailable: 'Underlaget kunde inte hämtas. Ett källfel räknas inte som avsaknad av konsensus.',
  locked: 'Underlaget är låst och får inte användas.',
  invalid_input: 'Snapshotens format eller tidsstämpel är ogiltig.',
  wrong_company: 'Underlaget gäller ett annat bolag.',
  no_article_anchor: 'Artikeln saknar ett rapporterat, periodbestämt värde för måttet.',
  currency: 'Valutan matchar inte artikelns rapporterade värde.',
  financial_revision: 'Värde, period eller rapportversion matchar inte artikelns underlag.',
  ambiguous_history: 'Det finns flera rapportvärden för samma period; ingen serie väljs i tysthet.',
  invalid_history: 'Historiken är justerad, saknar säker period eller är inte rapporterat utfall.',
  different_frequency: 'Estimatet gäller en annan periodtyp än artikelns rapporterade underlag.',
  period: 'Estimatet gäller inte en kvalificerad kommande räkenskapsperiod.',
  stale: 'Konsensus är äldre än 90 dagar eller modellen äldre än 30 dagar.',
  future: 'Estimatet är daterat efter den frysta snapshoten.',
  metric_missing: 'Ett entydigt numeriskt värde för måttet saknas.',
  adjusted: 'Justerat resultat eller en annan resultatdefinition får inte blandas med rapporterat utfall.',
  scope: 'Segmentdata får inte blandas med koncernens siffror.',
  conflicting_consensus: 'Samma konsensusperiod och datum innehåller motstridiga värden.',
  manual: 'Manuella eller interna terminalestimat är inte kvalificerade för Stories.',
  retired: 'Den här modellen är avstängd av den befintliga publiceringspolicyn.',
  profit_withheld: 'Resultatmodellen hålls tillbaka vid rörelseförlust eller otillräcklig resultathistorik.',
  needs_review: 'Modellmåttet har granskningsflaggor eller saknar kvalificerat modellkontrakt.',
  model_inputs: 'Modellens ingående rapportperioder matchar inte den frysta rapporthistoriken.',
  share_basis: 'EPS-estimatet använder en annan aktiebas än artikelns rapporterade EPS.',
  selected_consensus: 'Kvalificerat konsensus väljs före OMXsum-estimat för samma mått och period.',
  selected_model: 'Kvalificerat OMXsum-estimat används när jämförbart konsensus saknas.',
  consensus_precedence: 'Ett kvalificerat konsensusvärde finns för samma mått och period.',
  superseded: 'En annan kvalificerad snapshot har valts enligt estimatvyns befintliga urval.',
  outside_chart: 'Kvalificerat men utanför grafens två kommande perioder.',
};
const metrics = [
  { key: 'revenue', title: 'Omsättning', measures: ['revenue', 'report.revenue'], unit: 'money' },
  { key: 'ebit', title: 'EBIT', measures: ['ebit', 'report.ebit'], unit: 'money' },
  { key: 'eps', title: 'Vinst per aktie', measures: ['basicEps', 'eps_basic', 'report.eps_basic', 'dilutedEps', 'eps_diluted', 'report.eps_diluted'], unit: 'money_per_share' },
];
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const day = value => date(value) && /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(value).toISOString().slice(0, 10) === value;
const collection = value => Array.isArray(value) && value.length <= 100 && value.every(row => row && typeof row === 'object' && !Array.isArray(row));
const fieldFor = (metric, epsBasis) => metric === 'eps' ? epsBasis : metric;
const consensusKey = (metric, epsBasis) => metric === 'eps' ? epsBasis === 'basicEps' ? 'eps_basic' : 'eps_diluted' : metric;
const reason = code => STORY_ESTIMATE_REASONS[code];

export function storyEstimateBinding(article) {
  return { articleId: article?.id, symbol: article?.symbol, revision: article?.revision,
    articleAsOf: article?.asOf, articleUpdatedAt: article?.updatedAt };
}

function anchorFor(article, input, metric) {
  const anchors = article.metrics.filter(row => metric.measures.includes(row.measure) && row.unit === metric.unit
    && ['reported_current', 'historical_reported'].includes(row.role) && row.kind === 'reported'
    && row.period?.basis === 'reported' && ['annual', 'quarterly'].includes(row.period.frequency) && day(row.period.end)
    && (!row.period.start || (day(row.period.start) && row.period.start <= row.period.end))
    && Date.parse(row.period.end) <= Date.parse(article.asOf) && finite(row.value));
  // Prefer the article's current report. Never relabel a fiscal quarter from its
  // calendar month, or turn a source comparison into an invented calendar year.
  anchors.sort((a, b) => Number(b.role === 'reported_current') - Number(a.role === 'reported_current') || b.period.end.localeCompare(a.period.end));
  if (!anchors.length) return { code: 'no_article_anchor' };
  const anchor = anchors[0], frequency = anchor.period.frequency;
  const epsBasis = /diluted/.test(anchor.measure) ? 'dilutedEps' : 'basicEps';
  const field = fieldFor(metric.key, epsBasis), currency = anchor.currency;
  if (!/^[A-Z]{3}$/.test(currency ?? '') || input.financials.currency !== currency) return { code: 'currency', anchor };
  const actuals = valuationActuals(input.financials, article.symbol, frequency);
  if (new Set(actuals.map(row => row.period.key)).size !== actuals.length) return { code: 'ambiguous_history', anchor };
  if (!actuals.length || actuals.length !== input.financials[frequency].length
    || actuals.some((row, index) => !day(row.periodEnd) || Date.parse(row.periodEnd) > Date.parse(input.capturedAt)
    || (index && row.periodEnd <= actuals[index - 1].periodEnd)
    || (row.fiscalYear != null && row.fiscalYear !== row.period.year)
    || (frequency === 'quarterly' && row.fiscalQuarter != null && row.fiscalQuarter !== row.period.rank % 4 && !(row.fiscalQuarter === 4 && row.period.rank % 4 === 0))
    || (row.basis != null && row.basis !== 'reported') || (row.frequency != null && row.frequency !== frequency)
    || !['yahoo', 'issuer_report'].includes(row.source) || (row.estimateAdjusted && Object.keys(row.estimateAdjusted).length))) return { code: 'invalid_history', anchor };
  if (actuals.some(row => row.currency !== currency)) return { code: 'currency', anchor };
  const matching = actuals.filter(row => row.periodEnd === anchor.period.end && row.currency === currency && row[field] === anchor.value
    && (!anchor.period.start || row.periodStart === anchor.period.start));
  if (matching.length !== 1 || matching[0].period.key !== actuals.at(-1).period.key) return { code: 'financial_revision', anchor };
  return { anchor, anchorPeriod: matching[0].period.key, actuals, frequency, epsBasis, currency, field };
}

function modelInputsMatch(row, financials, metric) {
  const matches = (inputs, actuals) => Array.isArray(inputs) && inputs.length > 0
    && new Set(inputs.map(input => valuationPeriod(input.fiscalPeriod ?? String(input.fiscalYear))?.key)).size === inputs.length
    && inputs.every(input => {
    const period = valuationPeriod(input.fiscalPeriod ?? String(input.fiscalYear));
    const actual = actuals.find(actual => actual.period.key === period?.key);
    return actual && input.periodEnd === actual.periodEnd && input.currency === actual.currency
      && input.source === actual.source && finite(input.revenue) && input.revenue === actual.revenue
      && (metric !== 'ebit' || (finite(input.ebit) && input.ebit === actual.ebit))
      && ['ebit', 'ebitda', 'netIncome', 'operatingIncome', 'netIncomeCommonStockholders', 'basicEps', 'dilutedEps', 'basicAverageShares', 'dilutedAverageShares', 'ordinarySharesNumber']
        .every(key => input[key] == null || input[key] === actual[key]);
  });
  return matches(row.inputPeriods, valuationActuals(financials, financials.symbol, 'quarterly'))
    && (row.origin !== 'annual_model' || matches(row.annualInputs, valuationActuals(financials, financials.symbol, 'annual')));
}

/** Pure local adapter. Qualification delegates to the existing estimatvyn;
 * Stories adds strict article/report bindings, never a new forecasting model. */
function buildContext(article, input) {
  const binding = storyEstimateBinding(article);
  const result = { version: STORY_ESTIMATE_VERSION, binding, capturedAt: input?.capturedAt ?? null,
    origin: input?.origin ?? 'missing', charts: [], decisions: [], status: 'empty' };
  const issue = code => {
    result.decisions.push({ id: `context-${code}`, state: 'withheld', code, reason: reason(code), metric: null });
    return result;
  };
  if (!input) return issue('snapshot_missing');
  if (!date(article.asOf) || !date(input.capturedAt) || Date.parse(input.capturedAt) > Date.now() || !['recorded', 'simulated_test'].includes(input.origin)
    || Date.parse(input.capturedAt) < Date.parse(article.asOf) || !Array.isArray(article.metrics)
    || !input.financials || !collection(input.financials.annual ?? []) || !collection(input.financials.quarterly ?? [])
    || (input.estimates && (!collection(input.estimates.snapshots ?? []) || !collection(input.estimates.models ?? []) || !collection(input.estimates.revenueBetaModels ?? [])))) return issue('invalid_input');
  if (input.availability === 'locked' || input.financialAvailability === 'locked') return issue('locked');
  if (input.availability !== 'available' || input.financialAvailability !== 'available' || !input.estimates) return issue('unavailable');
  if (input.symbol !== article.symbol || input.financials.symbol !== article.symbol || input.estimates.symbol !== article.symbol) return issue('wrong_company');
  const now = Date.parse(input.capturedAt), estimates = input.estimates;
  for (const metric of metrics) {
    const match = anchorFor(article, input, metric);
    if (match.code) {
      result.decisions.push({ id: `${metric.key}-${match.code}`, metric: metric.key, title: metric.title,
        state: 'withheld', code: match.code, reason: reason(match.code), anchor: match.anchor ?? null });
      continue;
    }
    const { anchor, anchorPeriod, frequency, epsBasis, currency, actuals, field } = match;
    const args = { symbol: article.symbol, financials: input.financials, availability: 'available', metric: metric.key, currency, epsBasis, now };
    const snapshots = [...(estimates.snapshots ?? []), ...(estimates.latest ? [estimates.latest] : [])];
    const candidates = [
      ...snapshots.map((raw, index) => ({ id: `${metric.key}-consensus-${index}`, source: 'consensus', category: 'snapshots', index, raw,
        inputLocation: index < (estimates.snapshots?.length ?? 0) ? { collection: 'snapshots', index } : { collection: 'latest', index: null } })),
      ...(estimates.revenueBetaModels ?? []).map((raw, index) => ({ id: `${metric.key}-beta-${index}`, source: 'model', category: 'revenueBetaModels', index, raw })),
      ...(estimates.models ?? []).map((raw, index) => ({ id: `${metric.key}-model-${index}`, source: 'model', category: 'models', index, raw })),
    ];
    if (!candidates.length) result.decisions.push({ id: `${metric.key}-missing`, metric: metric.key, title: metric.title,
      state: 'withheld', code: 'metric_missing', reason: reason('metric_missing'), anchor });
    for (const candidate of candidates) {
      const row = candidate.raw, period = valuationPeriod(row.fiscalPeriod);
      const asOf = candidate.source === 'consensus' ? row.publishedAt : row.updatedAt;
      const values = candidate.source === 'consensus' && Array.isArray(row.metrics)
        ? row.metrics.filter(value => value?.key === consensusKey(metric.key, epsBasis)) : [];
      const value = candidate.source === 'consensus' ? values[0]?.amount
        : metric.key === 'eps' ? row.epsEstimate?.forecasts?.[epsBasis]?.value : row.metrics?.[metric.key];
      let code;
      if (candidate.source === 'consensus' ? !row.companies?.some(company => company.symbol === article.symbol) : row.symbol !== article.symbol) code = 'wrong_company';
      else if (!period) code = 'period';
      else if (period.frequency !== frequency) code = 'different_frequency';
      else if (!date(asOf) || now - Date.parse(asOf) > (candidate.source === 'consensus' ? 90 : 30) * 86400_000) code = 'stale';
      else if (Date.parse(asOf) > now) code = 'future';
      else if (candidate.source === 'consensus' ? values.some(value => value.currency !== currency) : row.currency !== currency) code = 'currency';
      else if (candidate.source === 'consensus' && (values.length > 1 || snapshots.some((other, index) => index !== candidate.index
        && valuationPeriod(other.fiscalPeriod)?.key === period.key && other.publishedAt === asOf
        && other.companies?.some(company => company.symbol === article.symbol)
        && other.metrics?.some(otherValue => otherValue.key === consensusKey(metric.key, epsBasis)
          && otherValue.currency === currency && otherValue.amount !== value)))) code = 'conflicting_consensus';
      else if (candidate.source === 'consensus' && values.some(value => value.scope)) code = 'scope';
      else if ((candidate.source === 'consensus' && values.some(value => value.basis === 'adjusted' || /adjusted|justerad/i.test(value.label ?? '')))
        || (candidate.source === 'model' && row.basis !== 'reported')) code = 'adjusted';
      else if (row.origin === 'manual') code = 'manual';
      else if (!finite(value)) code = 'metric_missing';
      else if (candidate.category === 'models' && legacyModelPublicationHidden(estimates.modelPublicationPolicy, metric.key, frequency)) code = 'retired';
      else if (candidate.category === 'models' && isModelProfitMetric(metric.key)
        && modelProfitEligibility(valuationActuals(input.financials, article.symbol, 'quarterly'), currency).status !== 'eligible') code = 'profit_withheld';
      else if (candidate.source === 'model' && !modelInputsMatch(row, input.financials, metric.key)) code = 'model_inputs';
      if (!code) {
        const isolated = { ...estimates, latest: null, snapshots: [], models: [], revenueBetaModels: [], [candidate.category]: [row] };
        const qualified = valuationForecasts({ ...args, estimates: isolated }).find(value => value.period.key === period.key);
        if (!qualified) code = candidate.source === 'consensus' ? 'period' : 'needs_review';
        else if (qualified.basis !== 'reported') code = 'share_basis';
        else candidate.qualified = qualified;
      }
      Object.assign(candidate, { period: period?.key ?? row.fiscalPeriod ?? null, asOf: asOf ?? null, value: finite(value) ? value : null, code });
    }
    // Filter only the additional Stories binding failures, then let the same
    // existing selector resolve consensus/beta/legacy precedence and ordering.
    const eligible = candidates.filter(candidate => candidate.qualified);
    const safe = { ...estimates, latest: null,
      ...Object.fromEntries(['snapshots', 'models', 'revenueBetaModels'].map(category => [category, eligible.filter(candidate => candidate.category === category).map(candidate => candidate.raw)])) };
    const allSelected = valuationForecasts({ ...args, estimates: safe }).filter(row => row.period.frequency === frequency && row.basis === 'reported');
    const selected = allSelected.slice(0, 2);
    const selectedIds = new Set();
    for (const forecast of selected) {
      const candidate = eligible.find(candidate => !selectedIds.has(candidate.id) && candidate.source === forecast.source
        && candidate.qualified.period.key === forecast.period.key && candidate.value === forecast.value && candidate.asOf === forecast.asOf
        && Boolean(candidate.qualified.revenueBeta) === Boolean(forecast.revenueBeta));
      if (candidate) selectedIds.add(candidate.id);
    }
    for (const candidate of candidates) {
      const chosen = selectedIds.has(candidate.id);
      const code = candidate.code ?? (chosen ? candidate.source === 'consensus' ? 'selected_consensus' : 'selected_model'
        : allSelected.slice(2).some(row => row.period.key === candidate.period) ? 'outside_chart'
        : candidate.source === 'model' && selected.some(row => row.period.key === candidate.period && row.source === 'consensus') ? 'consensus_precedence' : 'superseded');
      result.decisions.push({ id: candidate.id, metric: metric.key, title: metric.title, state: chosen ? 'selected' : 'excluded',
        code, reason: reason(code), source: candidate.source, period: candidate.period, asOf: candidate.asOf,
        value: candidate.value, currency, epsBasis: metric.key === 'eps' ? epsBasis : null, anchor,
        input: candidate.raw, inputLocation: candidate.inputLocation ?? { collection: candidate.category, index: candidate.index } });
    }
    if (!selected.length) continue;
    const reported = actuals.filter(row => row.period.rank <= actuals.at(-1).period.rank).slice(-3)
      .map(row => ({ period: row.period, value: finite(row[field]) && row.currency === currency ? row[field] : null, source: 'reported', sourceLabel: 'Rapporterat' }));
    const view = { metric: metric.key, currency, bars: [...reported, ...selected].map(row => ({ ...row,
      label: `${row.period.label}${row.source === 'reported' ? '' : 'E'}` })) };
    const chart = estimateChartModel(view);
    chart.series = chart.series.map(series => ({ ...series, label: series.source === 'consensus' ? 'Analytikerkonsensus' : series.label }));
    chart.rows = chart.rows.map((row, index) => {
      const observation = view.bars[index];
      const decision = candidates.find(candidate => selectedIds.has(candidate.id) && candidate.period === row.id && candidate.source === observation.source);
      return { ...row, x: observation.period.rank,
        axisLabel: frequency === 'quarterly' ? observation.period.label.replace(' ', '\n') + (observation.source === 'reported' ? '' : 'E') : row.label,
        evidenceId: decision?.id ?? `${metric.key}-reported-${row.id}` };
    });
    reported.forEach(row => result.decisions.push({ id: `${metric.key}-reported-${row.period.key}`, metric: metric.key, title: metric.title,
      state: 'reported', source: 'reported', reason: 'Rapporterat utfall ur samma frysta rapportunderlag.', value: row.value, currency,
      period: row.period.key, anchor, input: actuals.find(actual => actual.period.key === row.period.key) }));
    result.charts.push({ id: `estimate-${metric.key}`, metric: metric.key, title: metric.title, frequency,
      anchorMetricKey: anchor.key, anchorPeriod, epsBasis: metric.key === 'eps' ? epsBasis : null, ...chart,
      note: selected.some(row => row.revenueBeta) ? REVENUE_BETA_UNCERTAINTY
        : selected.some(row => row.source === 'model') ? 'OMXsum-estimat är modellprognoser, inte analytikerkonsensus. Utfallet kan avvika. Prognosprecisionen är ännu inte validerad.'
        : 'Analytikerkonsensus är en prognos, inte rapporterat utfall. Utfallet kan avvika.',
    });
  }
  result.status = result.charts.length ? 'ready' : 'empty';
  return result;
}

export function buildStoryEstimateContext(article, input) {
  try { return buildContext(article, input); }
  catch { return { version: STORY_ESTIMATE_VERSION, binding: storyEstimateBinding(article), capturedAt: null, origin: 'missing',
    charts: [], status: 'empty', decisions: [{ id: 'context-invalid_input', state: 'withheld', code: 'invalid_input', reason: reason('invalid_input'), metric: null }] }; }
}

/** Reader-safe projection: original snapshots, providers, audit reasons and
 * model inputs remain in Studio, not in article prose or public chart props. */
export function readerStoryEstimateContext(context) {
  return { version: context.version, binding: context.binding, capturedAt: context.capturedAt, origin: context.origin,
    charts: context.charts.map(({ id, title, metric, frequency, epsBasis, anchorMetricKey, anchorPeriod, series, rows, unit, note }) => ({
      id, title, metric, frequency, epsBasis, anchorMetricKey, anchorPeriod, note,
      unit: { kind: unit.kind, currency: unit.currency },
      series: series.map(({ key, source, label }) => ({ key, source, label })),
      rows: rows.map(({ id, label, x, axisLabel, evidenceId, values }) => ({ id, label, x, axisLabel, evidenceId,
        values: Object.fromEntries(series.map(series => [series.key, values[series.key]])) })),
    })) };
}

export function validReaderStoryEstimateContext(context, article) {
  try {
    const binding = storyEstimateBinding(article);
    return context?.version === STORY_ESTIMATE_VERSION && ['recorded', 'simulated_test'].includes(context.origin)
      && Object.keys(binding).length === Object.keys(context.binding).length
      && Object.entries(binding).every(([key, value]) => context.binding[key] === value)
      && date(context.capturedAt) && Date.parse(context.capturedAt) >= Date.parse(article.asOf) && Date.parse(context.capturedAt) <= Date.now()
      && Array.isArray(context.charts) && context.charts.length > 0 && context.charts.length <= 3
      && new Set(context.charts.map(chart => chart.metric)).size === context.charts.length
      && context.charts.every(chart => {
        const config = metrics.find(metric => metric.key === chart.metric);
        const anchor = article.metrics.find(metric => metric.key === chart.anchorMetricKey);
        const anchorPeriod = valuationPeriod(chart.anchorPeriod);
        return config && anchor && config.measures.includes(anchor.measure) && anchor.unit === config.unit
          && anchor.kind === 'reported' && ['reported_current', 'historical_reported'].includes(anchor.role)
          && anchor.period.basis === 'reported' && day(anchor.period.end) && Date.parse(anchor.period.end) <= Date.parse(article.asOf)
          && anchor.currency === chart.unit.currency && anchor.period.frequency === chart.frequency
          && chart.unit.kind === (chart.metric === 'eps' ? 'perShare' : 'money')
          && (chart.metric !== 'eps' || chart.epsBasis === (/diluted/.test(anchor.measure) ? 'dilutedEps' : 'basicEps'))
          && anchorPeriod?.frequency === chart.frequency
          && ['annual', 'quarterly'].includes(chart.frequency) && chart.rows.length <= 5
          && chartModel({ ...chart, time: true, zeroBaseline: true }).status === 'ready'
          && chart.rows.some(row => row.id === anchorPeriod.key && row.values.reported === anchor.value)
          && chart.rows.some(row => finite(row.values.consensus) || finite(row.values.model))
          && chart.series.every(series => ['reported', 'consensus', 'model'].includes(series.key) && series.source === series.key)
          && chart.rows.every(row => {
            const period = valuationPeriod(row.id), sources = chart.series.filter(series => row.values[series.key] != null);
            return period?.frequency === chart.frequency && row.x === period.rank && sources.length <= 1
              && chart.series.every(series => row.values[series.key] === null || finite(row.values[series.key]))
              && (sources[0]?.source === 'reported' ? period.rank <= anchorPeriod.rank : !sources.length || period.rank > anchorPeriod.rank)
              && row.label === `${period.label}${sources[0]?.source === 'reported' || !sources.length ? '' : 'E'}`;
          });
      });
  } catch { return false; }
}
