import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildStoryEstimateContext, readerStoryEstimateContext, validReaderStoryEstimateContext } from '../app/utils/storyEstimateContext.js';
import { storyEstimatesFixture, storyEstimateScenario } from '../app/designsystem/stories/estimates/storyEstimatesFixture.js';
import { createStudioEstimateSidecar, bindStudioEstimateContexts, rejectedStudioEstimateContexts, estimateSnapshotDigest } from '../app/designsystem/stories/studioEstimateContexts.js';
import { validStudioSnapshot } from '../app/designsystem/stories/studioSnapshot.js';
import { selectedStudioPack } from '../app/designsystem/stories/studioRunSelection.js';
import { valuationForecasts } from '../app/utils/companyValuation.js';
import { chartModel } from '../app/utils/chartPresentation.js';
import { staticChartGeometry } from '../app/utils/staticChartGeometry.js';
import { valuationFixture } from './fixtures/valuation.mjs';
import { exportEstimateSidecar } from '../scripts/export-stories-estimate-context.mjs';

const now = Date.parse('2026-10-05T10:00:00Z');
const fixture = () => storyEstimatesFixture(now);
const context = f => buildStoryEstimateContext(f.article, f.input);
const forecast = (c, metric = 'revenue') => c.charts.find(chart => chart.metric === metric)?.rows.filter(row => row.values.consensus != null || row.values.model != null) ?? [];
const inputsFor = f => ({ schemaVersion: 1, mode: 'frozen_story_estimate_inputs', companies: [f.input] });
function studio(f = fixture()) {
  const original = { body: 'Fiktivt test.', preamble: '', title: 'Fiktivt test' };
  const evidence = { schemaVersion: 2, version: 'stories-evidence-v2.1', id: 'evidence_' + 'a'.repeat(24), fingerprint: 'a'.repeat(64),
    articleId: f.article.id, company: { symbol: f.article.symbol }, financialPolicy: 'yahoo',
    sources: [{ id: 'source1', subject: f.article.symbol, rights: 'full_text', issuerVerified: true, offsetUnit: 'unicode_code_points', original,
      originalDigest: createHash('sha256').update(JSON.stringify(original)).digest('hex') }],
    facts: [], selections: [], calculations: [], financialInputs: [], offeredIds: [] };
  return { schemaVersion: 2, mode: 'unpublished_local_stories_studio', productionWrites: 0, publications: 0, notifications: 0,
    packs: [{ evidence, article: { ...f.article, schemaVersion: 1 }, runs: [1, 2].map(index => ({ id: `run${index}`, evidenceId: evidence.id,
      input: { evidenceId: evidence.id, fingerprint: evidence.fingerprint, facts: [], calculations: [], passages: [] } })) }] };
}

test('per-metric consensus wins, including negative EBIT/EPS; later qualified house estimates remain separate', () => {
  const f = fixture(), before = structuredClone(f), c = context(f);
  assert.equal(c.status, 'ready'); assert.equal(c.charts.length, 3);
  assert.deepEqual(forecast(c).map(row => row.values), [{ reported: null, consensus: 110e6, model: null }, { reported: null, consensus: null, model: 125e6 }]);
  assert.equal(forecast(c, 'ebit')[0].values.consensus, -1e6);
  assert.equal(forecast(c, 'eps')[0].values.consensus, -.5);
  assert.equal(c.decisions.find(row => row.id === 'revenue-model-0').code, 'consensus_precedence');
  assert.equal(c.decisions.find(row => row.id === 'revenue-model-1').code, 'selected_model');
  assert.deepEqual(f, before);
  assert.equal(validReaderStoryEstimateContext(readerStoryEstimateContext(c), f.article), true);
});

