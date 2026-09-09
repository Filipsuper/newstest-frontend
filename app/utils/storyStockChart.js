const time = value => typeof value === "number" ? value : typeof value === "string" ? Date.parse(value) : NaN;
const allowed = story => new Set([story?.symbol, ...(story?.companies ?? []).map(company => company.symbol)].filter(Boolean));

// Scope validation is shared by the reader and OG. Absolute stock prices are
// display context, not the percentage or baseline of an archived news outcome.
// Only server read metadata gets clock-skew tolerance; actual prices stay <= now.
export function storyStockChartFor(story, symbol, chart, now = Date.now()) {
  const published = time(story?.ts ?? story?.publishedAt);
  if (!allowed(story).has(symbol) || chart?.schemaVersion !== 1 || chart.scope !== "stock_price"
    || chart.storyId !== story.id || chart.storyVersion !== (story.version ?? 1)
    || chart.symbol !== symbol || !Number.isFinite(published) || time(chart.publishedAt) !== published
    || !Number.isFinite(time(chart.asOf)) || time(chart.asOf) > now + 60_000
    || !["available", "pending", "unavailable"].includes(chart.status)) return null;
  if (chart.status !== "available") return { ...chart, points: [] };
  const open = time(chart.session?.open), close = time(chart.session?.close);
  if (chart.session?.exchange !== "XSTO" || !chart.session.calendarVersion
    || !Number.isFinite(open) || !Number.isFinite(close) || close <= open
    || !["live_ticks", "minute_bars", "reaction_v2_market"].includes(chart.source)
    || chart.resolution !== (chart.source === "live_ticks" ? "tick" : "1m")
    || !Array.isArray(chart.points) || !chart.points.length || chart.points.length > 600) return null;
  const sessionDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm" }).format(open);
  if (chart.session.date !== sessionDate || new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm" }).format(close) !== sessionDate
    || published >= close || time(chart.range?.start) !== open || time(chart.range?.end) !== close
    || (chart.source === "live_ticks" && open < now - 7 * 86_400_000)) return null;
  const points = chart.points.map(point => ({ t: time(point?.t), price: point?.price }));
  if (points.some((point, i) => !Number.isFinite(point.t) || point.t < open || point.t > Math.min(close, now, time(chart.asOf))
    || typeof point.price !== "number" || !Number.isFinite(point.price) || point.price <= 0
    || (i > 0 && point.t <= points[i - 1].t))
    || time(chart.observedAt) !== points.at(-1).t) return null;
  return { ...chart, points };
}
