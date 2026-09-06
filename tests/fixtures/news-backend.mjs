// Local-only integration fixture. All companies, news and account data are fictional.
import { createServer } from "node:http";

const base = Date.now() - 2 * 3600_000;
const companies = [
  {
    name: "Norden Industri",
    symbol: "NORD.TEST",
    nativeSymbol: "NORD",
    segment: "LARGE_CAP",
    sector: "Industri",
    price: 124.5,
    changePct: 4.2,
  },
  {
    name: "Skärgården Teknik",
    symbol: "SKAR.TEST",
    nativeSymbol: "SKAR",
    segment: "MID_CAP",
    sector: "Teknik",
    price: 87.1,
    changePct: -2.3,
  },
  {
    name: "Fjäll Energi",
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
    index === 0
      ? {
          reportMetrics: [
            { key: "revenue", value: "2 450 MSEK (2 100)" },
            { key: "ebit", value: "410 MSEK (340)" },
          ],
        }
      : {},
}));
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
  summary: "Fiktiv testdata. && Norden Industri && står i fokus.",
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
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;
  let body = "";
  for await (const chunk of req) body += chunk;
  const input = body ? JSON.parse(body) : {};
  let data;
  if (path === "/__newsroom_fixture") data = { fixture: true };
  else if (path === "/api/user/watchlist/toggle") {
    user.watchlist = user.watchlist.includes(input.symbol)
      ? user.watchlist.filter((s) => s !== input.symbol)
      : [...user.watchlist, input.symbol];
    data = { watchlist: user.watchlist };
  } else if (path === "/api/user/topics" || path === "/api/user/keywords") {
    const key = path.split("/").at(-1);
    user[key] = input[key];
    data = { [key]: user[key] };
  } else if (path === "/api/user") data = user;
  else if (path === "/api/feed/market-overview") data = overview();
  else if (
    path === "/api/feed/companies" ||
    path === "/api/feed/company-directory"
  )
    data = companies;
  else if (path === "/api/feed/company-profiles")
    data = { items: [], missing: companies.map((c) => c.symbol) };
  else if (path === "/api/data") data = articles;
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
    const symbol = decodeURIComponent(path.split("/").at(-2));
    const company =
      companies.find((item) => item.symbol === symbol) || companies[0];
    data = {
      symbol,
      summary: {
        symbol,
        profile: {
          ...company,
          description: "Fiktivt industribolag för lokala tester.",
          currency: "SEK",
        },
        quote: {
          price: company.price,
          change: 5.02,
          changePct: company.changePct,
        },
        calendar: {},
      },
      chart: {
        bars:
          symbol === "FJALL.TEST"
            ? []
            : Array.from({ length: 300 }, (_, index) => ({
                date: new Date(base - (299 - index) * 86400_000)
                  .toISOString()
                  .slice(0, 10),
                close: 100 + index / 10 + Math.sin(index / 5),
                volume: 100_000,
              })),
      },
      news: stories.filter((story) => story.companies[0].symbol === symbol),
      reports: [],
      access: { plus: true },
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
  } else if (path.endsWith("/related")) data = { items: [stories[3]] };
  else if (path.startsWith("/api/feed/news/")) {
    const id = path.split("/").at(-1);
    let story = stories.find((story) => story.id === id);
    if (id === "missing-data")
      story = {
        ...stories[0],
        id,
        reaction: { pct: null },
        headline: "Bolaget publicerar en uppdatering utan tillgänglig kursdata",
      };
    if (id === "long-title")
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
      document: {
        preamble: "Fiktiv källtext för verifiering.",
        body: "Detta är en fiktiv rapport för lokala tester.\n\nSamtliga värden och bolagsnamn i denna miljö är exempeldata.",
      },
      reactionSeries:
        id === "missing-data"
          ? null
          : {
              points: Array.from({ length: 45 }, (_, n) => ({
                t: published + (n - 10) * 60_000,
                pct:
                  (n < 10
                    ? Math.sin(n) * 0.1
                    : (n - 10) * 0.1 + Math.sin(n) * 0.2) *
                  (id === "fixture-1" ? -1 : 1),
              })),
            },
    };
  } else if (path === "/api/mail" || path === "/api/auth/register")
    data = { success: true };
  else data = { items: [] };
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
});
server.listen(8100, "127.0.0.1", () =>
  console.log("Fictional newsroom fixture on http://127.0.0.1:8100"),
);
