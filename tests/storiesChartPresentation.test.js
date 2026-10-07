import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { omxsumV2Fixtures } from './fixtures/omxsum-stories.mjs';
import { storyChartPresentation, validStoryCharts } from '../app/utils/storiesCharts.js';
import { chartModel } from '../app/utils/chartPresentation.js';
import { staticChartGeometry, chartLabelLines } from '../app/utils/staticChartGeometry.js';
import { validStudioSnapshot } from '../app/designsystem/stories/studioSnapshot.js';

const article = () => structuredClone(omxsumV2Fixtures[0]);
const adapt = (value, index = 0) => storyChartPresentation({ chart: value.charts[index], metrics: value.metrics, asOf: value.asOf });

test('Stories use the checked article metrics without mutating or fetching a second series', () => {
    const value = article(), before = structuredClone(value), data = adapt(value);
    assert.deepEqual(data.rows.map(row => row.values.reported), [-1320000, -120000]);
    assert.deepEqual(data.rows.map(row => row.id), value.charts[0].points.map(point => point.metricKey));
    assert.deepEqual(data.series, [{ key: 'reported', source: 'reported', label: 'Rapporterat' }]);
    assert.deepEqual(value, before);
    const model = chartModel({ ...data, zeroBaseline: true });
    assert.equal(model.status, 'ready');
    assert.deepEqual(model.domain, [-1320000, 0]);
    assert.equal(model.formatExact(-1320000), '−1 320 000 SEK');
});

test('history retains real date spacing and does not add a missing year', () => {
    const value = article();
    value.metrics.at(-1).period.end = value.asOf.slice(0, 4) + '-06-30';
    const data = adapt(value, 1), model = chartModel({ ...data, time: true });
    assert.equal(data.rows.length, 3);
    assert.deepEqual(data.rows.map(row => row.x), value.metrics.slice(2).map(metric => Date.parse(metric.period.end)));
    const geometry = staticChartGeometry(model, { time: true });
    assert.ok(geometry.rows[1].xPct < 56); // Irregular dates, not equal category spacing.
    assert.equal(geometry.lines[0].segments.length, 2);
});

test('report chart date ranges are readable labels only; checked periods, values and metric IDs remain exact', () => {
    const value = article();
    value.charts[0].points[0].label = '2025-05-01–2025-07-31';
    value.charts[0].points[1].label = '2026-05-01–2026-07-31';
    const before = structuredClone(value), data = adapt(value);
    assert.ok(validStoryCharts(value));
    assert.deepEqual(data.rows.map(row => row.label), ['1 maj–31 juli 2025', '1 maj–31 juli 2026']);
    assert.deepEqual(data.rows.map(row => row.id), value.charts[0].points.map(point => point.metricKey));
    assert.deepEqual(data.rows.map(row => row.values.reported), [-1320000, -120000]);
    assert.equal(data.title, value.charts[0].title); assert.equal(data.note, value.charts[0].note);
    assert.equal(data.meta, 'Rapporterat · samma mått och valuta');
    assert.deepEqual(value, before, 'Formatting must not rewrite frozen chart labels or metric metadata');
});

test('history date labels use Swedish dates without changing timestamp spacing or chart evidence references', () => {
    const value = article(), before = structuredClone(value), data = adapt(value, 1);
    const ends = value.metrics.slice(2).map(metric => metric.period.end);
    assert.deepEqual(data.rows.map(row => row.label), ends.map(end => `31 december ${end.slice(0, 4)}`));
    assert.deepEqual(data.rows.map(row => row.x), ends.map(end => Date.parse(end)));
    assert.deepEqual(data.rows.map(row => row.id), value.charts[1].points.map(point => point.metricKey));
    assert.equal(data.meta, 'Rapporterad historik · helår');
    assert.deepEqual(value, before);
});

test('ordinary chart labels and malformed date ranges are preserved; presentation does not infer periods', () => {
    const value = article();
    value.charts[0].points[0].label = 'Rapportens jämförelsetal';
    value.charts[0].points[1].label = '2026-02-31–2026-03-31';
    const before = structuredClone(value), data = adapt(value);
    assert.deepEqual(data.rows.map(row => row.label), value.charts[0].points.map(point => point.label));
    assert.deepEqual(value, before);
});

