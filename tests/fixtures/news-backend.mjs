// Local-only integration fixture. Fictional data except the three explicitly
// reviewed segment-report previews, which have no invented quotes or history.
import { createServer } from "node:http";
import { previewStories } from "../../app/designsystem/reactions/fixtures.js";
import { sessionPreviewStories } from "../../app/designsystem/sessions/fixtures.js";
import { previewStockChart } from "../../app/designsystem/sessions/chartFixtures.js";
import { fictionalGeographicRevenue, fictionalSegmentRevenue, reviewedCompanyOverview } from './segment-revenue.mjs';
import { fictionalProfileInsights } from './profile-insights.mjs';
import { valuationFixture } from './valuation.mjs';
import { researchFixtures } from './company-research.mjs';

const base = Date.now() - 2 * 3600_000;
function genericStockChart(story, symbol, unavailable = false) {
  const published = Date.parse(story.publishedAt), now = Date.now();
  let date = new Date(published).toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
  // Fictional September-only fixtures; real code uses the verified calendar.
  let noon = Date.parse(`${date}T12:00:00Z`);
  if (published >= Date.parse(`${date}T15:30:00Z`)) noon += 86_400_000;
  while ([0, 6].includes(new Date(noon).getUTCDay())) noon += 86_400_000;
  date = new Date(noon).toISOString().slice(0, 10);
  const pending = now < Date.parse(`${date}T07:00:00Z`);
  const chart = previewStockChart(story, symbol, { date, status: unavailable ? "unavailable" : pending ? "pending" : "available" });
  chart.asOf = now;
  chart.points = chart.points.filter(point => point.t <= now);
  chart.observedAt = chart.points.at(-1)?.t ?? null;
  return chart;
}
const companies = [
  {
    name: "Norden Industri",
    exchangeMic: "XSTO",
    symbol: "NORD.TEST",
    nativeSymbol: "NORD",
    segment: "LARGE_CAP",
    sector: "Industri",
    price: 124.5,
    changePct: 4.2,
  },
  {
    name: "Skärgården Teknik",
    exchangeMic: "XSTO",
    symbol: "SKAR.TEST",
    nativeSymbol: "SKAR",
    segment: "MID_CAP",
    sector: "Teknik",
    price: 87.1,
    changePct: -2.3,
  },
  {
    name: "Fjäll Energi",
    exchangeMic: "XSTO",
    symbol: "FJALL.TEST",
    nativeSymbol: "FJALL",
    segment: "SMALL_CAP",
    sector: "Energi",
    price: 42.3,
    changePct: 1.4,
  },
];
const headlines = [
  "Höjer prognosen efter stark orderingång",
  "Större investering i europeisk halvledarproduktion",
  "Nytt flerårigt energiavtal värt 420 miljoner kronor",
  "Lägre marginaler i kvartalet – efterfrågan oförändrad",
  "Räntan lämnas oförändrad efter dagens besked",
  "Utökar samarbetet inom industriell automation",
];
const stories = Array.from({ length: 18 }, (_, index) => ({
  id: `fixture-${index}`,
  eventId: `event-${index}`,
  headline: headlines[index % headlines.length],
  companies: [companies[index % 3]],
  publishedAt: new Date(base - index * 1800_000).toISOString(),
  summary:
    "Fiktiv testdata. Bolaget höjer helårsprognosen och redovisar en högre orderingång. Uppgifterna kommer från bolagets publicerade rapport.",
  aiSummary: index === 2 ? null : {
    text: "Fiktiv AI-text. Starkare efterfrågan får bolaget att höja sin helårsprognos.",
    bullets: index === 1 ? [] : [
      "Prognosen avser räkenskapsåret 2026.",
      "Orderingången ökade med 12 procent.",
      "Nästa rapport publiceras den 24 oktober.",
    ],
  },
  tags:
    index % 5 === 4 ? ["MACRO"] : index % 3 === 0 ? ["EARNINGS"] : ["ORDER"],
  importance: 95 - index,
  version: 1,
  status: "flash",
  primarySource: {
    name: "MFN",
    sourceKind: "issuer_release",
    url: "https://example.com/release",
    language: "sv",
  },
  reaction: {
    pct: index === 1 ? -2.3 : 4.2 - index / 10,
    h1Pct: index === 1 ? -1.8 : 3.8,
    m15Pct: 1.2,
  },
  facts:
    index === 0 || index === 2
      ? {
          reportMetrics: [
            { key: "revenue", value: index === 2 ? "3 120 MSEK (2 780)" : "2 450 MSEK (2 100)" },
            { key: "ebit", value: index === 2 ? "520 MSEK (470)" : "410 MSEK (340)" },
          ],
          estimateComparisons: [
            { key: "ebit", actualDisplay: index === 2 ? "520 MSEK" : "410 MSEK", estimateDisplay: index === 2 ? "490 MSEK" : "390 MSEK", source: "Fiktiv estimatkälla" },
          ],
          transactions: [
            { person: index === 2 ? "Annan Fiktiv Insynsperson" : "Fiktiv Insynsperson", nature: "Acquisition", volume: 12345, price: 67, currency: "SEK" },
          ],
          money: { display: index === 2 ? "654 miljoner kronor" : "987 miljoner kronor" },
        }
      : {},
}));
// Explicit fictional volume provenance; no database or real trading data.
for (const story of stories.slice(0, 2)) {
  story.marketContext = {
    storyId: story.id, symbol: story.companies[0].symbol, publishedAt: story.publishedAt,
    scope: "session_context", sessionDate: new Date(base).toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" }),
    asOf: base + 30 * 60_000, rvolAtTime: 3.4, dailyRvol: 1.8,
    baselineSessionCount: story.id === "fixture-0" ? 20 : 5,
    baselineMature: story.id === "fixture-0", turnover: 10_000_000,
  };
}
const directory = [
  ...companies.map(company => ({ ...company, currency: "SEK", quoteTime: base })),
  ...Array.from({ length: 30 }, (_, index) => ({
    name: `Övrigt Testbolag ${String(index + 1).padStart(2, "0")}`,
    symbol: `OTHER-${index}.TEST`, nativeSymbol: `OTHER${index}`,
    segment: "FIRST_NORTH", sector: "Teknik", currency: "SEK",
    price: null, changePct: null, quoteTime: null,
  })),
];
const companyNews = () => {
  const group = reports => companies.map(company => ({
    symbol: company.symbol,
    story: stories.find(story => story.companies.some(item => item.symbol === company.symbol)
      && (!reports || story.tags.some(tag => ["EARNINGS", "GUIDANCE", "PROFIT_WARNING"].includes(tag)))),
  })).filter(row => row.story).map(({ symbol, story }) => ({
    symbol, story: { id: story.id, title: story.headline, tags: story.tags, source: story.primarySource.name, publishedAt: story.publishedAt },
  }));
  return { news: group(false), reports: group(true), coverage: {
    from: new Date(Date.now() - 96 * 3600_000).toISOString(), to: new Date().toISOString(),
    hours: 96, minImportance: 60, companyLimit: 200, truncated: { news: false, reports: false },
  } };
};
let discoveryFailure = false;
const morningDate = new Date();
morningDate.setUTCHours(5, 0, 0, 0);
const articles = Array.from({ length: 16 }, (_, index) => ({
  _id: `letter-${index}`,
  title:
    index === 0
      ? "Industrin tar täten – rapporter och räntor i fokus"
      : `Börsbrevet: dagens viktigaste händelser ${index}`,
  introText:
    "Fiktiv testdata. Nya prognoser från industrin, besked om räntan och bolagen att hålla ett öga på inför börsdagen.",
  summary:
    "Fiktiv testdata. && Norden Industri && står i fokus.\n##Dagens viktigaste händelser##\n**Industrin** växer med /green/+4,2 procent/green/. Läs [källan](https://example.com/rapport).\n##Vad händer härnäst?##\nDet här är exempeltext med [en osäker länk](javascript:alert).",
  bulletPoints:
    "- Prognosen höjs efter stark orderingång\n- Rörelsemarginalen ökar – trots högre kostnader\n- Nytt avtal för 2027–2029",
  createdAt: new Date(morningDate.getTime() - index * 86400_000).toISOString(),
  isEveningLetter: index % 2 === 1,
  omxChangePercentage: "+1,2%",
}));
const user = {
  email: "newsroom@example.test",
  verified: true,
  plan: "premium",
  watchlist: ["NORD.TEST"],
  topics: [],
  keywords: [],
};
const overview = () => ({
  news: stories,
  moverNews: [],
  movers: { items: [] },
  generatedAt: new Date().toISOString(),
  sessionDate: new Date(base).toISOString().slice(0, 10),
  dataAsOf: base,
  breadth: { rising: 472, falling: 325, total: 800 },
  benchmarks: ["omxspi", "omxs30", "sp500"].map((id, index) => ({
    id,
    session: {
      date: new Date(base).toISOString().slice(0, 10),
      changePct: [0.82, 1.21, -0.34][index],
      points: Array.from({ length: 20 }, (_, n) => [
        base + n * 60_000,
        100 + Math.sin(n / 2) + n / 10,
      ]),
    },
  })),
});
const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;
  if (path === "/api/feed/stream") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
    res.write(": fictional local preview connected\n\n");
    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 15_000);
    res.on("close", () => clearInterval(heartbeat));
    return;
  }
  let body = "";
  for await (const chunk of req) body += chunk;
  const input = body ? JSON.parse(body) : {};
  let data;
  if (path === "/__newsroom_fixture") data = { fixture: true };
  else if (path === "/__discovery_failure") { discoveryFailure = Boolean(input.fail); data = { ok: true }; }
  else if (path === "/api/user/watchlist/toggle") {
    user.watchlist = user.watchlist.includes(input.symbol)
      ? user.watchlist.filter((s) => s !== input.symbol)
      : [...user.watchlist, input.symbol];
    data = { watchlist: user.watchlist };
  } else if (req.method === "PUT" && path.startsWith("/api/user/watchlist/")) {
    const symbol = decodeURIComponent(path.split("/").at(-1));
    user.watchlist = user.watchlist.filter((value) => value !== symbol);
    if (input.followed === true) user.watchlist.push(symbol);
    data = { watchlist: user.watchlist };
  } else if (path === "/api/user/topics" || path === "/api/user/keywords") {
    const key = path.split("/").at(-1);
    user[key] = input[key];
    data = { [key]: user[key] };
  } else if (path === "/api/user") data = user;
  else if (path === "/api/feed/market-overview") data = overview();
  else if (path === "/api/feed/companies") data = companies;
  else if (path === "/api/feed/company-directory") data = directory;
  else if (path === "/api/feed/company-news") {
    if (discoveryFailure) { res.writeHead(503, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "Fiktivt anslutningsfel" })); return; }
    data = companyNews();
  }
  else if (path === "/api/feed/company-profiles") {
    const requested = (url.searchParams.get('symbols') || '').split(',');
    const supported = requested.filter(symbol => ['NORD.TEST', 'FREE.TEST'].includes(symbol));
    // Fictional public profile for local research-page previews only.
    data = { items: supported.map(symbol => ({ symbol, coveragePct: 83, version: 1,
      ...(symbol === 'NORD.TEST' ? { insights: fictionalProfileInsights(symbol) } : {}),
      axes: [['value', 3], ['growth', 5], ['past', 3], ['health', 5], ['insiders', null], ['dividend', 0]]
        .map(([key, score]) => ({ key, score })),
    })), missing: requested.filter(symbol => !supported.includes(symbol)) };
  }
  else if (path === "/api/data") data = articles;
  else if (path === "/api/data/morning-letter")
    data = articles.filter((article) => !article.isEveningLetter);
  else if (path === "/api/data/evening-letter")
    data = articles.filter((article) => article.isEveningLetter);
  else if (path === "/api/data/empty-letter")
    data = {
      ...articles[0],
      summary: null,
      introText: "",
      bulletPoints: null,
      omxChangePercentage: null,
    };
  else if (path === "/api/data/og-evening-letter")
    data = {
      ...articles[0],
      title: "Börsdagen i backspegeln – industrin backar när nya räntebesked sätter tonen",
      createdAt: "2026-09-07T16:00:00Z",
      isEveningLetter: true,
      omxPrice: "2 583,40",
      omxChangePercentage: "−1,2 %",
    };
  else if (path === "/api/data/og-long-letter")
    data = {
      ...articles[0],
      title: "Rapporter och räntor inför börsdagen – industrins nya prognoser möter bankernas förväntningar medan energimarknaden och flera stora bolagsbesked får investerarna att tänka om",
      createdAt: "2026-09-07T05:00:00Z",
      omxPrice: "2 583,40",
      omxChangePercentage: "0,0 %",
    };
  else if (path.startsWith("/api/data/")) data = articles[0];
  else if (path === "/api/feed/topics")
    data = {
      events: ["EARNINGS", "ORDER"],
      sectors: ["Industrials"],
      segments: ["LARGE_CAP"],
    };
  else if (path === "/api/user/personal-feed")
    data = {
      sinceHours: 48,
      stories: stories.slice(0, 3).map((story) => ({
        ...story,
        company: story.companies[0].name,
        symbol: story.companies[0].symbol,
        viaWatchlist: true,
      })),
    };
  else if (/^\/api\/feed\/company\/[^/]+\/overview$/.test(path)) {
    const requestedSymbol = decodeURIComponent(path.split("/").at(-2));
    const symbol = requestedSymbol === 'COVERAGE.TEST' ? 'NORD.TEST' : requestedSymbol;
    const company =
      companies.find((item) => item.symbol === symbol) || companies[0];
    if (["MISSING.TEST", "UNAVAILABLE.TEST"].includes(symbol)) {
      res.writeHead(symbol === "MISSING.TEST" ? 404 : 503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Fixture unavailable" }));
      return;
    }
    data = {
      symbol,
      summary: {
        symbol,
        profile: {
          ...company,
          ...(symbol === "OG-LONG.TEST" ? { name: "Skärgårdens Industriella Komponenter och Förnybar Energi Holding" } : {}),
          description: "Fiktivt industribolag för lokala tester.",
          currency: "SEK",
        },
        quote: {
          price: symbol === "OG-PENNY.TEST" ? 0.31 : company.price,
          change: 5.02,
          changePct: company.changePct,
          quoteTime: new Date(base).toISOString(),
        },
        calendar: researchFixtures(symbol).calendar,
        financialHighlights: symbol === "FREE.TEST" ? {
          currency: "SEK", source: "Fiktivt testunderlag", annual: { fiscalPeriod: "2025", frequency: "annual", revenue: 120_000_000, ebit: 14_000_000 },
        } : null,
      },
      chart: {
        bars:
          symbol === "FJALL.TEST"
            ? []
            : Array.from({ length: 300 }, (_, index) => ({
                date: new Date(base - (299 - index) * 86400_000)
                  .toISOString()
                  .slice(0, 10),
                close: symbol === "OG-FLAT.TEST" ? 100
                  : symbol === "OG-PENNY.TEST" ? 0.25 + index / 5000 + Math.sin(index / 5) / 200
                  : symbol === "OG-DOWN.TEST" ? 150 - index / 10 + Math.sin(index / 5)
                  : 100 + index / 10 + Math.sin(index / 5),
                volume: 100_000,
              })),
      },
      news: symbol === "MANY.TEST" ? [...stories, { ...stories[0], id: "duplicate-release", primarySource: { ...stories[0].primarySource, language: "en" } }].map(story => ({ ...story, companies: [{ ...company, symbol }] })) : stories.filter((story) => story.companies[0].symbol === symbol),
      reports: [],
      // A successful empty response differs from unavailable upstream data.
      estimates: symbol === 'FREE.TEST' ? null : { symbol, snapshots: [], models: [] },
      availability: { estimates: symbol === 'FREE.TEST' ? 'locked' : 'available' },
      financials: symbol.startsWith('GEO-') || symbol.startsWith('SEGMENT-') || ['NORD.TEST', 'CASH-MISSING.TEST', 'CASH-MISMATCH.TEST', 'CASH-NEGATIVE.TEST', 'CASH-ZERO.TEST', 'MARGIN-MISSING.TEST', 'NET-DEBT.TEST', 'NET-MISSING.TEST', 'NET-MISMATCH.TEST', 'NET-ONLY.TEST', 'NET-ZERO.TEST', 'NET-INVALID.TEST', 'EARNINGS-SIGNED.TEST', 'EARNINGS-PARTIAL.TEST', 'EARNINGS-DISJOINT.TEST'].includes(symbol) ? {
        symbol,
        currency: "SEK",
        source: "issuer_report",
        latestReport: { fiscalPeriod: "2025-Q3", status: "complete", publishedAt: "2025-10-20T06:00:00Z", attachmentUrl: "https://example.test/fictional-report.pdf" },
        managementComment: { type: "ceo_statement", fiscalPeriod: "2025-Q3", publishedAt: "2025-10-20T06:00:00Z", pageStart: 2, pageEnd: 3,
          text: "Detta är ett fiktivt VD-ord för UI-tester. Vi har växt på våra befintliga marknader.\n\nVi fortsätter investera i verksamheten och följer utvecklingen i efterfrågan.",
          source: { url: "https://example.test/fictional-report.pdf" },
          summary: { summary: "Fiktivt exempel: ledningen beskriver tillväxt och fortsatta investeringar.", outlook: ["Fiktivt exempel: fortsatt fokus på befintliga kunder."], changesAndRisks: ["Fiktivt exempel: efterfrågan är fortsatt osäker."], keyFigures: [{ label: "Unqualified figure", value: "999" }] },
        },
        annual: [2023, 2024, 2025].map((year, index) => ({
          fiscalYear: year, fiscalPeriod: String(year), frequency: "annual", periodKey: `${year}-A`, periodEnd: `${year}-12-31`,
          revenue: 100_000_000 + index * 10_000_000, ebit: 10_000_000 + index * 2_000_000,
          netIncome: 8_000_000, ebitMarginPct: 10 + index, dilutedEps: 1.5, sharesOutstanding: 10_000_000,
          source: "issuer_report", sourceUrl: "https://example.test/fictional-report.pdf", currency: "SEK",
          operatingCashFlow: 8_000_000 + index * 1_000_000, freeCashFlow: index === 1 ? null : 4_000_000,
          capitalExpenditure: -(4_000_000 + index * 1_000_000),
          cash: 20_000_000, totalDebt: 12_000_000 - index * 1_000_000,
        })),
        quarterly: Array.from({ length: 7 }, (_, index) => {
          const year = 2024 + Math.floor(index / 4), quarter = index % 4 + 1;
          return {
            fiscalYear: year, fiscalPeriod: `${year}-Q${quarter}`, frequency: "quarterly", periodKey: `${year}-Q${quarter}`, periodEnd: `${year}-${String(quarter * 3).padStart(2, '0')}-28`,
            revenue: 20_000_000 + index * 1_000_000, ebit: 2_000_000 + index * 200_000,
            netIncome: symbol === 'MARGIN-MISSING.TEST' || index === 3 ? null : 1_000_000 + index * 100_000,
            dilutedEps: 0.3, sharesOutstanding: 10_000_000,
            source: "issuer_report", sourceUrl: "https://example.test/fictional-report.pdf", currency: "SEK",
            operatingCashFlow: 2_000_000 + index * 100_000, freeCashFlow: index === 5 ? null : 800_000 + index * 80_000,
            capitalExpenditure: -(1_200_000 + index * 20_000),
            cash: 18_000_000 + index * 300_000, totalDebt: 12_000_000 - index * 200_000,
          };
        }),
        ttm: [{ fiscalYear: 2025, fiscalPeriod: '2025-Q3-TTM', periodKey: '2025-Q3-TTM', frequency: 'ttm', periodEnd: '2025-09-28', currency: 'SEK', source: 'omxsum-derived', revenue: 98_000_000, ebit: 11_600_000 }],
      } : null,
      access: { plus: symbol !== "FREE.TEST" },
    };
    const cashVariant = {
      'CASH-MISSING.TEST': { capitalExpenditure: null },
      'CASH-MISMATCH.TEST': { freeCashFlow: 3_000_000 },
      'CASH-NEGATIVE.TEST': { operatingCashFlow: 2_000_000, capitalExpenditure: -3_000_000, freeCashFlow: -1_000_000 },
      'CASH-ZERO.TEST': { operatingCashFlow: 0, capitalExpenditure: 0, freeCashFlow: 0 },
    }[symbol];
    if (cashVariant) Object.assign(data.financials.quarterly.at(-1), cashVariant);
    const debtVariant = {
      'NET-DEBT.TEST': { totalDebt: 30_000_000, cash: 5_000_000, netDebt: 25_000_000 },
      'NET-MISSING.TEST': { cash: null, netDebt: null },
      'NET-MISMATCH.TEST': { totalDebt: 30_000_000, cash: 5_000_000, netDebt: 27_000_000 },
      'NET-ZERO.TEST': { totalDebt: 0, cash: 0, netDebt: 0 },
      'NET-INVALID.TEST': { totalDebt: 30_000_000, cash: -5_000_000, netDebt: 25_000_000 },
    }[symbol];
    if (debtVariant) Object.assign(data.financials.quarterly.at(-1), debtVariant);
    if (symbol === 'NET-DEBT.TEST') data.financials.quarterly[3].cash = null;
    if (symbol === 'NET-ZERO.TEST') data.financials.quarterly.forEach(period => Object.assign(period, { totalDebt: 0, cash: 0, netDebt: 0 }));
    if (symbol === 'NET-ONLY.TEST') data.financials.quarterly.forEach((period, index) => Object.assign(period, { totalDebt: null, cash: null, netDebt: (2 + index) * 1_000_000 }));
    if (symbol === 'EARNINGS-SIGNED.TEST') {
      Object.assign(data.financials.quarterly[4], { netIncome: 0, operatingCashFlow: 0 });
      Object.assign(data.financials.quarterly[5], { netIncome: -1_000_000, operatingCashFlow: -2_000_000 });
      data.financials.quarterly.at(-1).netIncome = -1_600_000;
    }
    if (symbol === 'EARNINGS-PARTIAL.TEST') data.financials.quarterly.at(-1).operatingCashFlow = null;
    if (symbol === 'EARNINGS-DISJOINT.TEST') data.financials.quarterly.forEach((period, index) => {
      period.netIncome = index % 2 === 0 ? 1_000_000 : null;
      period.operatingCashFlow = index % 2 === 1 ? 2_000_000 : null;
    });
    if (["NORDIC.TEST", "NORDIC-EMPTY.TEST"].includes(symbol)) {
      data.summary.profile.tradingCurrency = "NOK";
      data.summary.priceCapabilities = { quote: { status: "supported" }, minute: { status: "supported" }, daily: { status: "supported" } };
      data.summary.quote = { ...data.summary.quote, quoteTime: base, source: "yahoo-chart-snapshot", updateMode: "snapshot" };
      data.chart.sourceName = "Yahoo Finance";
    }
    if (symbol === 'NORD.TEST' || symbol.startsWith('SEGMENT-')) {
      data.financials.segmentRevenue = fictionalSegmentRevenue(symbol);
      if (symbol === 'SEGMENT-WRONG.TEST') data.financials.segmentRevenue.symbol = 'WRONG.TEST';
      if (symbol === 'SEGMENT-INVALID.TEST') data.financials.segmentRevenue.rows.pop();
      if (symbol === 'SEGMENT-PARENT.TEST') data.financials.symbol = 'WRONG.TEST';
      if (symbol === 'SEGMENT-ONLY.TEST') Object.assign(data.financials, { annual: [], quarterly: [], ttm: [] });
      if (symbol === 'SEGMENT-UNAVAILABLE.TEST') data.availability = { financials: 'unavailable' };
      if (symbol === 'SEGMENT-FREE.TEST') {
        data.access.plus = false;
        data.financials = null;
      }
    }
    if (symbol === 'NORD.TEST' || symbol.startsWith('GEO-')) {
      data.financials.geographicRevenue = fictionalGeographicRevenue(symbol);
      if (symbol === 'GEO-WRONG.TEST') data.financials.geographicRevenue.symbol = 'WRONG.TEST';
      if (symbol === 'GEO-INVALID.TEST') data.financials.geographicRevenue.rows.pop();
      if (symbol === 'GEO-ONLY.TEST') Object.assign(data.financials, { annual: [], quarterly: [], ttm: [] });
      if (symbol === 'GEO-UNAVAILABLE.TEST') data.availability = { financials: 'unavailable' };
      if (symbol === 'GEO-FREE.TEST') {
        data.access.plus = false;
        data.financials = null;
      }
    }
    if (requestedSymbol === 'COVERAGE.TEST') {
      data.symbol = data.summary.symbol = data.financials.symbol = requestedSymbol;
      data.financials.segmentRevenue = data.financials.geographicRevenue = null;
      data.financials.latestReport = { fiscalPeriod: '2026-Q2', status: 'no_section', publishedAt: '2026-07-15', attachmentUrl: 'https://example.test/new-report.pdf' };
      data.financials.managementComment.selection = 'latest_available';
      for (const p of [...data.financials.quarterly, ...data.financials.annual]) {
        Object.assign(p, { source: 'yahoo', sourceUrl: null, totalDebt: 30e6, cash: 5e6, netDebt: 27e6,
          reportedNetDebt: 27e6, cashDefinition: 'cash_and_short_term_investments',
          netDebtCalculation: { definition: 'debt_minus_cash', totalDebt: 30e6, cash: 5e6, netDebt: 25e6, cashDefinition: 'cash_and_short_term_investments', debtDefinition: 'provider_total_debt' },
          operatingCashFlow: 10e6, capitalExpenditure: -3e6, capitalExpenditureSourceField: 'CapitalExpenditureReported', freeCashFlow: 10e6, reportedFreeCashFlow: 10e6,
          cashFlowCalculation: { definition: 'operating_minus_capex', operatingCashFlow: 10e6, capitalExpenditure: -3e6, freeCashFlow: 7e6 } });
      }
    }
    if (symbol.startsWith('VALUE')) {
      const fixture = valuationFixture(symbol);
      data.financials = fixture.financials;
      data.estimates = fixture.estimates;
      data.summary.profile.name = 'Fiktiva Industribolaget';
      data.availability = { estimates: 'available', financials: 'available' };
      if (symbol === 'VALUE-FAIL.TEST') { data.estimates = null; data.availability.estimates = 'unavailable'; }
    }
    data = reviewedCompanyOverview(symbol) ?? data;
  } else if (/^\/api\/feed\/company\/[^/]+\/(insiders|shorts)$/.test(path)) {
    const symbol = decodeURIComponent(path.split('/').at(-2));
    data = researchFixtures(symbol)[path.split('/').at(-1)];
  } else if (/^\/api\/feed\/company\/[^/]+\/valuation$/.test(path)) {
    data = valuationFixture(decodeURIComponent(path.split('/').at(-2))).valuation;
  } else if (["/api/feed/company/NORDIC.TEST/intraday", "/api/feed/company/NORDIC-EMPTY.TEST/intraday"].includes(path)) {
    const empty = path.includes("NORDIC-EMPTY");
    data = { symbol: empty ? "NORDIC-EMPTY.TEST" : "NORDIC.TEST", updateMode: "snapshot", timezone: "Europe/Oslo",
      previousClose: 120, previous: [],
      previousFull: empty ? [] : Array.from({ length: 24 }, (_, n) => ({ time: base - 86400_000 + n * 300_000, close: 119 + n / 24, volume: 80 })),
      current: empty ? [] : Array.from({ length: 12 }, (_, n) => ({ time: base + n * 300_000, close: 124 + n / 10, volume: 120 })),
      quote: empty ? null : { price: 125.1, change: 5.1, changePct: 4.25, currency: "NOK", quoteTime: base + 11 * 300_000,
        source: "yahoo-chart-snapshot", updateMode: "snapshot", fresh: false },
    };
  } else if (path === "/api/feed/company/OG-INTRA.TEST/intraday") {
    data = {
      previousClose: 100,
      previous: Array.from({ length: 12 }, (_, n) => ({ time: base - 86400_000 + n * 300_000, close: 99 + n / 12, volume: 10_000 })),
      previousFull: Array.from({ length: 48 }, (_, n) => ({ time: base - 86400_000 - (36 - n) * 300_000, close: 96 + n / 12, volume: 10_000 })),
      current: Array.from({ length: 12 }, (_, n) => ({ time: base + n * 300_000, close: 100 + n / 10, volume: 12_000 })),
      quote: { price: 101.1, quoteTime: base + 11 * 300_000, fresh: false },
    };
  } else if (path === "/api/feed/news") {
    const items =
      url.searchParams.get("q") === "none"
        ? []
        : url.searchParams.has("cursor")
          ? stories.slice(12)
          : stories.slice(0, 12);
    data = {
      items,
      nextCursor: url.searchParams.has("cursor") ? null : "page2",
      serverFilters: true,
    };
  } else if (path === "/api/feed/news/observations") {
    // Default fixture stays unchanged; focused tests supply versioned deltas.
    data = { items: [], updates: [], removed: [] };
  } else if (path.startsWith("/api/feed/news/") && path.endsWith("/chart")) {
    const id = path.split("/").at(-2), symbol = url.searchParams.get("symbol");
    const sample = [...previewStories(), ...sessionPreviewStories()].find(story => story.id === id);
    const story = sample ?? stories.find(story => story.id === id) ?? {
      ...stories[id.startsWith("long-title") ? 1 : 0], id,
    };
    data = { data: sample?.previewCharts?.[symbol] ?? genericStockChart(story, symbol,
      ["missing-data", "no-chart", "zero-change", "long-title-no-chart"].includes(id)) };
  } else if (path.endsWith("/related")) data = { items: [stories[3]] };
  else if (path.startsWith("/api/feed/news/")) {
    const id = path.split("/").at(-1);
    let story = stories.find((story) => story.id === id)
      ?? previewStories().find(story => story.id === id)
      ?? sessionPreviewStories().find(story => story.id === id);
    if (id === "missing-data")
      story = {
        ...stories[0],
        id,
        reaction: { pct: null },
        headline: "Bolaget publicerar en uppdatering utan tillgänglig kursdata",
      };
    if (["no-chart", "zero-change", "chart-only"].includes(id))
      story = {
        ...stories[0], id,
        reaction: id === "zero-change" ? { h1Pct: 0 } : id === "chart-only" ? { pct: null } : { pct: 4.2 },
      };
    if (id === "long-title" || id === "long-title-no-chart")
      story = {
        ...stories[1],
        id,
        headline:
          "Skärgården Teknik presenterar en omfattande investering i europeisk halvledarproduktion och ett nytt långsiktigt samarbete för att stärka tillgången till avancerade komponenter för industrin under de kommande fem åren",
      };
    if (id === "unavailable") {
      res.writeHead(503);
      res.end(JSON.stringify({ error: "Unavailable" }));
      return;
    }
    if (!story) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Missing" }));
      return;
    }
    const published = Date.parse(story.publishedAt);
    data = {
      story,
      volumeComparison: id === "fixture-0" ? {
        status: "ready", beforeShares: 30000, afterShares: 90000, ratio: 3,
        beforeStart: published - 30 * 60_000, beforeEnd: published,
        afterStart: published + 60_000, afterEnd: published + 31 * 60_000,
      } : { status: "unavailable", reason: "incomplete_minute_coverage" },
      document: {
        preamble: "Fiktiv källtext för verifiering.",
        body: "Detta är en fiktiv rapport för lokala tester.\n\nSamtliga värden och bolagsnamn i denna miljö är exempeldata.",
      },
      reactionSeries:
        ["missing-data", "no-chart", "zero-change", "long-title-no-chart"].includes(id)
          ? null
          : {
              points: Array.from({ length: 45 }, (_, n) => ({
                t: published + (n - 10) * 60_000,
                pct:
                  (n < 10
                    ? Math.sin(n) * 0.1
                    : (n - 10) * 0.1 + Math.sin(n) * 0.2) *
                  (story.reaction?.h1Pct < 0 ? -1 : 1),
              })),
            },
    };
  } else if (path === "/api/mail" || path === "/api/auth/register")
    data = { success: true };
  else data = { items: [] };
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
});
const fixturePort = Number(process.env.NEWS_FIXTURE_PORT || 8100);
server.listen(fixturePort, "127.0.0.1", () =>
  console.log(`Fictional newsroom fixture on http://127.0.0.1:${fixturePort}`),
);