test('the existing financial selector supplies exactly the same eligible values and sources', () => {
  const f = fixture(), c = context(f);
  for (const metric of ['revenue', 'ebit', 'eps']) {
    const existing = valuationForecasts({ ...f.input, metric, currency: 'SEK', epsBasis: 'basicEps', now });
    assert.deepEqual(forecast(c, metric).map(row => ({ id: row.id, source: row.values.consensus != null ? 'consensus' : 'model', value: row.values.consensus ?? row.values.model })),
      existing.slice(0, 2).map(row => ({ id: row.period.key, source: row.source, value: row.value })));
  }
});

test('real zero consensus is selected, not replaced with a positive house model', () => {
  const f = fixture(); f.input.estimates.snapshots[0].metrics[0].amount = 0;
  assert.equal(forecast(context(f))[0].values.consensus, 0);
});

test('missing historical values remain null; fiscal gaps are not interpolated or added', () => {
  const f = fixture(); f.input.financials.annual[0].revenue = null; f.input.financials.annual.splice(1, 1);
  const rows = context(f).charts[0].rows;
  assert.deepEqual(rows.map(row => row.id), ['2023', '2025', '2026']);
  assert.equal(rows[0].values.reported, null);
  assert.deepEqual(rows.map(row => row.x), [8096, 8104, 8108]);
  assert.equal(context(f).decisions.find(row => row.id === 'revenue-model-1').code, 'model_inputs');
});

for (const [scenario, expected] of [['model', 2], ['stale', 0], ['outage', 0]]) test(`scenario ${scenario} preserves source/error semantics`, () => {
  const f = fixture(); f.input = storyEstimateScenario(f.input, scenario);
  const c = context(f); assert.equal(c.charts.length, expected);
  if (scenario === 'model') assert.ok(forecast(c).every(row => row.values.model != null));
  if (scenario === 'outage') assert.equal(c.decisions[0].code, 'unavailable');
  if (scenario === 'stale') assert.ok(c.decisions.filter(row => row.state === 'excluded').every(row => row.code === 'stale'));
});

for (const [name, mutate, code] of [
  ['missing snapshot', f => { f.input = null; }, 'snapshot_missing'],
  ['upstream locked', f => { f.input.availability = 'locked'; }, 'locked'],
  ['financial upstream error', f => { f.input.financialAvailability = 'unavailable'; }, 'unavailable'],
  ['wrong symbol', f => { f.input.symbol = 'OTHER.ST'; }, 'wrong_company'],
  ['missing cutoff', f => { f.article.asOf = null; }, 'invalid_input'],
  ['capture before article', f => { f.input.capturedAt = '2020-01-01'; }, 'invalid_input'],
  ['future capture', f => { f.input.capturedAt = '2099-01-01'; }, 'invalid_input'],
  ['unmarked simulated origin', f => { f.input.origin = 'generated'; }, 'invalid_input'],
  ['invalid input array', f => { f.input.estimates.snapshots = {}; }, 'invalid_input'],
  ['null nested candidate', f => { f.input.estimates.latest = { fiscalPeriod: '2026', companies: [null] }; }, 'invalid_input'],
  ['wrong history currency', f => { f.input.financials.annual[0].currency = 'EUR'; }, 'currency'],
  ['revised latest report', f => { f.input.financials.annual.at(-1).revenue += 1; }, 'financial_revision'],
  ['wrong report start', f => { f.article.metrics[0].period.start = '2025-01-01'; }, 'financial_revision'],
  ['a newer report than article', f => { f.input.financials.annual.push({ ...f.input.financials.annual.at(-1), fiscalPeriod: '2026', fiscalYear: 2026, periodEnd: '2026-09-30' }); }, 'financial_revision'],
  ['invalid history period', f => { f.input.financials.annual[0].fiscalPeriod = 'not-a-period'; }, 'invalid_history'],
  ['invalid calendar date', f => { f.input.financials.annual[0].periodEnd = '2023-02-31'; }, 'invalid_history'],
  ['future history', f => { f.input.financials.annual.at(-1).periodEnd = '2099-12-31'; }, 'invalid_history'],
  ['adjusted history', f => { f.input.financials.annual[0].basis = 'adjusted'; }, 'invalid_history'],
  ['estimate masquerading as actual', f => { f.input.financials.annual[0].estimate = true; }, 'invalid_history'],
  ['contradictory fiscal year', f => { f.input.financials.annual[0].fiscalYear = 2030; }, 'invalid_history'],
  ['duplicate actual period', f => { f.input.financials.annual.push({ ...f.input.financials.annual.at(-1) }); }, 'ambiguous_history'],
  ['unverified actual source', f => { f.input.financials.annual[0].source = 'consensus'; }, 'invalid_history'],
]) test(`withholds ${name} without mutating the article`, () => {
  const f = fixture(); mutate(f); const before = structuredClone(f), c = context(f);
  assert.ok(c.decisions.some(row => row.code === code), JSON.stringify(c.decisions.map(row => row.code)));
  assert.equal(forecast(c).length, 0);
  assert.deepEqual(f, before);
});

