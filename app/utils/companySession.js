// Mutable company/session observations are not historical event outcomes.
// This contract is separate from marketContext (editorial ranking) and v2 replay.
const finite = value => typeof value === "number" && Number.isFinite(value);
const time = value => typeof value === "string" ? Date.parse(value) : finite(value) ? value : NaN;
const day = value => new Date(value).toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
const symbols = story => new Set([story?.symbol, ...(story?.companies ?? []).map(company => company.symbol)].filter(Boolean));
const published = story => time(story?.ts ?? story?.publishedAt);
const usable = field => field?.status === "available" && finite(field.value);

export function companyContextFor(story) {
  const value = story?.companyContext;
  if ((story?.status && !["flash", "update"].includes(story.status))
    || value?.schemaVersion !== 1 || value.scope !== "session_context"
    || value.storyId !== story.id || value.storyVersion !== (story.version ?? 1)
    || !Number.isFinite(published(story)) || time(value.publishedAt) !== published(story)
    || !Number.isFinite(time(value.asOf)) || !Array.isArray(value.companies)) return null;
  const allowed = symbols(story);
  const companies = value.companies.filter(company => allowed.has(company?.symbol));
  if (new Set(companies.map(company => company.symbol)).size !== companies.length) return null;
  return { ...value, companies };
}

export function companySessionFor(story, symbol = story?.symbol ?? story?.companies?.[0]?.symbol, now = Date.now()) {
  const data = companyContextFor(story);
  const company = data?.companies.find(company => company.symbol === symbol);
  const session = company?.session;
  const open = time(session?.open), close = time(session?.close);
  const asOf = time(company?.asOf), validUntil = time(company?.validUntil);
  if (!company || !symbols(story).has(symbol) || time(data.asOf) > now
    || !Number.isFinite(asOf) || asOf > time(data.asOf) || asOf > now
    || !Number.isFinite(validUntil) || validUntil <= close
    || session?.exchange !== "XSTO" || !session.calendarVersion
    || !Number.isFinite(open) || !Number.isFinite(close) || open >= close
    || day(open) !== session.date || day(close) !== session.date
    || !["event_session", "later_session", "before_event_session"].includes(company.relationship)) return null;
  const fields = {};
  for (const key of ["price", "previousClose", "changePct", "dayVolume", "dailyRvol", "rvolAtTime"]) {
    const field = company.fields?.[key];
    const at = time(field?.at);
    let reason = field?.reason;
    let status = field?.status ?? "missing";
    if (usable(field)) {
      if (!Number.isFinite(at) || at > now || at > asOf || !field.source
        || (key !== "previousClose" && (at < open || at > close))
        || (["price", "previousClose"].includes(key) && field.value <= 0)
        || (["dayVolume", "dailyRvol", "rvolAtTime"].includes(key) && field.value < 0)) {
        status = "unavailable"; reason = "invalid_observation";
      } else if (now >= validUntil) {
        status = "stale"; reason = "session_outdated";
      } else if (key !== "previousClose" && Math.min(now, close) - at > 15 * 60_000) {
        status = "stale"; reason = "stale_observation";
      }
    } else if (status === "available") status = "unavailable";
    fields[key] = { ...field, at: Number.isFinite(at) ? at : null, status, reason,
      value: status === "available" && usable(field) ? field.value : null };
  }
  if (usable(fields.changePct) && (!usable(fields.price) || !usable(fields.previousClose)
    || fields.previousClose.sessionDate >= session.date || !fields.previousClose.sessionDate
    || fields.changePct.at !== fields.price.at
    || Math.abs((fields.price.value / fields.previousClose.value - 1) * 100 - fields.changePct.value) > 1e-6)) {
    fields.changePct = { ...fields.changePct, status: "unavailable", value: null, reason: "inconsistent_price_pair" };
  }
  for (const key of ["dailyRvol", "rvolAtTime"]) {
    const count = company[key === "dailyRvol" ? "dailyVolumeSessionCount" : "baselineSessionCount"];
    const baselineValid = Number.isInteger(count) && count >= (key === "dailyRvol" ? 20 : 5) && count <= 20
      && (key !== "dailyRvol" || company.dailyVolumeBaselineMature === true);
    if (usable(fields[key]) && (!usable(fields.dayVolume) || fields[key].at !== fields.dayVolume.at || !baselineValid)) {
      fields[key] = { ...fields[key], status: "unavailable", value: null, reason: "inconsistent_volume_pair" };
    }
  }
  return { ...company, fields,
    baselineMature: company.baselineMature === true && company.baselineSessionCount === 20,
    dailyVolumeBaselineMature: company.dailyVolumeBaselineMature === true && company.dailyVolumeSessionCount === 20 };
}

export function sessionDateLabel(company, now = Date.now()) {
  const date = company?.session?.date;
  if (!date) return "Handelsdag saknas";
  return date === day(now) ? "Idag" : new Intl.DateTimeFormat("sv-SE", {
    day: "numeric", month: "short", timeZone: "Europe/Stockholm",
  }).format(new Date(company.session.open));
}

export function sessionPricePreferred(company, eventPct) {
  return company?.relationship === "event_session" && usable(company.fields?.changePct)
    && (["before_open", "after_close", "non_trading_day"].includes(company.timing)
      || (company.timing === "during_session" && !finite(eventPct)));
}

export function retainCompanyContext(previous, next) {
  const after = companyContextFor(next);
  if (previous?.id !== next?.id || (previous?.version ?? 1) !== (next?.version ?? 1)
    || published(previous) !== published(next)) return after;
  const before = companyContextFor(previous);
  // Absent optional enrichment may be a timeout. Explicit null clears it;
  // field-level freshness is rechecked on display even when retained.
  if (before && (next.companyContext === undefined || (after && time(after.asOf) < time(before.asOf)))) return before;
  return after;
}
