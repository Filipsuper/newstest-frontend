// Shared SVG layout for article charts. X is a percentage of the responsive
// viewport; Y is in pixels, so labels keep their size even on a narrow phone.
export function staticChartGeometry(model, { bars = false, time = false, forecastStep = null } = {}) {
  if (model.status !== 'ready') return null;
  const left = 16, right = 96, top = 16, bottom = 168;
  const [min, max] = model.domain;
  const y = value => bottom - (value - min) / (max - min) * (bottom - top);
  const first = model.rows[0].x, last = model.rows.at(-1).x;
  const x = (row, index) => time
    ? first === last ? (left + right) / 2 : left + (row.x - first) / (last - first) * (right - left)
    : left + (index + .5) / model.rows.length * (right - left);
  const ticks = Array.from({ length: 4 }, (_, index) => {
    const value = min + (max - min) * index / 3;
    return { value, y: y(value), label: model.tick(value / model.scale) };
  });
  const rows = model.rows.map((row, index) => ({ ...row, xPct: x(row, index) }));
  const exclusive = bars && rows.every(row => Object.values(row.values).filter(value => value !== null).length <= 1);
  const slot = (right - left) / rows.length * .55;
  const columns = bars ? rows.flatMap(row => model.series.flatMap((series, index) => {
    const value = row.values[series.key];
    if (value === null) return [];
    const widthPct = slot / (exclusive ? 1 : model.series.length);
    return [{ row, series, value, widthPct,
      xPct: row.xPct - slot / 2 + (exclusive ? 0 : index * widthPct),
      y: Math.min(y(0), y(value)), height: Math.abs(y(value) - y(0)) }];
  })) : [];
  const lines = bars ? [] : model.series.map(series => {
    // Only explicit null observations break a line; absent dates are never
    // synthesized or shown as zero. Irregular dates retain their real spacing.
    const dots = rows.filter(row => row.values[series.key] !== null)
      .map(row => ({ row, xPct: row.xPct, y: y(row.values[series.key]) }));
    const segments = rows.slice(1).flatMap((row, index) => {
      const previous = rows[index];
      if (row.values[series.key] === null || previous.values[series.key] === null) return [];
      return [{ x1: previous.xPct, y1: y(previous.values[series.key]), x2: row.xPct, y2: y(row.values[series.key]) }];
    });
    return { series, dots, segments };
  });
  // Opt-in for a qualified one-source-per-period fiscal forecast. Connect a
  // source transition with the destination's forecast style, never across a
  // missing period/value, backwards into actuals, or between grouped scenarios.
  const transitions = !bars && time && forecastStep > 0 ? rows.slice(1).flatMap((row, index) => {
    const previous = rows[index], currentSources = model.series.filter(series => row.values[series.key] !== null);
    const previousSources = model.series.filter(series => previous.values[series.key] !== null);
    if (currentSources.length !== 1 || previousSources.length !== 1 || row.x - previous.x !== forecastStep
      || currentSources[0].source === 'reported' || currentSources[0].key === previousSources[0].key) return [];
    return [{ series: currentSources[0], x1: previous.xPct, y1: y(previous.values[previousSources[0].key]), x2: row.xPct, y2: y(row.values[currentSources[0].key]) }];
  }) : [];
  return { left, right, top, bottom, ticks, rows, columns, lines, transitions,
    zeroY: min <= 0 && max >= 0 ? y(0) : null };
}

export function chartLabelLines(label) {
  const words = String(label).split(/\s+/), lines = [];
  for (const word of words) {
    if (lines.length && `${lines.at(-1)} ${word}`.length <= 18) lines[lines.length - 1] += ` ${word}`;
    else lines.push(word);
  }
  return lines.length <= 3 ? lines : [...lines.slice(0, 2), `${lines[2]}…`];
}
