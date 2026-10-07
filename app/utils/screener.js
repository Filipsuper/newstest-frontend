// One registry owns filtering, columns, formatting and shareable URL validation.
const metric = (label, unit, group, description, extra = {}) => ({ label, unit, group, description, step: unit === "x" ? "0.1" : "1", ...extra });
const dailyMetric = (field, label, unit, description, extra = {}) => metric(label, unit, "Historisk teknik", description, { dailyField: field, horizon: "daily", ...extra });
export const SCREENER_METRICS = {
    dailyClose: dailyMetric("close", "Senaste stängning", "kr", "Stängningskurs för den senaste avslutade handelsdagen i historikunderlaget. Inte en intradagskurs.", { format: "price", min: 0 }),
    dailyChangePct: dailyMetric("changePct", "Senaste dagsutveckling", "%", "Senaste avslutade handelsdagens stängningskurs jämförd med föregående stängning.", { signed: true, shortLabel: "Senaste dag" }),
    ...Object.fromEntries([
        ["1w", "1wPct", "1 vecka", 5], ["1mo", "1moPct", "1 månad", 21], ["3mo", "3moPct", "3 månader", 63],
        ["6mo", "6moPct", "6 månader", 126], ["Ytd", "YtdPct", "i år", null], ["1y", "1yPct", "1 år", 252],
    ].map(([key, field, period, sessions]) => [`dailyReturn${key}Pct`, dailyMetric(`return${field}`, `Utveckling ${period}`, "%", `${sessions ? `Kursförändring över ${sessions} avslutade handelsdagar` : "Kursförändring från föregående års sista handelsdags stängning"} till den senaste avslutade handelsdagen. Kräver sammanhängande historik; inte totalavkastning inklusive utdelningar.`, { signed: true, shortLabel: period === "i år" ? "I år" : period })])),
    ...Object.fromEntries([20, 50, 200].map(days => [`dailyDistanceSma${days}Pct`, dailyMetric(`distanceSma${days}Pct`, `Avstånd till SMA ${days}`, "%", `Senaste stängning jämförd med medelvärdet av ${days} avslutade handelsdagars stängningskurser. Positivt värde är över medelvärdet.`, { signed: true })])),
    dailyRsi14: dailyMetric("rsi14", "RSI 14 dagar", "", "RSI över 14 avslutade handelsdagar, 0–100. Saknas när det inte finns tillräckligt underlag.", { min: 0, max: 100 }),
    dailyDistance52wHighPct: dailyMetric("distance52wHighPct", "Avstånd till 52-veckorshögsta", "%", "Senaste stängning jämförd med högsta noterade dagskurs under 365 kalenderdagar till och med den dagen. Kräver ett års sammanhängande täckning.", { signed: true, shortLabel: "Till 52v högsta" }),
    dailyDistance52wLowPct: dailyMetric("distance52wLowPct", "Avstånd till 52-veckorslägsta", "%", "Senaste stängning jämförd med lägsta noterade dagskurs under 365 kalenderdagar till och med den dagen. Kräver ett års sammanhängande täckning.", { signed: true, shortLabel: "Till 52v lägsta" }),
    dailyAverageVolume20: dailyMetric("averageVolume20", "Snittvolym 20 dagar", "aktier", "Genomsnittlig volym för de 20 avslutade handelsdagarna före historikdatumet. Saknade volymdagar ersätts inte med noll.", { min: 0 }),
    dailyAverageTurnover20: dailyMetric("averageTurnover20", "Snitt handelsvärde 20 dagar", "mn kr", "Genomsnitt av dagsstängning gånger dagsvolym för de 20 handelsdagarna före historikdatumet, i SEK. Uppskattat handelsvärde, inte börsens exakta omsättning.", { min: 0 }),
    dailyCompletedRvol: dailyMetric("completedRvol", "Relativ volym, avslutad dag", "x", "Senaste avslutade handelsdagens volym jämförd med snittvolymen för 20 tidigare avslutade dagar. Inte dagens pågående RVOL eller RVOL vid samma klockslag.", { min: 0 }),
    price: metric("Kurs", "kr", "Handel", "Senast tillgängliga kurs.", { format: "price" }),
    marketCap: metric("Börsvärde", "mdr kr", "Finansiellt", "Kurs gånger senast rapporterat antal utestående aktier. Miljarder kronor.", { format: "marketCap" }),
    revenueGrowthPct: metric("Omsättningstillväxt", "%", "Finansiellt", "Förändring mot föregående rapporterade helår.", { signed: true, shortLabel: "Oms. tillväxt" }),
    ebitMarginPct: metric("EBIT-marginal", "%", "Finansiellt", "EBIT som andel av omsättningen, senast rapporterade helår."),
    roePct: metric("Avkastning på eget kapital", "%", "Finansiellt", "Årets nettoresultat dividerat med eget kapital.", { shortLabel: "ROE" }),
    roicPct: metric("Avkastning på investerat kapital", "%", "Finansiellt", "Kvalificerad ROIC från finansunderlaget. Saknas när beräkningsunderlaget saknas.", { shortLabel: "ROIC" }),
    grossMarginPct: metric("Bruttomarginal", "%", "Finansiellt", "Bruttoresultat som andel av omsättningen för samma helår."),
    netMarginPct: metric("Nettomarginal", "%", "Finansiellt", "Nettoresultat som andel av omsättningen för samma helår."),
    equityRatioPct: metric("Soliditet", "%", "Finansiellt", "Eget kapital som andel av totala tillgångar vid helårets slut."),
    freeCashFlowMarginPct: metric("Fritt kassaflöde / omsättning", "%", "Finansiellt", "Rapporterat fritt kassaflöde som andel av helårets omsättning.", { shortLabel: "FCF-marginal" }),
    netDebtToEbitda: metric("Nettoskuld/EBITDA", "x", "Finansiellt", "Helårets nettoskuld dividerad med positiv EBITDA. Negativa värden kan innebära nettokassa."),
    pe: metric("P/E", "x", "Värdering", "Kurs dividerad med rapporterad vinst per aktie. Negativ och extremt hög P/E saknas.", { shortLabel: "PE" }),
    ps: metric("P/S", "x", "Värdering", "Börsvärde dividerat med helårets omsättning."),
    evEbit: metric("EV/EBIT", "x", "Värdering", "Börsvärde plus nettoskuld dividerat med positivt EBIT."),
    evEbitda: metric("EV/EBITDA", "x", "Värdering", "Börsvärde plus nettoskuld dividerat med positiv EBITDA, samma rapporteringsvaluta."),
    freeCashFlowYieldPct: metric("FCF-avkastning", "%", "Värdering", "Helårets rapporterade fria kassaflöde dividerat med börsvärdet. Kräver jämförbar valuta."),
    changePct: metric("Dagens utveckling", "%", "Tekniskt", "Förändring mot föregående handelsdags stängning.", { signed: true, shortLabel: "Dagsförändring" }),
    rvolAtTime: metric("Relativ volym", "x", "Tekniskt", "Ackumulerad volym jämfört med tidigare handelsdagar vid samma tidpunkt."),
    return15mPct: metric("Utveckling 15 min", "%", "Tekniskt", "Förändring under de senaste 15 minuterna.", { signed: true, shortLabel: "15 min" }),
    return5mPct: metric("Utveckling 5 min", "%", "Tekniskt", "Förändring under de senaste fem minuterna.", { signed: true }),
    gapPct: metric("Öppningsgap", "%", "Tekniskt", "Öppningskurs jämfört med föregående stängning.", { signed: true }),
    changeFromOpenPct: metric("Utveckling från öppning", "%", "Tekniskt", "Senaste kurs jämfört med dagens öppningskurs.", { signed: true }),
    intradayRangePct: metric("Dagens kursintervall", "%", "Tekniskt", "Dagens högsta minus lägsta kurs, relativt föregående stängning."),
    distanceFromHighPct: metric("Avstånd till dagshögsta", "%", "Tekniskt", "Senaste kurs jämfört med dagens högsta kurs."),
    distanceFromLowPct: metric("Avstånd till dagslägsta", "%", "Tekniskt", "Senaste kurs jämfört med dagens lägsta kurs."),
    distanceFromVwapPct: metric("Avstånd till VWAP", "%", "Tekniskt", "Kurs jämfört med volymvägd typisk kurs från dagens sparade minutstaplar.", { signed: true }),
    volumeSpike5m: metric("Volymspik 5 min", "x", "Tekniskt", "Senaste fem minuters volym jämfört med samma intervall tidigare dagar."),
    atr20Pct: metric("ATR 20 dagar", "%", "Tekniskt", "Genomsnittligt sant kursintervall över 20 tidigare sessioner, som andel av kursen."),
    dayVolume: metric("Dagens volym", "aktier", "Handel", "Ackumulerad handelsvolym för den aktuella sessionen."),
    turnover: metric("Handelsvärde, uppskattat", "mn kr", "Handel", "Senaste kurs gånger dagens volym. Ett uppskattat värde, inte börsens exakta omsättning."),
    openingRangePosition: metric("Första 15 minuters intervall", "", "Tekniskt", "Kurs över, inom eller under intervallet från dagens första 15 minuter.", { type: "enum", options: [{ value: "above", label: "Över intervallet" }, { value: "inside", label: "Inom intervallet" }, { value: "below", label: "Under intervallet" }] }),
    newsAgeHours: metric("Senaste nyhet", "timmar", "Nyheter", "Tid sedan senaste kopplade nyheten i screenerunderlaget. Inte en fullständig nyhetssökning."),
    newsImportance: metric("Nyhetens importance", "poäng", "Nyheter", "Importance för samma senaste kopplade nyhet. Kombinera med nyhetens ålder."),
    ...Object.fromEntries(["value", "growth", "past", "health", "insiders", "dividend"].map((axis, index) => [
        `profile_${axis}`, metric(["Värderingsprofil", "Tillväxtprofil", "Historikprofil", "Hälsoprofil", "Insynsprofil", "Utdelningsprofil"][index], "av 5", "Bolagsprofil", "Terminalens befintliga profilpoäng, 0–5. Saknade axlar ger inget värde; poängen är inte ett köp- eller säljråd.", { min: 0, max: 5, step: "0.5" }),
    ])),
    profileCoverage: metric("Profilens datatäckning", "%", "Bolagsprofil", "Andel profilkontroller med tillgängligt underlag.", { min: 0, max: 100 }),
    ...Object.fromEntries([30, 90, 365].flatMap(days => [
        [`insider_buyValue${days}d`, metric(`Insynsköp ${days} dagar`, "mn kr", "Insyn", "Registrerade förvärv av aktier i FI:s register, i SEK. Teckningar och optioner ingår inte. Saknas om beloppen har andra valutor eller saknar värde.")],
        [`insider_netValue${days}d`, metric(`Insyn nettoköp ${days} dagar`, "mn kr", "Insyn", "Registrerade aktieköp minus försäljningar, i SEK. Saknas när jämförbara belopp saknas.")],
        [`insider_buyers${days}d`, metric(`Olika insynsköpare ${days} dagar`, "personer", "Insyn", "Antal olika registrerade köpare av aktier under perioden. Närstående kan ingå.", { min: 0 })],
    ])),
};