for (const [name, mutate, code] of [
  ['wrong issuer', r => { r.companies = [{ symbol: 'OTHER.ST' }]; }, 'wrong_company'],
  ['quarter against annual anchor', r => { r.fiscalPeriod = '2026-Q3'; }, 'different_frequency'],
  ['old published date', r => { r.publishedAt = new Date(now - 91 * 86400_000).toISOString(); }, 'stale'],
  ['published after cutoff', r => { r.publishedAt = new Date(now + 1).toISOString(); }, 'future'],
  ['wrong metric currency', r => { r.metrics[0].currency = 'EUR'; }, 'currency'],
  ['scoped metric', r => { r.metrics[0].scope = 'segment'; }, 'scope'],
  ['adjusted metric', r => { r.metrics[0].basis = 'adjusted'; }, 'adjusted'],
  ['manual estimate', r => { r.origin = 'manual'; }, 'manual'],
  ['string amount', r => { r.metrics[0].amount = '110000000'; }, 'metric_missing'],
  ['duplicate metric definitions', r => { r.metrics.push({ ...r.metrics[0] }); }, 'conflicting_consensus'],
]) test(`consensus audit explains ${name}`, () => {
  const f = fixture(); mutate(f.input.estimates.snapshots[0]);
  assert.equal(context(f).decisions.find(row => row.id === 'revenue-consensus-0').code, code);
});

test('contradictory equal-date consensus snapshots are both rejected, not response-order-selected', () => {
  const f = fixture(), other = structuredClone(f.input.estimates.snapshots[0]); other.metrics[0].amount++;
  f.input.estimates.snapshots.push(other);
  const c = context(f);
  assert.ok(c.decisions.filter(row => row.metric === 'revenue' && row.source === 'consensus').every(row => row.code === 'conflicting_consensus'));
});

test('latest-only consensus retains its real input location in Studio', () => {
  const f = fixture(); f.input.estimates.latest = f.input.estimates.snapshots.pop();
  const decision = context(f).decisions.find(row => row.id === 'revenue-consensus-0');
  assert.equal(decision.code, 'selected_consensus'); assert.deepEqual(decision.inputLocation, { collection: 'latest', index: null });
});

for (const [name, mutate, code] of [
  ['retired model', f => { f.input.estimates.modelPublicationPolicy = { version: 1, legacyModels: 'hide_all' }; }, 'retired'],
  ['revised model inputs', f => { f.input.estimates.models[0].inputPeriods[0].revenue++; }, 'model_inputs'],
  ['missing model numeric input', f => { delete f.input.estimates.models[0].inputPeriods[0].revenue; }, 'model_inputs'],
  ['duplicate model input period', f => { f.input.estimates.models[0].inputPeriods[0] = structuredClone(f.input.estimates.models[0].inputPeriods[1]); }, 'model_inputs'],
  ['wrong annual inputs', f => { f.input.estimates.models[0].annualInputs[0].periodEnd = '2023-06-30'; }, 'model_inputs'],
  ['unqualified public contract', f => { f.input.estimates.models[0].publicAnnualModelVersion = 0; }, 'needs_review'],
  ['metric review flag', f => { f.input.estimates.models[0].reviewFlags = [{ metric: 'revenue' }]; }, 'needs_review'],
]) test(`model audit explains ${name}`, () => {
  const f = fixture(); mutate(f);
  assert.equal(context(f).decisions.find(row => row.id === 'revenue-model-0').code, code);
});

