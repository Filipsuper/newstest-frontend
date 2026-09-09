// Fictional chart observations, exclusively for previews and integration tests.
export function previewStockChart(story, symbol, { date = "2026-09-08", source = "live_ticks", price = 100, change = 4.2, status = "available" } = {}) {
  const open = Date.parse(`${date}T07:00:00Z`), close = Date.parse(`${date}T15:30:00Z`);
  const points = status === "available" ? [0, 1, 4, 10, 23, 65, 123, 174, 200, 285, 333, 401, 460, 500, 510].map((minute, index) => ({
    t: open + minute * 60_000,
    price: price * (1 + (change * minute / 510 + (index === 14 ? 0 : Math.sin(index * 1.7) * 0.8)) / 100),
  })) : [];
  return { schemaVersion: 1, scope: "stock_price", storyId: story.id, storyVersion: story.version ?? 1,
    symbol, publishedAt: Date.parse(story.publishedAt), status,
    session: { date, open, close, calendarVersion: "fixture-xsto-2026", exchange: "XSTO" },
    range: { start: open, end: close }, source, resolution: source === "live_ticks" ? "tick" : "1m",
    points, asOf: close + 5 * 60_000, observedAt: points.at(-1)?.t ?? null, currency: "SEK" };
}