for (const [name, mutate, index = 0] of [
    ['unknown metric', a => { a.charts[0].points[0].metricKey = 'missing'; }],
    ['invented chart value', a => { a.charts[0].points[0].value = 4; }],
    ['mixed currency', a => { a.metrics[0].currency = 'EUR'; }],
    ['invalid currency', a => { a.charts[0].currency = a.metrics[0].currency = a.metrics[1].currency = 'sek'; }],
    ['mixed measures', a => { a.metrics[0].measure = 'netIncome'; }],
    ['string value', a => { a.metrics[0].value = '-1320000'; }],
    ['consensus used as reported history', a => { a.metrics[2].role = 'consensus'; }, 1],
    ['house estimate used as reported history', a => { a.metrics[2].role = 'model'; }, 1],
    ['invalid calendar date', a => { a.metrics[2].period.end = a.metrics[2].period.end.slice(0, 4) + '-02-31'; }, 1],
    ['missing history cutoff', a => { a.asOf = undefined; }, 1],
    ['future history', a => { a.metrics.at(-1).period.end = '2099-12-31'; }, 1],
    ['null metric', a => { a.metrics[0] = null; }],
]) test(`Stories chart presentation rejects ${name}`, () => { const value = article(); mutate(value); assert.equal(adapt(value, index), null); });

test('zero is a real observation, not a missing bar or a fabricated nonzero rectangle', () => {
    const value = article(); value.metrics[1].value = 0;
    const geometry = staticChartGeometry(chartModel({ ...adapt(value), zeroBaseline: true }), { bars: true });
    assert.equal(geometry.columns[1].value, 0);
    assert.equal(geometry.columns[1].height, 0);
    assert.equal(geometry.columns[0].y, geometry.zeroY);
    assert.ok(geometry.columns[0].height > 0);
});

test('static lines break at explicit nulls and retain isolated observations', () => {
    const model = chartModel({ unit: { kind: 'percent' }, time: true,
        series: [{ key: 'margin', label: 'Marginal', source: 'reported' }],
        rows: [0, null, -10, 5].map((value, index) => ({ id: String(index), label: String(index), x: index, values: { margin: value } })) });
    const geometry = staticChartGeometry(model, { time: true });
    assert.equal(geometry.lines[0].dots.length, 3);
    assert.equal(geometry.lines[0].segments.length, 1);
    assert.equal(geometry.lines[0].dots[0].row.values.margin, 0);
});

test('different sources share a period but are grouped, never summed', () => {
    const model = chartModel({ unit: { kind: 'money', currency: 'SEK' }, zeroBaseline: true,
        series: ['consensus', 'model'].map(source => ({ key: source, label: source, source })),
        rows: [{ id: '2027', label: '2027E', values: { consensus: 100, model: 80 } }] });
    const geometry = staticChartGeometry(model, { bars: true });
    assert.deepEqual(geometry.columns.map(column => column.value), [100, 80]);
    assert.equal(geometry.columns[0].xPct + geometry.columns[0].widthPct, geometry.columns[1].xPct);
});

test('responsive axis labels wrap; complete labels remain in the value table', () => {
    assert.deepEqual(chartLabelLines('Rapportens jämförelsetal'), ['Rapportens', 'jämförelsetal']);
    assert.deepEqual(chartLabelLines('2025-12-31'), ['2025-12-31']);
    assert.equal(staticChartGeometry({ status: 'invalid' }), null);
    assert.equal(validStoryCharts(null), false);
});

const snapshotPath = process.env.OMXSUM_STORIES_CHART_SNAPSHOT;
test('every frozen real Studio candidate and saved draft uses the shared model without changing its facts', { skip: !snapshotPath }, () => {
    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')), before = structuredClone(snapshot);
    assert.equal(validStudioSnapshot(snapshot), true);
    let candidates = 0, savedCharts = 0;
    for (const pack of snapshot.packs) {
        const metrics = pack.evidence.facts.map(fact => ({ ...fact, key: fact.id, measure: fact.key?.replace(/\.previous$/, '') }));
        for (const candidate of pack.evidence.charts) {
            const chart = { ...candidate, basis: candidate.kind === 'line' ? 'history' : candidate.points.some(point => point.role === 'firm_contract') ? 'scale' : 'report_comparison',
                points: candidate.points.map(point => ({ label: point.label, metricKey: point.factId })) };
            const data = storyChartPresentation({ chart, metrics, asOf: pack.evidence.frozenAt });
            assert.ok(data, candidate.title);
            assert.equal(chartModel({ ...data, time: chart.kind === 'line', zeroBaseline: chart.kind === 'bar' }).status, 'ready');
            candidates++;
        }
        for (const run of pack.runs) if (run.projection?.article) for (const chart of run.projection.article.charts) {
            assert.ok(storyChartPresentation({ chart, metrics: run.projection.article.metrics, asOf: run.projection.article.asOf }));
            savedCharts++;
        }
    }
    assert.ok(candidates > 0);
    assert.deepEqual(snapshot, before);
    // Real output uses a stored projection envelope; no generation is run here.
    assert.ok(savedCharts > 0);
});