// Retain these definitions for existing URLs without offering intraday metrics
// as new research filters. An old rule continues to mean exactly the same thing.
export const LEGACY_INTRADAY_METRICS = ["price", "changePct", "rvolAtTime", "return15mPct", "return5mPct", "gapPct", "changeFromOpenPct", "intradayRangePct", "distanceFromHighPct", "distanceFromLowPct", "distanceFromVwapPct", "volumeSpike5m", "atr20Pct", "dayVolume", "turnover", "openingRangePosition"];
export const isLegacyIntradayMetric = key => LEGACY_INTRADAY_METRICS.includes(key);
export const DISCOVERABLE_METRICS = Object.keys(SCREENER_METRICS).filter(key => !isLegacyIntradayMetric(key));
export const DEFAULT_COLUMNS = ["dailyClose", "dailyChangePct", "marketCap", "revenueGrowthPct", "ebitMarginPct", "roePct", "pe", "evEbit", "dailyReturn1moPct", "dailyReturn1yPct"];
export const FREE_DEFAULT_COLUMNS = ["dailyClose", "dailyChangePct", "marketCap", "revenueGrowthPct", "ebitMarginPct", "pe"];
export const FREE_METRICS = ["price", "changePct", ...FREE_DEFAULT_COLUMNS];
export function screenerDetailColumns(columns) {
    return columns.filter(key => SCREENER_METRICS[key] && !["price", "changePct", "dailyClose", "dailyChangePct"].includes(key)).slice(0, 6);
}
const normalizeSearch = value => String(value).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("sv-SE").replace(/[^a-z0-9]/g, "");
const SEARCH_ALIASES = {
    rvolAtTime: "RVOL RVOL at time volym vid tidpunkt", pe: "PE price earnings", ps: "PS price sales",
    dailyCompletedRvol: "RVOL avslutad dagsvolym", dailyRsi14: "RSI relative strength index",
    dailyReturn1moPct: "1 mån månad month", dailyReturn1wPct: "1 vecka week", dailyReturn1yPct: "1 år year",
    dayVolume: "volume", changePct: "price change kursutveckling", newsImportance: "nyhetsvikt betydelse",
    profile_health: "finansiell hälsa", profile_dividend: "utdelning", profile_insiders: "insyn",
};
export function matchesMetricSearch(key, query) {
    const definition = SCREENER_METRICS[key];
    if (!definition) return false;
    const terms = String(query).trim().split(/\s+/).map(normalizeSearch).filter(Boolean);
    const fields = [key, definition.label, definition.shortLabel ?? "", definition.group, SEARCH_ALIASES[key] ?? ""].map(normalizeSearch);
    return terms.every(term => fields.some(field => field.includes(term)));
}
export function restrictScreenerState(state, plus) {
    if (plus) return { ...state, restricted: false };
    const filters = state.filters.filter(filter => FREE_METRICS.includes(filter.metric));
    const columns = state.columns.filter(key => FREE_METRICS.includes(key));
    const allowedSort = state.sort.key === "company" || FREE_METRICS.includes(state.sort.key);
    return { ...state, filters, columns: columns.length ? columns : FREE_DEFAULT_COLUMNS,
        sort: allowedSort ? state.sort : { key: "marketCap", direction: "desc" },
        restricted: filters.length !== state.filters.length || !allowedSort ||
            (state.columns.some(key => !FREE_METRICS.includes(key)) && state.columns !== DEFAULT_COLUMNS),
    };
}
export const finite = value => !["number", "string"].includes(typeof value) || String(value).trim() === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null;
export function dailyHistoryDate(row) {
    const value = row.daily?.asOfDate;
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}
// Historical amounts have their own qualified currency. The legacy live-quote
// currency fallback must not authorize a new historical SEK comparison.
const dailyCurrency = row => row.daily?.currency;
const svNumber = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 });
const svPrice = new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function formatScreenerValue(value, format, currency = "SEK", unit = "") {
    const number = finite(value);
    if (number == null) return "Saknas";
    if (format === "price") return `${svPrice.format(number)} ${currency === "SEK" ? "kr" : currency}`;
    if (format === "marketCap") return `${svNumber.format(number)} mdr`;
    if (format === "multiple") return `${svNumber.format(number)}x`;
    if (format === "pct") return `${svNumber.format(number)}%`;
    if (format === "signedPct") return `${number > 0 ? "+" : ""}${svNumber.format(number)}%`;
    return `${svNumber.format(number)}${unit ? ` ${unit}` : ""}`;
}
export function screenerMetricText(row, key) {
    const metric = SCREENER_METRICS[key];
    if (!metric) return "Saknas";
    const value = screenerValue(row, key);
    if (metric.dailyField && value === null) return "—";
    if (metric.type === "enum") return metric.options.find(option => option.value === value)?.label ?? "Saknas";
    const format = metric.format ?? (metric.unit === "%" ? metric.signed ? "signedPct" : "pct" : metric.unit === "x" ? "multiple" : null);
    const currency = metric.dailyField ? dailyCurrency(row) ?? "" : Object.hasOwn(row, "currency") ? row.currency ?? "" : "SEK";
    return formatScreenerValue(value, format, currency, metric.unit);
}
export function screenerValue(row, key) {
    if (key === "company") return row.name ?? row.symbol ?? "";
    const dailyField = SCREENER_METRICS[key]?.dailyField;
    if (dailyField) {
        if (!["available", "partial", "stale"].includes(row.daily?.status) || !dailyHistoryDate(row)) return null;
        if (key === "dailyAverageTurnover20" && dailyCurrency(row) !== "SEK") return null;
        const value = finite(row.daily?.[dailyField]);
        return key === "dailyAverageTurnover20" && value !== null ? value / 1e6 : value;
    }
    if (key.startsWith("profile_")) return finite(row.profile?.axes?.find(axis => axis.key === key.slice(8))?.score);
    if (key === "profileCoverage") return finite(row.profile?.coveragePct);
    if (key.startsWith("insider_")) return finite(row.insiders?.[key.slice(8)]);
    if (key === "newsAgeHours") return finite(row.news?.ageHours);
    if (key === "newsImportance") return finite(row.news?.importance);
    const value = row.fundamentals?.[key] ?? row.metrics?.[key] ?? row[key];
    if (key === "openingRangePosition") return ["above", "inside", "below"].includes(value) ? value : null;
    return key === "turnover" ? (finite(value) === null ? null : finite(value) / 1e6) : finite(value);
}
export function validFilter(filter) {
    const metric = SCREENER_METRICS[filter?.metric];
    if (!metric) return false;
    if (metric.type === "enum") return filter.operator === "eq" && metric.options.some(option => option.value === filter.value);
    const value = finite(filter.value);
    if (value === null || !["gt", "lt", "between"].includes(filter.operator)) return false;
    if ((metric.min !== undefined && value < metric.min) || (metric.max !== undefined && value > metric.max)) return false;
    const upper = finite(filter.upper);
    return filter.operator !== "between" || (upper !== null && upper >= value && (metric.max === undefined || upper <= metric.max));
}
export function matchesFilter(row, filter) {
    if (!validFilter(filter)) return false;
    // The price rule is expressed in SEK; do not compare EUR/DKK raw amounts.
    if (filter.metric === "price" && Object.hasOwn(row, "currency") && row.currency !== "SEK") return false;
    if (["dailyClose", "dailyAverageTurnover20"].includes(filter.metric) && dailyCurrency(row) !== "SEK") return false;
    const value = screenerValue(row, filter.metric);
    if (value === null) return false;
    if (filter.operator === "eq") return value === filter.value;
    if (filter.operator === "between") return value >= Number(filter.value) && value <= Number(filter.upper);
    return filter.operator === "gt" ? value > Number(filter.value) : value < Number(filter.value);
}
export function readScreenerQuery(search) {
    const params = new URLSearchParams(search);
    let filters;
    try { filters = JSON.parse(params.get("rules") ?? "[]"); } catch { filters = []; }
    return {
        filters: Array.isArray(filters) ? filters.filter(validFilter).slice(0, 30) : [],
        segment: (params.get("list") ?? "all").slice(0, 80), sector: (params.get("sector") ?? "all").slice(0, 100),
        columns: params.has("columns") ? [...new Set(params.get("columns").split(","))].filter(key => SCREENER_METRICS[key]) : DEFAULT_COLUMNS,
        sort: { key: SCREENER_METRICS[params.get("sort")] || params.get("sort") === "company" ? params.get("sort") : "marketCap", direction: params.get("direction") === "asc" ? "asc" : "desc" },
    };
}
export function writeScreenerQuery(search, state) {
    const params = new URLSearchParams(search);
    for (const [key, value] of Object.entries({ rules: state.filters.length ? JSON.stringify(state.filters) : null,
        list: state.segment === "all" ? null : state.segment, sector: state.sector === "all" ? null : state.sector,
        columns: state.columns.join(",") === DEFAULT_COLUMNS.join(",") ? null : state.columns.join(","),
        sort: state.sort.key === "marketCap" ? null : state.sort.key, direction: state.sort.direction === "desc" ? null : "asc" })) {
        if (value === null) params.delete(key); else params.set(key, value);
    }
    return params.toString();
}
