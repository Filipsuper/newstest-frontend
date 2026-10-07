// Reader charts reference the article's checked metrics, never a second series.
import { validStoryMetricValue } from './storyMetricValues.js';
import { storyTextDateDisplay } from './storyDateDisplay.js';
const units = new Set(['money', 'money_per_share', 'shares', 'months', 'units', 'percent']);
const finiteDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export function storyChartPoints(chart, metrics) {
    const byKey = new Map(metrics.map(metric => [metric.key, metric]));
    return chart.points.map(point => ({ ...point, metric: byKey.get(point.metricKey) }));
}

export function validStoryCharts(article) {
    if (!article || !Array.isArray(article.charts) || article.charts.length > 2 || !Array.isArray(article.metrics)
        || article.metrics.some(metric => !metric || typeof metric.key !== 'string')) return false;
    const metrics = new Map(article.metrics.map(metric => [metric.key, metric]));
    if (metrics.size !== article.metrics.length) return false;
    const ids = new Set();
    for (const chart of article.charts) {
        if (!chart || !/^chart_[a-f0-9]{24}$/.test(chart.id) || ids.has(chart.id)
            || !['bar', 'line'].includes(chart.kind) || !['history', 'report_comparison', 'scale'].includes(chart.basis)
            || typeof chart.title !== 'string' || !chart.title.trim() || chart.title.length > 160
            || typeof chart.note !== 'string' || !chart.note.trim() || chart.note.length > 500
            || !units.has(chart.unit) || !Array.isArray(chart.points) || chart.points.length < 2 || chart.points.length > 4
            || new Set(chart.points.map(point => point?.metricKey)).size !== chart.points.length) return false;
        ids.add(chart.id);
        const rows = [];
        for (const point of chart.points) {
            const metric = metrics.get(point?.metricKey);
            if (!metric || !Number.isFinite(metric.value) || metric.unit !== chart.unit || metric.currency !== chart.currency
                || typeof point.label !== 'string' || !point.label.trim() || point.label.length > 120
                || Object.keys(point).some(key => !['label', 'metricKey'].includes(key))) return false;
            rows.push(metric);
        }
        if (rows.some(metric => typeof metric.measure !== 'string' || !/^[A-Za-z0-9_.]{1,80}$/.test(metric.measure))
            || (chart.basis !== 'scale' && new Set(rows.map(metric => metric.measure)).size !== 1)) return false;
        if (chart.basis === 'history') {
            const ends = rows.map(metric => metric.period?.end);
            if (!Number.isFinite(Date.parse(article.asOf)) || chart.kind !== 'line' || rows.length < 3 || rows.some(metric => metric.role !== 'historical_reported'
                || metric.period?.basis !== 'reported' || metric.period?.frequency !== 'annual' || !finiteDate(metric.period?.end)
                || Date.parse(metric.period.end) > Date.parse(article.asOf) || Date.parse(metric.period.end) < Date.parse(article.asOf) - 3660 * 86400000)
                || new Set(ends).size !== ends.length || ends.some((end, index) => index && end <= ends[index - 1])) return false;
        } else if (chart.basis === 'report_comparison') {
            if (chart.kind !== 'bar' || rows.length !== 2 || rows[0].role !== 'reported_comparison' || rows[1].role !== 'reported_current') return false;
        } else {
            const end = rows[1]?.period?.end;
            const age = Date.parse(article.asOf) - Date.parse(end);
            if (chart.kind !== 'bar' || rows.length !== 2 || rows[0].role !== 'firm_contract'
                || rows[1].role !== 'historical_reported' || rows[1].measure !== 'revenue' || rows[1].period?.frequency !== 'annual'
                || rows[1].period?.basis !== 'reported' || rows[1].value <= 0 || !finiteDate(end)
                || !Number.isFinite(age) || age < 0 || age > 550 * 86400000) return false;
        }
    }
    return true;
}

/** Presentation adapter only. No price lookup, forecast fetching or new facts.
 * The chart must still satisfy the existing article role/measure/period gate. */
export function storyChartPresentation({ chart, metrics, asOf }) {
    if (!validStoryCharts({ charts: [chart], metrics, asOf })) return null;
    const points = storyChartPoints(chart, metrics);
    if (points.some(point => !validStoryMetricValue(point.metric))) return null;
    const unit = chart.unit === 'money' ? { kind: 'money', currency: chart.currency }
        : chart.unit === 'money_per_share' ? { kind: 'perShare', currency: chart.currency }
        : chart.unit === 'percent' ? { kind: 'percent' }
        : { kind: 'number', label: { shares: 'aktier', months: 'månader', units: 'enheter' }[chart.unit] };
    return { title: chart.title, note: chart.note, unit,
        meta: chart.basis === 'history' ? 'Rapporterad historik · helår'
            : chart.basis === 'scale' ? 'Storleksjämförelse · inte en intäktsprognos' : 'Rapporterat · samma mått och valuta',
        series: [{ key: 'reported', source: 'reported', label: chart.basis === 'scale' ? 'Källbelagda värden' : 'Rapporterat' }],
        rows: points.map(point => ({ id: point.metricKey, label: storyTextDateDisplay(point.label),
            ...(chart.kind === 'line' ? { x: Date.parse(point.metric.period.end) } : {}),
            values: { reported: point.metric.value } })),
    };
}
