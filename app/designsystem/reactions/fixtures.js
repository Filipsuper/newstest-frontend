// Fictional, dated UI scenarios. Imported only by the gated preview and tests.
import { previewStockChart } from "../sessions/chartFixtures.js";
const minute = 60_000;
const anchor = Date.parse("2026-09-08T08:00:00Z");
const iso = value => new Date(value).toISOString();
const periods = { m1: 1, m5: 5, m15: 15, h1: 60, session_close: 450, next_session_close: 1890 };

export function previewMeasurement(symbol, pct = 4.2) {
  const baselineAt = iso(anchor);
  return {
    symbol, status: "measured", timing: "during_session", asOf: iso(anchor + 65 * minute), anchorAt: iso(anchor),
    session: { date: "2026-09-08", open: "2026-09-08T07:00:00Z", close: "2026-09-08T15:30:00Z" },
    baseline: { price: 100, priceAt: baselineAt, kind: "pre_publication_minute_close", source: "Yahoo Finance · 1 min" },
    windows: Object.fromEntries(Object.entries(periods).map(([key, length]) => [key, {
      status: length <= 60 ? "complete" : "pending", pct: length <= 60 ? pct * length / 60 : null,
      targetAt: iso(anchor + length * minute), endpoint: length <= 60 ? { price: 100 + pct * length / 60, priceAt: iso(anchor + length * minute) } : null,
      endpointAgeSeconds: length <= 60 ? 0 : null,
    }])),
    series: { points: Array.from({ length: 91 }, (_, index) => ({ t: anchor + (index - 30) * minute,
      pct: index < 30 ? Math.sin(index / 5) * 0.2 : pct * (index - 30) / 60
        + ([1, 5, 15, 60].includes(index - 30) ? 0 : Math.sin((index - 30) * Math.PI / 5) * 0.12) })) },
    volume: Object.fromEntries([5, 15, 30].map(length => [`m${length}`, {
      post: { status: "complete", start: iso(anchor), end: iso(anchor + length * minute), volume: 6000 * length, expectedBars: length, observedBars: length },
      pre: { status: "complete", start: iso(anchor - length * minute), end: iso(anchor), volume: 3000 * length, expectedBars: length, observedBars: length },
      relativeToNormal: 2.4, beforeAfterRatio: 2, referenceVolume: 2500 * length, baselineSessionCount: 20, baselineMature: true,
    }])),
  };
}

export function previewStories() {
  const cases = [
    ["positive", "Norden Industri", "NORD.TEST", "Höjer prognosen efter stark orderingång", 4.2],
    ["negative", "Skärgården Teknik", "SKAR.TEST", "Lägre marginaler i kvartalet", -3.1],
    ["after-close", "Fjäll Energi", "FJALL.TEST", "Nytt avtal publicerat efter börsstängning", 2.8],
    ["waiting", "Östersjö Medicin", "OST.TEST", "Resultat från studien inför börsöppning", 0],
    ["missing", "Liten Verkstad", "LITEN.TEST", "Ny order — minutdata saknas", 0],
    ["multi", "Norden Industri", "NORD.TEST", "Två bolag ingår ett samarbetsavtal", 1.7],
  ];
  return cases.map(([key, name, symbol, headline, pct]) => {
    const story = { id: `reaction-preview-${key}`, version: 1, headline, companies: [{ name, symbol }],
      publishedAt: iso(anchor), primarySource: { name: "Fiktiv källa" }, tags: ["ORDER"],
      aiSummary: { text: "Fiktivt exempel för att granska layout, mätperioder och datalägen. Det här är inte en verklig nyhet.", bullets: [] },
      reaction: { pct: 99 }, // Deliberately different: the v2 UI must not borrow it.
    };
    const measurement = previewMeasurement(symbol, pct);
    if (key === "negative") {
      measurement.volume.m30.baselineSessionCount = 8;
      measurement.volume.m30.baselineMature = false;
      measurement.series.points[62].pct = null;
      measurement.series.points[63].pct = null;
    }
    if (key === "after-close") {
      story.publishedAt = "2026-09-07T18:00:00Z";
      measurement.timing = "after_close";
      measurement.anchorAt = "2026-09-08T07:00:00Z";
      measurement.baseline = { ...measurement.baseline, kind: "previous_session_close_proxy", priceAt: "2026-09-07T15:30:00Z" };
      measurement.series.points = measurement.series.points.filter(point => point.t >= anchor).map(point => ({ ...point, t: point.t - 60 * minute }));
      for (const key of ["m1", "m5", "m15", "h1"]) {
        const window = measurement.windows[key];
        window.targetAt = iso(Date.parse(window.targetAt) - 60 * minute);
        window.endpoint.priceAt = window.targetAt;
      }
      for (const volume of Object.values(measurement.volume)) {
        volume.post.start = iso(Date.parse(volume.post.start) - 60 * minute);
        volume.post.end = iso(Date.parse(volume.post.end) - 60 * minute);
        volume.pre = { ...volume.pre, status: "outside_session", volume: null };
        volume.beforeAfterRatio = null;
      }
    }
    if (key === "waiting" || key === "missing") {
      measurement.status = key === "waiting" ? "waiting_for_session" : "missing_baseline";
      measurement.baseline = null;
      measurement.series.points = [];
      if (key === "waiting") {
        story.publishedAt = "2026-09-08T06:30:00Z";
        measurement.timing = "before_open";
        measurement.anchorAt = measurement.session.open;
        measurement.asOf = "2026-09-08T06:40:00Z";
        for (const key of ["m1", "m5", "m15", "h1"]) measurement.windows[key].targetAt = iso(Date.parse(measurement.windows[key].targetAt) - 60 * minute);
        for (const value of Object.values(measurement.volume)) {
          value.post.start = iso(Date.parse(value.post.start) - 60 * minute);
          value.post.end = iso(Date.parse(value.post.end) - 60 * minute);
          value.pre = { ...value.pre, status: "outside_session", volume: null };
        }
      }
      for (const window of Object.values(measurement.windows)) Object.assign(window, { status: key === "waiting" ? "pending" : "missing_baseline", pct: null, endpoint: null });
      for (const value of Object.values(measurement.volume)) {
        value.post.status = key === "waiting" ? "pending" : "incomplete_coverage";
        value.post.volume = null;
        value.post.observedBars = key === "waiting" ? 0 : Math.min(value.post.expectedBars - 1, 12);
        value.relativeToNormal = value.beforeAfterRatio = null;
      }
    }
    const measurements = [measurement];
    if (key === "multi") {
      story.companies.push({ name: "Skärgården Teknik", symbol: "SKAR.TEST" });
      const second = previewMeasurement("SKAR.TEST", -1.2);
      for (const [key, value] of Object.entries(second.volume)) {
        const length = Number(key.slice(1));
        value.post.volume = 3600 * length;
        value.pre.volume = 6000 * length;
        value.referenceVolume = 4500 * length;
        value.relativeToNormal = 0.8;
        value.beforeAfterRatio = 0.6;
      }
      measurements.push(second);
    }
    story.reactionV2 = { schemaVersion: 2, storyId: story.id, storyVersion: 1, publishedAt: story.publishedAt,
      asOf: Date.parse(measurement.asOf), measurements };
    story.previewCharts = Object.fromEntries(story.companies.map((company, index) => [company.symbol, previewStockChart(story, company.symbol, {
      price: index ? 80 : 100, change: index ? -1.2 : pct,
      status: key === "waiting" ? "pending" : key === "missing" ? "unavailable" : "available",
    })]));
    return story;
  });
}
