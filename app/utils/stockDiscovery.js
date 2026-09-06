export const STOCK_PAGE_SIZE = 24;
export const STOCK_VIEWS = [
  { value: "news", label: "I nyheterna" },
  { value: "reports", label: "Rapporter" },
  { value: "all", label: "Alla bolag" },
];
export const STOCK_SEGMENTS = [
  { value: "all", label: "Alla listor" },
  { value: "large", label: "Large Cap" },
  { value: "mid", label: "Mid Cap" },
  { value: "small", label: "Small Cap" },
  { value: "first_north", label: "First North" },
  { value: "spotlight", label: "Spotlight" },
  { value: "other", label: "Övriga listor" },
];
export const STOCK_SORTS = [
  { value: "recent", label: "Nyast nyhet" },
  { value: "name", label: "Namn A–Ö" },
  { value: "gainers", label: "Stiger mest" },
  { value: "losers", label: "Faller mest" },
];
const finite = value => value == null || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
const normalized = value => String(value ?? "").toLocaleLowerCase("sv-SE").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const symbolKey = value => String(value ?? "").trim().toUpperCase();
export const companySector = company => company.sector || company.yahooSector || "";
export function stockSegment(company) {
  const source = `${company.segment ?? ""} ${company.market ?? ""}`.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  if (source.includes("FIRST_NORTH") || source.includes("FIRSTNORTH")) return "first_north";
  if (source.includes("SPOTLIGHT")) return "spotlight";
  if (source.includes("LARGE")) return "large";
  if (source.includes("MID")) return "mid";
  if (source.includes("SMALL")) return "small";
  return "other";
}
export const stockSegmentLabel = company => STOCK_SEGMENTS.find(option => option.value === stockSegment(company))?.label;

export function stockFilters(params = new URLSearchParams()) {
  const value = (key, fallback, options) => options.some(option => option.value === params.get(key)) ? params.get(key) : fallback;
  const view = value("view", "news", STOCK_VIEWS);
  return {
    view, q: (params.get("q") || "").slice(0, 80),
    segment: value("list", "all", STOCK_SEGMENTS),
    sector: (params.get("sector") || "all").slice(0, 80),
    sort: value("sort", view === "all" ? "name" : "recent", STOCK_SORTS),
    page: Math.min(100, Math.max(1, Math.floor(Number(params.get("page"))) || 1)),
  };
}
export function stockFiltersHref(filters) {
  const params = new URLSearchParams();
  if (filters.view !== "news") params.set("view", filters.view);
  if (filters.q) params.set("q", filters.q);
  if (filters.segment !== "all") params.set("list", filters.segment);
  if (filters.sector !== "all") params.set("sector", filters.sector);
  if (filters.sort !== (filters.view === "all" ? "name" : "recent")) params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", filters.page);
  return `/aktier${params.size ? `?${params}` : ""}`;
}

export function discoverStocks(companies, snapshot, filters) {
  const stories = new Map((snapshot?.[filters.view === "reports" ? "reports" : "news"] ?? [])
    .filter(row => row?.symbol && /^[A-Za-z0-9_-]{1,80}$/.test(row.story?.id ?? "") && row.story?.title)
    .map(row => [symbolKey(row.symbol), row.story]));
  const seen = new Set();
  const needle = normalized(filters.q);
  const rows = (companies ?? []).filter(company => {
    const key = symbolKey(company?.symbol);
    if (!key || !company?.name || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(company => ({ ...company, story: stories.get(symbolKey(company.symbol)) ?? null }))
    .filter(company => {
      if (filters.view !== "all" && !company.story) return false;
      if (filters.segment !== "all" && stockSegment(company) !== filters.segment) return false;
      if (filters.sector !== "all" && companySector(company) !== filters.sector) return false;
      return !needle || normalized([company.name, company.symbol, company.nativeSymbol, companySector(company)].join(" ")).includes(needle);
    });
  return rows.sort((a, b) => {
    const nameOrder = a.name.localeCompare(b.name, "sv-SE") || a.symbol.localeCompare(b.symbol);
    if (filters.sort === "recent") return (Date.parse(b.story?.publishedAt) || 0) - (Date.parse(a.story?.publishedAt) || 0) || nameOrder;
    if (filters.sort === "name") return nameOrder;
    const left = finite(a.changePct), right = finite(b.changePct);
    if (left === null && right === null) return nameOrder;
    if (left === null) return 1;
    if (right === null) return -1;
    return (filters.sort === "gainers" ? right - left : left - right) || nameOrder;
  });
}

export function directoryQuote(company, now) {
  const price = finite(company.price);
  const ts = company.quoteTime == null ? NaN : new Date(company.quoteTime).getTime();
  const validTime = Number.isFinite(ts) && ts <= now;
  const day = value => new Date(value).toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
  const period = validTime
    ? day(ts) === day(now) ? "Idag" : new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Stockholm" }).format(ts)
    : "Kurstid saknas";
  // This directory's Stockholm (.ST) listings trade in SEK. Never reuse the
  // reporting currency in financial statements as a quote currency.
  const currency = /^[A-Z]{3}$/.test(company.currency ?? "") ? company.currency : /\.ST$/i.test(company.symbol) ? "SEK" : null;
  return {
    price: price === null ? "Kurs saknas" : `${price.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: Math.abs(price) < 1 ? 4 : 2 })}${currency ? ` ${currency === "SEK" ? "kr" : currency}` : ""}`,
    currencyMissing: price !== null && !currency,
    change: finite(company.changePct), period,
    dateTime: validTime ? new Date(ts).toISOString() : undefined,
  };
}