test('profit models are withheld on loss history while valid consensus loss still survives', () => {
  const f = fixture(); f.input.financials.quarterly.forEach(row => { row.ebit = -1; });
  const c = context(f);
  assert.equal(c.decisions.find(row => row.id === 'ebit-model-0').code, 'profit_withheld');
  assert.equal(forecast(c, 'ebit')[0].values.consensus, -1e6);
});

test('contract values and guidance are not mistaken for reported revenue', () => {
  const f = fixture(); f.article.metrics[0].role = 'firm_contract';
  assert.equal(context(f).decisions.find(row => row.metric === 'revenue').code, 'no_article_anchor');
});

test('malformed article input never crashes or produces charts', () => {
  for (const article of [null, undefined, {}, { asOf: '2026-10-05', metrics: [null] }]) assert.equal(buildStoryEstimateContext(article, fixture().input).charts.length, 0);
});

test('non-calendar fiscal quarters and their exact start/end remain unchanged', () => {
  const f = fixture(), values = valuationFixture('FISCAL.TEST', now), latest = values.financials.quarterly.at(-1);
  latest.periodEnd = '2026-07-31'; latest.periodStart = '2026-05-01';
  f.article.symbol = 'FISCAL.TEST'; f.article.metrics = [{ ...f.article.metrics[0], value: latest.revenue, role: 'reported_current',
    period: { start: latest.periodStart, end: latest.periodEnd, frequency: 'quarterly', basis: 'reported' } }];
  f.input = { ...f.input, symbol: 'FISCAL.TEST', financials: values.financials, estimates: values.estimates };
  const c = context(f); assert.equal(c.charts[0].anchorPeriod, '2026-Q2');
  assert.equal(c.charts[0].rows.at(-1).id, '2026-Q3');
  latest.periodStart = '2026-04-01';
  assert.equal(context(f).decisions.find(row => row.metric === 'revenue').code, 'financial_revision');
});

for (const symbol of ['VALUE.TEST', 'VALUE-R12-BETA.TEST', 'VALUE-R12-BETA-CONSENSUS.TEST', 'VALUE-R12-RETIRED-ALL.TEST']) test(`quarterly adapter reuses public beta/retirement policy: ${symbol}`, () => {
  const f = fixture(), values = valuationFixture(symbol, now), latest = values.financials.quarterly.at(-1);
  f.article.symbol = symbol;
  f.article.metrics = [{ ...f.article.metrics[0], value: latest.revenue, role: 'reported_current', period: { end: latest.periodEnd, frequency: 'quarterly', basis: 'reported' } }];
  f.input = { ...f.input, symbol, financials: values.financials, estimates: values.estimates };
  const c = context(f), existing = valuationForecasts({ ...f.input, metric: 'revenue', currency: 'SEK', now });
  assert.deepEqual(forecast(c).map(row => row.values.consensus ?? row.values.model), existing.slice(0, 2).map(row => row.value));
  if (symbol !== 'VALUE-R12-RETIRED-ALL.TEST') assert.equal(c.charts[0].rows.at(-1).axisLabel, 'Q3\n2026E');
  if (symbol === 'VALUE-R12-BETA.TEST') assert.match(c.charts[0].note, /Preliminär omsättningsprognos/);
});

test('reader projection removes internal provider, raw inputs and audit decisions at every level', () => {
  const f = fixture(), c = context(f); c.charts[0].rows[0].providerSecret = 'PRIVATE'; c.charts[0].series[0].input = f.input;
  const json = JSON.stringify(readerStoryEstimateContext(c));
  for (const word of ['fictional-consensus', 'inputPeriods', 'annualInputs', 'decisions', 'PRIVATE', 'yahoo', 'publisher']) assert.ok(!json.includes(word), word);
});

