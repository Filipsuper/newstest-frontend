// Fictional, fixed-date UI examples. Never imported by a real news feed.
import { previewStockChart } from "./chartFixtures.js";
const minute = 60_000;
const iso = value => new Date(value).toISOString();
export const SESSION_PREVIEW_NOW = "2026-09-09T16:00:00Z";
const close = Date.parse("2026-09-09T15:30:00Z");
const asOf = close + 5 * minute;
const missing = reason => ({ status: "missing", value: null, at: null, source: null, reason });
const field = (value, at = close) => ({ status: "available", value, at, source: "Fiktiv marknadskälla" });

function sessionCompany(symbol, { pct = 10, rvol = 2, timing = "during_session", relationship = "event_session" } = {}) {
  return {
    symbol, currency: "SEK", timing, relationship, asOf,
    validUntil: Date.parse("2026-09-10T07:00:00Z"),
    session: { date: "2026-09-09", open: "2026-09-09T07:00:00Z", close: iso(close), exchange: "XSTO", calendarVersion: "fixture-xsto-2026" },
    baselineSessionCount: 20, baselineMature: true,
    dailyVolumeSessionCount: 20, dailyVolumeBaselineMature: true,
    fields: {
      price: field(10 * (1 + pct / 100)),
      previousClose: { ...field(10, Date.parse("2026-09-08T15:30:00Z")), sessionDate: "2026-09-08", adjustmentBasis: "unknown" },
      changePct: field(pct), dayVolume: field(250_000 * rvol), dailyRvol: field(rvol), rvolAtTime: field(rvol),
    },
  };
}

function eventMeasurement(symbol, anchorAt, { pct = 4.2, unavailable = false, timing = "during_session" } = {}) {
  const anchor = Date.parse(anchorAt);
  const date = anchorAt.slice(0, 10);
  const afterOpen = timing === "before_open";
  return {
    symbol, status: unavailable ? "missing_baseline" : "measured", timing,
    anchorAt, asOf: iso(anchor + 65 * minute),
    session: { date, open: `${date}T07:00:00Z`, close: `${date}T15:30:00Z` },
    baseline: unavailable ? null : { price: 100, priceAt: anchorAt, kind: "pre_publication_minute_close", source: "Fiktiv minutkälla" },
    windows: {
      h1: { status: unavailable ? "missing_baseline" : "complete", pct: unavailable ? null : pct,
        targetAt: iso(anchor + 60 * minute), endpoint: unavailable ? null : { price: 100 + pct, priceAt: iso(anchor + 60 * minute) } },
    },
    // Archived measurement coverage remains independent of the stock chart.
    series: { points: unavailable ? [] : [
      { t: anchor, pct: 0 }, { t: anchor + minute, pct: null },
      { t: anchor + 30 * minute, pct: pct / 2 }, { t: anchor + 31 * minute, pct: null },
      { t: anchor + 60 * minute, pct },
    ] },
    volume: {
      m30: {
        post: { status: unavailable ? "incomplete_coverage" : "complete", start: anchorAt, end: iso(anchor + 30 * minute),
          volume: unavailable ? null : 180_000, expectedBars: 30, observedBars: unavailable ? 12 : 30 },
        pre: { status: afterOpen ? "outside_session" : "complete", start: iso(anchor - 30 * minute), end: anchorAt, volume: afterOpen ? null : 90_000 },
        relativeToNormal: unavailable ? null : 2.4, beforeAfterRatio: unavailable || afterOpen ? null : 2,
        referenceVolume: 75_000, baselineSessionCount: 20, baselineMature: true,
      },
    },
  };
}

export function sessionPreviewStories() {
  const scenarios = [
    ["premarket", "Liten Verkstad", "LITEN.TEST", "Order klockan 06:35 — dagskursen finns trots saknad minutbaslinje", "2026-09-09T04:35:00Z"],
    ["during", "Norden Industri", "NORD.TEST", "Prognoshöjning under handeln — nyhetsreaktion och dagsrörelse skiljer sig", "2026-09-09T08:00:00Z"],
    ["volume-only", "Fjäll Energi", "FJALL.TEST", "Ny order — volymen finns men kursuppgifterna saknas", "2026-09-09T09:00:00Z"],
    ["multi", "Norden Industri", "NORD.TEST", "Gemensamt avtal före öppning — två bolag med olika handelsdagar", "2026-09-09T06:00:00Z"],
    ["older", "Skärgården Teknik", "SKAR.TEST", "Förra veckans rapport — sparade minutkurser och oförändrad nyhetsreaktion", "2026-09-01T08:00:00Z"],
  ];
  return scenarios.map(([key, name, symbol, headline, publishedAt]) => {
    const beforeOpen = ["premarket", "multi"].includes(key);
    const timing = beforeOpen ? "before_open" : "during_session";
    const unavailable = beforeOpen || key === "volume-only";
    const story = {
      id: `session-preview-${key}`, eventId: `session-preview-event-${key}`, version: 1, status: "flash",
      headline, publishedAt, companies: [{ name, symbol }], tags: ["ORDER"],
      primarySource: { name: "Fiktiv källa", sourceKind: "issuer_release", url: "https://example.com/fictional-session" },
      aiSummary: { text: "Fiktiv AI-sammanfattning för att granska hur handelsdag, nyhetsreaktion och volym presenteras. Detta är inte en verklig nyhet.", bullets: [] },
      reaction: { pct: 99 }, // Must never leak into a valid v2 presentation.
    };
    const companies = [sessionCompany(symbol, {
      timing, relationship: key === "older" ? "later_session" : "event_session", rvol: key === "volume-only" ? 1.8 : 2,
    })];
    if (key === "volume-only") for (const fieldName of ["price", "previousClose", "changePct"]) {
      companies[0].fields[fieldName] = missing("price_source_unavailable");
    }
    const anchorAt = beforeOpen ? "2026-09-09T07:00:00Z" : publishedAt;
    const measurements = [eventMeasurement(symbol, anchorAt, { timing, unavailable })];
    if (key === "multi") {
      story.companies.push({ name: "Skärgården Teknik", symbol: "SKAR.TEST" });
      companies.push(sessionCompany("SKAR.TEST", { timing, pct: -5, rvol: 0.5 }));
      measurements.push(eventMeasurement("SKAR.TEST", anchorAt, { timing, unavailable: true }));
    }
    story.reactionV2 = { schemaVersion: 2, storyId: story.id, storyVersion: 1, publishedAt, asOf: Date.parse(measurements[0].asOf), measurements };
    if (key === "volume-only") {
      // New stories can acquire company context before the event worker runs.
      delete story.reactionV2;
      story.reaction = null;
    }
    story.companyContext = { schemaVersion: 1, scope: "session_context", storyId: story.id, storyVersion: 1, publishedAt, asOf, companies };
    story.previewCharts = Object.fromEntries(story.companies.map((company, index) => [company.symbol, previewStockChart(story, company.symbol, {
      date: key === "older" ? "2026-09-01" : "2026-09-09",
      source: key === "older" ? "minute_bars" : "live_ticks", price: 10, change: index ? -5 : 10,
      status: key === "volume-only" ? "unavailable" : "available",
    })]));
    return story;
  });
}
