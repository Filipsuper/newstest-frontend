// One presentation contract for rows and reader. Never rewrite legacy ranking
// inputs or combine another company's/measurement's percentage and chart.
const finite = value => typeof value === "number" && Number.isFinite(value) ? value : null;
export const reactionTime = value => {
  const result = typeof value === "string" ? Date.parse(value) : finite(value);
  return Number.isFinite(result) ? result : null;
};
export const REACTION_PERIODS = [
  ["m1", "1 min"], ["m5", "5 min"], ["m15", "15 min"], ["h1", "1 tim"],
  ["session_close", "Vid stängning"], ["next_session_close", "Nästa stängning"],
];
export function reactionV2For(story) {
  const value = story?.reactionV2;
  const published = story?.ts ?? reactionTime(story?.publishedAt);
  if (value?.schemaVersion !== 2 || value.storyId !== story.id
    || value.storyVersion !== (story.version ?? 1) || published === null
    || reactionTime(value.publishedAt) !== published || !Array.isArray(value.measurements)) return null;
  const symbols = new Set((story.companies ?? []).map(company => company.symbol));
  if (story.symbol) symbols.add(story.symbol);
  return { ...value, measurements: value.measurements.filter(item => item && symbols.has(item.symbol)) };
}
export function reactionPeriodLabel(key, measurement) {
  if (key === "session_close") return "Vid stängning";
  if (key === "next_session_close") return "Nästa handelsdags stängning";
  const length = REACTION_PERIODS.find(([value]) => value === key)?.[1] ?? "";
  const afterOpen = ["before_open", "after_close", "non_trading_day"].includes(measurement?.timing);
  return `${length} efter ${afterOpen ? "öppning" : "nyheten"}`;
}
export function completedReaction(window) {
  return window?.status === "complete" && finite(window.pct) !== null
    && reactionTime(window.targetAt) !== null && reactionTime(window.endpoint?.priceAt) !== null;
}
export function preferredReactionPeriod(measurement) {
  // Follow the newest completed observation, never the biggest percentage.
  // A pending period cannot hide an earlier completed measurement.
  const completed = [...REACTION_PERIODS].reverse().map(([key]) => key)
    .filter(key => completedReaction(measurement?.windows?.[key]))
    .sort((a, b) => reactionTime(measurement.windows[b].targetAt) - reactionTime(measurement.windows[a].targetAt));
  return completed[0] ?? REACTION_PERIODS.find(([key]) => measurement?.windows?.[key]?.status === "pending")?.[0] ?? "m1";
}
export function preferredVolumePeriod(measurement) {
  return ["m30", "m15", "m5"].find(key => {
    const post = measurement?.volume?.[key]?.post;
    return post?.status === "complete" && finite(post.volume) !== null && post.volume >= 0;
  }) ?? "m5";
}
export function reactionSeriesFor(measurement, period) {
  const window = measurement?.windows?.[period];
  if (measurement?.status !== "measured" || !measurement.baseline || reactionTime(window?.targetAt) === null) return null;
  const points = (measurement.series?.points ?? []).filter(point => point && reactionTime(point.t) !== null
    && reactionTime(point.t) <= reactionTime(window.targetAt)).sort((a, b) => reactionTime(a.t) - reactionTime(b.t));
  const last = points.filter(point => Number.isFinite(point.pct)).at(-1);
  if (completedReaction(window) && (!last || reactionTime(last.t) !== reactionTime(window.endpoint.priceAt)
    || Math.abs(last.pct - window.pct) > 1e-8)) return null;
  return { points };
}
export function rowReaction(story) {
  const v2 = reactionV2For(story);
  if (!v2) return { version: 1, pct: finite(story.reaction?.pct), label: "Sedan publicering" };
  const symbol = story.symbol ?? story.companies?.[0]?.symbol;
  const measurement = v2.measurements.find(item => item.symbol === symbol);
  const key = preferredReactionPeriod(measurement);
  const window = measurement?.windows?.[key];
  return { version: 2, pct: measurement?.status === "measured" && completedReaction(window) ? window.pct : null,
    label: reactionPeriodLabel(key, measurement), measurement, period: key,
    status: measurement?.status === "waiting_for_session" ? "Inväntar börsöppning"
      : window?.status === "pending" ? "Inväntar mätperiod" : "Kursdata saknas" };
}
export function retainReactionV2(previous, next) {
  if (previous?.id !== next?.id || (previous?.version ?? 1) !== (next?.version ?? 1)
    || reactionTime(previous?.ts ?? previous?.publishedAt) !== reactionTime(next?.ts ?? next?.publishedAt)) return next?.reactionV2;
  const before = reactionV2For(previous), after = reactionV2For(next);
  if (before && (!after || (reactionTime(after.asOf) ?? 0) < (reactionTime(before.asOf) ?? 0))) return before;
  return next?.reactionV2;
}
export function reactionStatus(status) {
  return ({ pending: "Mätperioden pågår", waiting_for_session: "Inväntar börsöppning",
    missing_baseline: "Kurs före nyheten saknas", missing_price: "Kursdata saknas för perioden",
    stale_price: "Kursdata är för gammal för mätningen", outside_session: "Perioden går utanför börsdagen",
    incomplete_coverage: "Minutdata saknas för delar av perioden", unsupported_market: "Mätningen stöder inte denna marknadsplats ännu",
    calendar_out_of_coverage: "Handelskalender saknas för perioden", instrument_identity_mismatch: "Bolagskopplingen behöver kontrolleras",
    retracted: "Nyheten är återkallad", unavailable: "Mätningen är inte tillgänglig" })[status] ?? "Mätningen är inte tillgänglig";
}
