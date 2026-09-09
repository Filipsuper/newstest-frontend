// Display-only geometry for actual stock prices. Never an event-return input.
const finite = value => typeof value === "number" && Number.isFinite(value);
const time = value => typeof value === "string" ? Date.parse(value) : finite(value) ? value : NaN;

export const stockChartSourceLabel = chart => chart?.source === "live_ticks"
  ? "Tickdata" : ["reaction_v2_market", "minute_bars"].includes(chart?.source) ? "1 min" : null;

export function stockChartPriceLabel(value, span = 0) {
  if (!finite(value)) return "Saknas";
  if (value !== 0 && (Math.abs(value) < 0.000001 || Math.abs(value) >= 1_000_000_000)) {
    return value.toLocaleString("sv-SE", { notation: "scientific", maximumFractionDigits: 2 });
  }
  const precision = Math.min(8, Math.max(2, Math.ceil(-Math.log10(span > 0 ? span : Math.abs(value) || 1)) + 1));
  return value.toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: precision });
}

export function stockChartGeometry(chart, width = 640, height = 220, now = Date.now()) {
  if (chart?.schemaVersion !== 1 || chart.scope !== "stock_price" || chart.status !== "available"
    || !Array.isArray(chart.points) || !finite(width) || width <= 32 || !finite(height) || height <= 80
    || !finite(now)) return null;
  const open = time(chart.session?.open), close = time(chart.session?.close);
  const asOf = time(chart.asOf), observedAt = time(chart.observedAt);
  // Read metadata may reflect a slightly faster server clock, never future trades.
  if (![open, close, asOf, observedAt].every(Number.isFinite) || open >= close
    || asOf > now + 60_000 || observedAt > now || observedAt > asOf || observedAt < open || observedAt > close) return null;

  const ordered = chart.points.map(point => ({ t: time(point?.t), price: point?.price }))
    .filter(point => Number.isFinite(point.t) && finite(point.price) && point.price > 0
      && point.t >= open && point.t <= Math.min(observedAt, now))
    .sort((a, b) => a.t - b.t);
  // Do not invent a vertical trade when two different prices claim one instant.
  // Identical duplicates collapse; conflicting instants have no chosen price.
  const unique = [];
  for (const point of ordered) {
    const previous = unique.at(-1);
    if (previous?.t === point.t) {
      if (previous.price !== point.price) previous.price = null;
    } else unique.push({ ...point });
  }
  const points = unique.filter(point => point.price !== null);
  if (!points.length || points.at(-1).t !== observedAt) return null;

  const min = Math.min(...points.map(point => point.price));
  const max = Math.max(...points.map(point => point.price));
  const padding = max > min ? (max - min) * 0.12 : max * 0.02;
  const lower = Math.max(min - padding, min / 2);
  const upper = max + padding;
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower <= 0 || upper <= lower) return null;
  const plot = { left: 8, right: width - 8, top: 28, bottom: height - 16 };
  // Session-open spacing retains genuine empty time before the first trade.
  // Padding only an opening instant prevents division by zero, not fake prices.
  const start = open;
  const end = observedAt > open ? observedAt : Math.min(close, open + 60_000);
  const x = value => plot.left + (value - start) / (end - start) * (plot.right - plot.left);
  const y = value => plot.bottom - (value - lower) / (upper - lower) * (plot.bottom - plot.top);
  const path = points.map((point, index) => `${index ? "L" : "M"}${x(point.t).toFixed(2)},${y(point.price).toFixed(2)}`).join(" ");
  const published = time(chart.publishedAt);
  const marker = Number.isFinite(published) && published < open
    ? { kind: "before_open", x: plot.left, t: published, label: "Nyhet före öppning" }
    : Number.isFinite(published) && published >= open && published <= observedAt
      ? { kind: "publication", x: x(published), t: published, label: "Nyhet" } : null;
  return {
    points, width, height, plot, start, end, min, max, lower, upper, x, y, path, marker,
    // The fill closes at the plot edge, not at a synthetic zero-price baseline.
    area: points.length > 1 ? `${path} L${x(points.at(-1).t).toFixed(2)},${plot.bottom} L${x(points[0].t).toFixed(2)},${plot.bottom} Z` : "",
    singlePoint: points.length === 1 ? { ...points[0], x: x(points[0].t), y: y(points[0].price) } : null,
    ticks: [upper, lower + (upper - lower) / 2, lower].map(value => ({ value, y: y(value), label: stockChartPriceLabel(value, upper - lower) })),
  };
}