test('forecast source transitions retain exact endpoints without connecting across missing values or fiscal periods', () => {
  const chart = context(fixture()).charts[0], geometry = value => staticChartGeometry(chartModel({ ...value, time: true }), { time: true, forecastStep: 4 });
  assert.deepEqual(geometry(chart).transitions.map(row => row.series.source), ['consensus', 'model']);
  assert.equal(staticChartGeometry(chartModel({ ...chart, time: true }), { time: true }).transitions.length, 0);
  const gap = structuredClone(chart); gap.rows.splice(3, 1);
  assert.equal(geometry(gap).transitions.length, 0);
  const missing = structuredClone(chart); missing.rows[2].values.reported = null;
  assert.deepEqual(geometry(missing).transitions.map(row => row.series.source), ['model']);
});

for (const [name, mutate] of [
  ['different article', c => { c.binding.articleId = 'another'; }],
  ['different revision', c => { c.binding.revision++; }],
  ['different article cutoff', c => { c.binding.articleAsOf = '2026-01-01'; }],
  ['future capture', c => { c.capturedAt = '2099-01-01'; }],
  ['untyped unit', c => { c.charts[0].unit.kind = 'number'; }],
  ['wrong EPS basis', c => { c.charts[2].epsBasis = 'dilutedEps'; }],
  ['wrong anchor period', c => { c.charts[0].anchorPeriod = '2023'; }],
  ['estimate without E suffix', c => { c.charts[0].rows.at(-1).label = '2027'; }],
  ['estimate before anchor', c => { c.charts[0].rows[0].values = { reported: null, consensus: 1, model: null }; c.charts[0].rows[0].label = '2023E'; }],
  ['invented actual source', c => { c.charts[0].series[0].source = 'consensus'; }],
  ['string value coerced to missing', c => { c.charts[0].rows[0].values.reported = '60'; }],
  ['two sources summed in one row', c => { c.charts[0].rows.at(-1).values.consensus = 1; }],
]) test(`reader fails closed on ${name}`, () => {
  const f = fixture(), c = readerStoryEstimateContext(context(f)); mutate(c);
  assert.equal(validReaderStoryEstimateContext(c, f.article), false);
});

test('sidecar binds every run independently and leaves writer inputs, reviews and originals unchanged', () => {
  const f = fixture(), s = studio(f), before = structuredClone(s), sidecar = createStudioEstimateSidecar(s, inputsFor(f)), bound = bindStudioEstimateContexts(s, sidecar);
  assert.equal(validStudioSnapshot(s), true);
  assert.equal(sidecar.records.length, 2); assert.equal(sidecar.productionWrites, 0); assert.equal(sidecar.publications, 0);
  assert.deepEqual(s, before); assert.equal(bound.packs[0].estimateContexts.run1.charts.length, 3);
  assert.deepEqual(bound.packs[0].runs, before.packs[0].runs);
  assert.equal(selectedStudioPack(bound.packs[0], 0).estimateContext, bound.packs[0].estimateContexts.run1);
  assert.equal(validStudioSnapshot(bound), false); // Cannot smuggle server-derived contexts into stored source.
});

for (const [name, mutate] of [
  ['different snapshot', c => { c.studioDigest = 'a'; }],
  ['changed article', c => { c.records[0].articleDigest = 'b'; }],
  ['changed writer run', c => { c.records[0].writerRunId = 'other'; }],
  ['changed evidence', c => { c.records[0].evidenceFingerprint = 'b'; }],
  ['changed input', c => { c.records[0].input.financials.annual[0].revenue++; }],
  ['duplicate run record', c => { c.records.push(structuredClone(c.records[0])); }],
  ['unknown record', c => { c.records[0].key = 'unknown'; }],
  ['published sidecar', c => { c.publications = 1; }],
]) test(`sidecar rejects ${name}`, () => {
  const f = fixture(), s = studio(f), c = createStudioEstimateSidecar(s, inputsFor(f)); mutate(c);
  assert.throws(() => bindStudioEstimateContexts(s, c));
});

