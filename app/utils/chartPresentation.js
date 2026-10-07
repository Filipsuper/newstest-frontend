// Presentation only. Feature adapters still qualify currency, fiscal frequency,
// accounting basis, estimate freshness and publication eligibility before use.
export const CHART_SOURCES = {
  reported: { label: 'Rapporterat', dash: undefined },
  consensus: { label: 'Analytikerkonsensus', dash: '7 4' },
  model: { label: 'OMXsum-estimat', dash: '2 4' },
};
export const chartColor = index => `var(--ui-chart-${index + 1})`;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const number = (value, digits = 2) => new Intl.NumberFormat('sv-SE', { maximumFractionDigits: digits }).format(value);
const exactNumber = value => new Intl.NumberFormat('sv-SE', { maximumSignificantDigits: 17 }).format(value);

/** No coercion, zero-fill, interpolation or inference of an estimate. */
export function chartModel({ rows, series, unit, time = false, zeroBaseline = false }) {
  const invalid = { status: 'invalid', rows: [], series: [] };
  if (!Array.isArray(rows) || !Array.isArray(series) || !series.length || series.length > 6
    || !['money', 'perShare', 'percent', 'number', 'multiple'].includes(unit?.kind)
    || (['money', 'perShare'].includes(unit.kind) && !/^[A-Z]{3}$/.test(unit.currency ?? ''))
    || series.some(s => !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s?.key ?? '')
      || ['x', 'id', 'label', 'values'].includes(s.key) || !s.label || !Object.hasOwn(CHART_SOURCES, s.source))
    || new Set(series.map(s => s.key)).size !== series.length
    || rows.some(row => !row?.id || !row.label || !row.values || (time && !finite(row.x)))
    || new Set(rows.map(row => row.id)).size !== rows.length
    || (time && new Set(rows.map(row => row.x)).size !== rows.length)) return invalid;
  const normalized = rows.map(row => ({ ...row, values: Object.fromEntries(series.map(s => [s.key,
    finite(row.values[s.key]) ? row.values[s.key] : null])) }));
  if (time) normalized.sort((a, b) => a.x - b.x);
  const values = normalized.flatMap(row => Object.values(row.values)).filter(finite);
  if (!values.length) return { status: 'empty', rows: normalized, series };
  const largest = Math.max(...values.map(Math.abs));
  const scale = unit.kind === 'money' || unit.kind === 'number'
    ? largest >= 1e9 ? 1e9 : largest >= 1e6 ? 1e6 : largest >= 1e3 ? 1e3 : 1 : 1;
  const prefix = scale === 1e9 ? 'md ' : scale === 1e6 ? 'M ' : scale === 1e3 ? 't ' : '';
  const suffix = unit.kind === 'percent' ? '%' : unit.kind === 'multiple' ? '×'
    : unit.kind === 'perShare' ? `${unit.currency}/aktie` : unit.kind === 'money' ? unit.currency : unit.label ?? '';
  const minimum = Math.min(...values), maximum = Math.max(...values);
  const pad = (maximum - minimum || Math.abs(maximum) || 1) * .12;
  const domain = zeroBaseline ? [Math.min(0, minimum), Math.max(0, maximum)] : [minimum - pad, maximum + pad];
  if (domain[0] === domain[1]) domain[1] += 1;
  const sourceColors = { reported: 0, consensus: 1, model: 2 };
  const uniqueSources = new Set(series.map(s => s.source)).size === series.length;
  return { status: 'ready', rows: normalized, series: series.map((s, index) => ({ ...s, color: chartColor(uniqueSources ? sourceColors[s.source] : index) })),
    scale, domain, unitLabel: `${prefix}${suffix}`.trim(), exactUnitLabel: suffix,
    format: value => finite(value) ? `${number(value / scale)} ${prefix}${suffix}`.trim() : 'Saknas',
    formatExact: value => finite(value) ? `${exactNumber(value)} ${suffix}`.trim() : 'Saknas',
    tick: value => number(value, 1),
    plotted: normalized.map(row => ({ ...row, ...Object.fromEntries(series.map(s => [s.key,
      row.values[s.key] === null ? null : row.values[s.key] / scale])) })),
  };
}

/** Adapt the existing qualified estimate view, without changing precedence. */
export function estimateChartModel(view) {
  const sources = ['reported', 'consensus', 'model'].filter(source => view.bars.some(row => row.source === source));
  const series = sources.map(source => {
    const labels = [...new Set(view.bars.filter(row => row.source === source).map(row => row.sourceLabel).filter(Boolean))];
    return { key: source, source, label: labels.length === 1 ? labels[0] : CHART_SOURCES[source].label };
  });
  return { series, unit: { kind: view.metric === 'eps' ? 'perShare' : 'money', currency: view.currency },
    rows: view.bars.map(row => ({ id: row.period.key, label: row.label,
      values: Object.fromEntries(sources.map(source => [source, row.source === source ? row.value : null])) })),
  };
}

/** Qualified shares only; a partial list is not quietly rescaled to 100%. */
export function distributionModel(items) {
  if (!Array.isArray(items) || !items.length || items.some(item => !item?.key || !item.label
    || !finite(item.sharePct) || item.sharePct < 0 || item.sharePct > 100)
    || new Set(items.map(item => item.key)).size !== items.length
    || items.reduce((total, item) => total + item.sharePct, 0) > 100.1) return null;
  return items.map((item, index) => ({ ...item, color: items.length <= 6 ? chartColor(index) : null }));
}
