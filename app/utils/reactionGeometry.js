import { finiteNumber } from "./newsroom.js";

export function reactionGeometry(
  series,
  publishedAt,
  width = 640,
  height = 220,
) {
  const samples = (series?.points ?? [])
    .map((point) => ({
      t: finiteNumber(point.t),
      pct: finiteNumber(point.pct),
    }))
    .filter((point) => point.t !== null)
    .sort((a, b) => a.t - b.t);
  const points = samples.filter((point) => point.pct !== null);
  if (points.length < 3 || points.at(-1).t <= points[0].t) return null;
  const published = new Date(publishedAt).getTime();
  const min = Math.min(0, ...points.map((point) => point.pct));
  const max = Math.max(0, ...points.map((point) => point.pct));
  const span = Math.max(max - min, 0.5);
  const x = (t) =>
    44 + ((t - points[0].t) / (points.at(-1).t - points[0].t)) * (width - 60);
  const y = (pct) =>
    30 + ((max + span * 0.1 - pct) / (span * 1.2)) * (height - 60);
  const segments = [];
  let segment = [];
  for (const sample of samples) {
    if (sample.pct === null) {
      if (segment.length) segments.push(segment);
      segment = [];
    } else segment.push(sample);
  }
  if (segment.length) segments.push(segment);
  const line = (rows) =>
    rows
      .map(
        (point, index) =>
          `${index ? "L" : "M"}${x(point.t).toFixed(2)},${y(point.pct).toFixed(2)}`,
      )
      .join(" ");
  const path = segments.map(line).join(" ");
  return {
    points,
    width,
    height,
    min,
    max,
    x,
    y,
    zero: y(0),
    path,
    area: segments
      .map(
        (rows) =>
          `${line(rows)} L${x(rows.at(-1).t)},${y(0)} L${x(rows[0].t)},${y(0)} Z`,
      )
      .join(" "),
    marker:
      published >= points[0].t && published <= points.at(-1).t
        ? x(published)
        : null,
  };
}