test('missing and rejected sidecars preserve articles and show the actual missing/invalid reason', () => {
  const s = studio(), missing = bindStudioEstimateContexts(s), rejected = rejectedStudioEstimateContexts(s);
  assert.equal(missing.packs[0].estimateContexts.run1.decisions[0].code, 'snapshot_missing');
  assert.equal(rejected.packs[0].estimateContexts.run1.decisions[0].code, 'sidecar_invalid');
  assert.deepEqual(rejected.packs[0].article, s.packs[0].article);
});

test('sidecar cannot attach test contracts to an unrelated real company', () => {
  const f = fixture(), s = studio(f); s.packs[0].evidence.company.symbol = 'REAL.ST';
  assert.throws(() => createStudioEstimateSidecar(s, inputsFor(f)));
});

const realPath = process.env.OMXSUM_STORIES_CHART_SNAPSHOT;
test('offline export uses exclusive owner-only output and cannot overwrite files or symlink targets', () => {
  const f = fixture(), s = studio(f), dir = mkdtempSync(join(tmpdir(), 'stories-estimate-export-test-'));
  const studioPath = join(dir, 'studio.json'), inputPath = join(dir, 'inputs.json'), outputPath = join(dir, 'sidecar.json');
  writeFileSync(studioPath, JSON.stringify(s), { mode: 0o600 }); writeFileSync(inputPath, JSON.stringify(inputsFor(f)), { mode: 0o600 });
  assert.deepEqual(exportEstimateSidecar({ studioPath, inputPath, outputPath }), { records: 2, charts: 6, productionWrites: 0, publications: 0, modelCalls: 0 });
  assert.equal(statSync(outputPath).mode & 0o777, 0o600);
  assert.equal(bindStudioEstimateContexts(s, JSON.parse(readFileSync(outputPath, 'utf8'))).packs[0].estimateContexts.run1.charts.length, 3);
  assert.throws(() => exportEstimateSidecar({ studioPath, inputPath, outputPath }));
  assert.throws(() => exportEstimateSidecar({ studioPath, inputPath, outputPath: studioPath }));
  const link = join(dir, 'symlink.json'); symlinkSync(studioPath, link);
  assert.throws(() => exportEstimateSidecar({ studioPath, inputPath, outputPath: link }));
  assert.deepEqual(JSON.parse(readFileSync(studioPath, 'utf8')), s);
});

test('frozen real pilot honestly has no estimates; export never overwrites its original or an existing output', { skip: !realPath }, async () => {
  const s = JSON.parse(readFileSync(realPath, 'utf8')), before = estimateSnapshotDigest(s), result = bindStudioEstimateContexts(s);
  for (const pack of result.packs) for (const c of Object.values(pack.estimateContexts)) {
    assert.equal(c.charts.length, 0); assert.equal(c.decisions[0].code, 'snapshot_missing');
  }
  // Reuse the pre-existing frozen real JSON as both read inputs only in failure
  // checks. Actual successful CLI export is exercised by the local QA setup.
  assert.throws(() => exportEstimateSidecar({ studioPath: realPath, inputPath: realPath, outputPath: realPath }));
  const dir = mkdtempSync(join(tmpdir(), 'stories-estimate-symlink-test-')), link = join(dir, 'output.json'); symlinkSync(realPath, link);
  assert.equal(statSync(link).size, statSync(realPath).size);
  assert.throws(() => exportEstimateSidecar({ studioPath: realPath, inputPath: realPath, outputPath: link }));
  assert.equal(estimateSnapshotDigest(JSON.parse(readFileSync(realPath, 'utf8'))), before);
});
