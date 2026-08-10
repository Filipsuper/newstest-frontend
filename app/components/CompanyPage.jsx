"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Bar,
    ComposedChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { FiChevronRight, FiExternalLink, FiSliders } from "react-icons/fi";
import { FaRegStar, FaStar } from "react-icons/fa6";
import StockSearch from "./StockSearch";
import { useAuthContext } from "../providers/AuthProvider";
import { toggleWatchlist } from "../utils/api";

const TABS = [
    { id: "overview", label: "Översikt" },
    { id: "financials", label: "Finansiellt" },
    { id: "estimates", label: "Estimat" },
    { id: "valuation", label: "Värdering" },
    { id: "news", label: "Nyheter & rapporter" },
    { id: "calendar", label: "Kalender" },
];

const RANGES = [
    { id: "6m", label: "6 mån", sessions: 130 },
    { id: "1y", label: "1 år", sessions: 260 },
    { id: "3y", label: "3 år", sessions: 780 },
    { id: "5y", label: "5 år", sessions: 1300 },
];

const money = (value, currency = "SEK") => {
    if (value == null || !Number.isFinite(Number(value))) return "Saknas";
    const number = Number(value);
    const abs = Math.abs(number);
    if (abs >= 1e9) return `${(number / 1e9).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} md ${currency}`;
    if (abs >= 1e6) return `${(number / 1e6).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} M ${currency}`;
    return `${number.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} ${currency}`;
};

const number = (value, digits = 1) =>
    value == null || !Number.isFinite(Number(value))
        ? "Saknas"
        : Number(value).toLocaleString("sv-SE", { maximumFractionDigits: digits });

const pct = (value) => {
    if (value == null || !Number.isFinite(Number(value))) return "–";
    const parsed = Number(value);
    return `${parsed > 0 ? "+" : ""}${parsed.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
};

const svDate = (value, compact = false) => {
    if (!value) return "Datum saknas";
    return new Date(value).toLocaleDateString("sv-SE", compact
        ? { day: "numeric", month: "short" }
        : { day: "numeric", month: "long", year: "numeric" });
};

const svDateTime = (value) => value
    ? new Date(value).toLocaleString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "Tidpunkt saknas";

const periodLabel = (period) => {
    if (!period) return "Period saknas";
    if (period.frequency === "ttm") return `${period.fiscalPeriod?.replace("-TTM", "") ?? period.periodEnd} · R12`;
    return period.fiscalPeriod ?? period.fiscalYear ?? period.periodEnd;
};

function movingAverage(rows, window) {
    let sum = 0;
    return rows.map((row, index) => {
        sum += row.close ?? 0;
        if (index >= window) sum -= rows[index - window].close ?? 0;
        return index >= window - 1 ? sum / window : null;
    });
}

function ChartTooltip({ active, payload, label, compare }) {
    if (!active || !payload?.length) return null;
    const values = Object.fromEntries(payload.map((entry) => [entry.dataKey, entry.value]));
    return (
        <div className="company-tooltip">
            <strong>{svDate(label)}</strong>
            {compare ? (
                <>
                    <span>Aktien {pct(values.returnPct)}</span>
                    <span>OMXSPI {pct(values.benchmarkPct)}</span>
                </>
            ) : (
                <>
                    <span>Kurs {number(values.close, 2)} kr</span>
                    {values.ma50 != null && <span>MA50 {number(values.ma50, 2)} kr</span>}
                    {values.ma200 != null && <span>MA200 {number(values.ma200, 2)} kr</span>}
                    {values.volume != null && <span>Volym {Number(values.volume).toLocaleString("sv-SE")}</span>}
                </>
            )}
        </div>
    );
}

function WatchlistButton({ symbol }) {
    const { user, isGuestUser, refreshUser } = useAuthContext();
    const [busy, setBusy] = useState(false);

    if (!user || isGuestUser) return null;

    const starred = (user.watchlist ?? []).includes(symbol);

    const handleToggle = async () => {
        if (busy) return;
        setBusy(true);
        try {
            await toggleWatchlist(symbol);
            await refreshUser();
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            className={`company-watchlist ${starred ? "active" : ""}`}
            onClick={handleToggle}
            disabled={busy}
            aria-label={starred ? "Ta bort från bevakningslistan" : "Lägg till i bevakningslistan"}
            title={starred ? "Ta bort från Mina aktier" : "Lägg till i Mina aktier"}
        >
            {starred ? <FaStar /> : <FaRegStar />}
        </button>
    );
}

function CompanyChart({ chart, companyName }) {
    const [range, setRange] = useState("1y");
    const [compare, setCompare] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [ma50, setMa50] = useState(false);
    const [ma200, setMa200] = useState(false);

    const data = useMemo(() => {
        const allRows = chart?.bars ?? [];
        const selectedRange = RANGES.find((item) => item.id === range) ?? RANGES[1];
        const ma50Values = movingAverage(allRows, 50);
        const ma200Values = movingAverage(allRows, 200);
        const benchmark = new Map((chart?.benchmark?.bars ?? []).map((row) => [row.date, row.close]));
        const start = Math.max(0, allRows.length - selectedRange.sessions);
        const visible = allRows.slice(start);
        const firstClose = visible.find((row) => row.close != null)?.close;
        const firstBenchmark = visible.map((row) => benchmark.get(row.date)).find((value) => value != null);
        return visible.map((row, visibleIndex) => {
            const index = start + visibleIndex;
            const benchmarkClose = benchmark.get(row.date);
            return {
                ...row,
                ma50: ma50Values[index],
                ma200: ma200Values[index],
                returnPct: firstClose ? ((row.close / firstClose) - 1) * 100 : null,
                benchmarkPct: firstBenchmark && benchmarkClose
                    ? ((benchmarkClose / firstBenchmark) - 1) * 100
                    : null,
            };
        });
    }, [chart, range]);

    if (!data.length) {
        return <p className="company-empty">Ingen historisk kursdata är tillgänglig ännu.</p>;
    }

    return (
        <section className="company-chart-section" aria-labelledby="price-heading">
            <div className="company-section-heading company-chart-heading">
                <div>
                    <p className="company-eyebrow">Historisk utveckling</p>
                    <h2 id="price-heading">Hur har aktien utvecklats?</h2>
                </div>
                <div className="company-chart-actions">
                    <button
                        className={compare ? "company-control company-control-active" : "company-control"}
                        onClick={() => setCompare((value) => !value)}
                    >
                        Jämför OMXSPI
                    </button>
                    <div className="company-settings-wrap">
                        <button
                            className="company-icon-control"
                            aria-label="Diagraminställningar"
                            aria-expanded={settingsOpen}
                            onClick={() => setSettingsOpen((value) => !value)}
                        >
                            <FiSliders />
                        </button>
                        {settingsOpen && (
                            <div className="company-chart-settings">
                                <label><input type="checkbox" checked={ma50} onChange={(event) => setMa50(event.target.checked)} /> MA50</label>
                                <label><input type="checkbox" checked={ma200} onChange={(event) => setMa200(event.target.checked)} /> MA200</label>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="company-range-row" aria-label="Välj tidsperiod">
                {RANGES.map((option) => (
                    <button
                        key={option.id}
                        disabled={(chart?.bars?.length ?? 0) < Math.min(option.sessions * 0.75, option.sessions - 15)}
                        className={range === option.id ? "company-range-active" : ""}
                        onClick={() => setRange(option.id)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            <div className="company-chart" role="img" aria-label={`Kursutveckling för ${companyName}`}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 14, right: 8, bottom: 4, left: 4 }}>
                        <XAxis dataKey="date" tickFormatter={(value) => svDate(value, true)} minTickGap={58} axisLine={false} tickLine={false} />
                        <YAxis
                            yAxisId="price"
                            orientation="right"
                            tickFormatter={(value) => compare ? `${value.toFixed(0)}%` : number(value, 0)}
                            axisLine={false}
                            tickLine={false}
                            width={54}
                            domain={["auto", "auto"]}
                        />
                        {!compare && <YAxis yAxisId="volume" hide domain={[0, (maximum) => maximum * 4]} />}
                        <Tooltip content={(props) => <ChartTooltip {...props} compare={compare} />} />
                        {!compare && <Bar yAxisId="volume" dataKey="volume" fill="var(--company-volume)" isAnimationActive={false} />}
                        <Line
                            yAxisId="price"
                            type="monotone"
                            dataKey={compare ? "returnPct" : "close"}
                            stroke="var(--company-yellow)"
                            strokeWidth={2.2}
                            dot={false}
                            isAnimationActive={false}
                        />
                        {compare && (
                            <Line yAxisId="price" type="monotone" dataKey="benchmarkPct" stroke="var(--company-blue)" strokeWidth={1.6} dot={false} isAnimationActive={false} />
                        )}
                        {!compare && ma50 && (
                            <Line yAxisId="price" type="monotone" dataKey="ma50" stroke="var(--company-blue)" strokeWidth={1.4} dot={false} isAnimationActive={false} />
                        )}
                        {!compare && ma200 && (
                            <Line yAxisId="price" type="monotone" dataKey="ma200" stroke="var(--company-muted-line)" strokeWidth={1.4} dot={false} isAnimationActive={false} />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
            <div className="company-chart-legend">
                <span><i className="legend-yellow" />{companyName}</span>
                {compare && <span><i className="legend-blue" />OMXSPI</span>}
                {!compare && ma50 && <span><i className="legend-blue" />MA50</span>}
                {!compare && ma200 && <span><i className="legend-muted" />MA200</span>}
            </div>
        </section>
    );
}

function Metric({ label, value, detail }) {
    return (
        <div className="company-metric">
            <span>{label}</span>
            <strong>{value}</strong>
            {detail && <small>{detail}</small>}
        </div>
    );
}

function FinancialSnapshot({ highlights }) {
    const period = highlights?.ttm ?? highlights?.annual ?? highlights?.quarterly;
    if (!period) return <p className="company-empty">Finansiella nyckeltal saknas för bolaget.</p>;
    const currency = highlights?.currency ?? "SEK";
    return (
        <section className="company-section" aria-labelledby="financial-question">
            <div className="company-section-heading">
                <div>
                    <p className="company-eyebrow">Finansiell överblick</p>
                    <h2 id="financial-question">Vad tjänar bolaget?</h2>
                </div>
                <Link className="company-text-link" href="?tab=financials">Visa finansiellt <FiChevronRight /></Link>
            </div>
            <div className="company-metric-grid">
                <Metric label="Omsättning" value={money(period.revenue, currency)} detail={periodLabel(period)} />
                <Metric label="EBIT" value={money(period.ebit, currency)} detail={`${number(period.ebitMarginPct)}% marginal`} />
                <Metric label="Nettoresultat" value={money(period.netIncome, currency)} />
                <Metric label="Fritt kassaflöde" value={money(period.freeCashFlow, currency)} />
                <Metric label="Nettoskuld" value={money(period.netDebt, currency)} />
                <Metric label="Nettoskuld / EBITDA" value={period.netDebtToEbitda == null ? "Saknas" : `${number(period.netDebtToEbitda, 2)}×`} />
            </div>
            <p className="company-source">Källa: {highlights?.source ?? "Yahoo"} · Uppdaterad {svDate(highlights?.dataAsOf)}</p>
        </section>
    );
}

function CalendarPreview({ calendar }) {
    const earnings = calendar?.earningsDates?.[0] ?? calendar?.events?.find((event) => event.type === "earnings")?.date;
    return (
        <section className="company-context-section" aria-labelledby="calendar-preview-heading">
            <p className="company-eyebrow">Nästa händelse</p>
            <h2 id="calendar-preview-heading">{earnings ? svDate(earnings) : "Inget datum bekräftat"}</h2>
            <p>{earnings ? "Nästa rapportdatum enligt tillgänglig bolagskalender." : "Vi visar datumet när bolaget eller en verifierad källa publicerar det."}</p>
            <Link className="company-text-link" href="?tab=calendar">Öppna kalendern <FiChevronRight /></Link>
        </section>
    );
}

function NewsList({ news, compact = false }) {
    if (!news?.length) return <p className="company-empty">Inga bolagsspecifika nyheter finns ännu.</p>;
    return (
        <div className="company-news-list">
            {news.slice(0, compact ? 3 : 8).map((story) => (
                <article key={story.id} className="company-news-item">
                    <div className="company-news-meta">
                        <time>{svDate(story.publishedAt, true)}</time>
                        {(story.tags ?? []).slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                    <h3>{story.headline}</h3>
                    {!compact && story.summary && <p>{story.summary}</p>}
                </article>
            ))}
        </div>
    );
}

function OverviewTab({ data }) {
    const { summary, chart, news } = data;
    return (
        <>
            <CompanyChart chart={chart} companyName={summary.profile.name ?? summary.symbol} />
            <div className="company-overview-layout">
                <div className="company-main-column">
                    <section className="company-section" aria-labelledby="company-question">
                        <p className="company-eyebrow">Bolaget i korthet</p>
                        <h2 id="company-question">Vad gör bolaget?</h2>
                        <p className="company-description">{summary.profile.description || "Bolagsbeskrivning saknas ännu."}</p>
                        <dl className="company-facts">
                            {summary.profile.sector && <><dt>Sektor</dt><dd>{summary.profile.sector}</dd></>}
                            {summary.profile.industry && <><dt>Bransch</dt><dd>{summary.profile.industry}</dd></>}
                            {summary.profile.employees && <><dt>Anställda</dt><dd>{Number(summary.profile.employees).toLocaleString("sv-SE")}</dd></>}
                            {summary.profile.website && <><dt>Webbplats</dt><dd><a href={summary.profile.website} target="_blank" rel="noreferrer">Besök bolaget <FiExternalLink /></a></dd></>}
                        </dl>
                    </section>
                    <FinancialSnapshot highlights={summary.financialHighlights} />
                </div>
                <aside className="company-context-column">
                    <CalendarPreview calendar={summary.calendar} />
                    <section className="company-context-section" aria-labelledby="news-preview-heading">
                        <div className="company-section-heading">
                            <div>
                                <p className="company-eyebrow">Senaste bolagsnytt</p>
                                <h2 id="news-preview-heading">Vad har hänt?</h2>
                            </div>
                        </div>
                        <NewsList news={news} compact />
                        <Link className="company-text-link" href="?tab=news">Alla nyheter <FiChevronRight /></Link>
                    </section>
                </aside>
            </div>
        </>
    );
}

const FINANCIAL_ROWS = [
    ["Omsättning", "revenue", "money"],
    ["EBIT", "ebit", "money"],
    ["EBITDA", "ebitda", "money"],
    ["Nettoresultat", "netIncome", "money"],
    ["Fritt kassaflöde", "freeCashFlow", "money"],
    ["EBIT-marginal", "ebitMarginPct", "pct"],
];

function FinancialsTab({ financials }) {
    const [frequency, setFrequency] = useState(financials?.ttm?.length ? "ttm" : "annual");
    const options = [
        ["annual", "År", financials?.annual],
        ["quarterly", "Kvartal", financials?.quarterly],
        ["ttm", "R12", financials?.ttm],
    ];
    const periods = (options.find(([id]) => id === frequency)?.[2] ?? []).slice(-6);
    const currency = financials?.currency ?? "SEK";
    return (
        <section className="company-tab-section">
            <p className="company-eyebrow">Rapporterat och härlett</p>
            <h2>Finansiell utveckling</h2>
            <p className="company-intro">Jämför bolagets senaste perioder. R12 beräknas bara när fyra sammanhängande kvartal finns.</p>
            <div className="company-period-tabs">
                {options.map(([id, label, values]) => (
                    <button key={id} disabled={!values?.length} className={frequency === id ? "active" : ""} onClick={() => setFrequency(id)}>{label}</button>
                ))}
            </div>
            {!periods.length ? <p className="company-empty">Data saknas för vald period.</p> : (
                <div className="company-table-wrap">
                    <table className="company-financial-table">
                        <thead><tr><th>Nyckeltal</th>{periods.map((period) => <th key={period.periodKey ?? period.periodEnd}>{periodLabel(period)}</th>)}</tr></thead>
                        <tbody>
                            {FINANCIAL_ROWS.map(([label, key, type]) => (
                                <tr key={key}><th>{label}</th>{periods.map((period) => (
                                    <td key={period.periodKey ?? period.periodEnd}>{type === "money" ? money(period[key], currency) : period[key] == null ? "–" : `${number(period[key])}%`}</td>
                                ))}</tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <p className="company-source">Faktiska värden och OMXsum-härledda R12-perioder visas separat. Saknade värden visas aldrig som noll.</p>
        </section>
    );
}

function EstimatesTab({ summary, estimates }) {
    const calendar = summary.calendar;
    const latest = estimates?.latest;
    return (
        <section className="company-tab-section">
            <p className="company-eyebrow">Offentligt konsensus</p>
            <h2>Vad väntar marknaden sig?</h2>
            <p className="company-intro">Estimat visas bara med källa och period. Täckningen är fortfarande begränsad för mindre svenska bolag.</p>
            <div className="company-metric-grid company-metric-grid-small">
                <Metric label="EPS-estimat" value={calendar?.epsEstimate?.average == null ? "Saknas" : `${number(calendar.epsEstimate.average, 2)} ${calendar.currency ?? "SEK"}`} />
                <Metric label="Omsättningsestimat" value={money(calendar?.revenueEstimate?.average, calendar?.currency ?? "SEK")} />
                <Metric label="Nästa estimatperiod" value={latest?.fiscalPeriod ?? summary.upcomingEstimate?.fiscalPeriod ?? "Saknas"} />
            </div>
            {!latest && <p className="company-empty">Inget öppet konsensusestimat har samlats in för bolaget ännu.</p>}
        </section>
    );
}

function ValuationTab() {
    return (
        <section className="company-tab-section company-narrow-copy">
            <p className="company-eyebrow">Under utveckling</p>
            <h2>Värdering utan svart låda</h2>
            <p className="company-intro">OMXsum publicerar inte ett förenklat totalbetyg eller ett påhittat riktvärde. Den här sidan öppnas när jämförelsegrupper, aktieantal och värderingsdefinitioner kan visas tillsammans med varje beräkning.</p>
        </section>
    );
}

function NewsTab({ data }) {
    return (
        <section className="company-tab-section">
            <p className="company-eyebrow">Primärkällor först</p>
            <h2>Nyheter och rapporter</h2>
            <div className="company-news-report-layout">
                <NewsList news={data.news} />
                <div className="company-report-list">
                    <h3>Rapporter</h3>
                    {(data.reports ?? []).length ? data.reports.map((report) => (
                        <a key={report.reportDocumentId} href={report.attachment?.url ?? report.releaseUrl} target="_blank" rel="noreferrer">
                            <span>{report.title ?? report.periodLabel ?? report.fiscalPeriod}</span>
                            <small>{svDate(report.publishedAt)}</small>
                        </a>
                    )) : <p className="company-empty">Inga rapportdokument hittades.</p>}
                </div>
            </div>
        </section>
    );
}

function CalendarTab({ calendar }) {
    const events = calendar?.events ?? [];
    return (
        <section className="company-tab-section">
            <p className="company-eyebrow">Bolagets datum</p>
            <h2>Rapporter och kapitalhändelser</h2>
            <div className="company-calendar-list">
                {events.length ? events.map((event) => (
                    <div key={event.eventId ?? `${event.type}-${event.date}`}>
                        <time>{svDate(event.date)}</time>
                        <div><strong>{event.fiscalPeriod ?? event.type}</strong><span>{event.type?.replaceAll("_", " ")}</span></div>
                    </div>
                )) : <p className="company-empty">Inga bolagsbekräftade kalenderhändelser finns ännu.</p>}
            </div>
        </section>
    );
}

function Performance({ returns }) {
    const periods = [["1 mån", "1m"], ["3 mån", "3m"], ["6 mån", "6m"], ["I år", "ytd"], ["1 år", "1y"]];
    return (
        <div className="company-performance" aria-label="Kursutveckling per period">
            {periods.map(([label, key]) => {
                const value = returns?.[key];
                const tone = value == null ? "neutral" : value >= 0 ? "positive" : "negative";
                return <div key={key}><span>{label}</span><strong className={tone}>{pct(value)}</strong></div>;
            })}
        </div>
    );
}

export default function CompanyPage({ symbol, initialData, initialTab }) {
    const router = useRouter();
    const allowedTab = TABS.some((tab) => tab.id === initialTab) ? initialTab : "overview";
    const [tab, setTab] = useState(allowedTab);

    if (!initialData?.summary) {
        return (
            <main className="company-page company-not-found">
                <StockSearch placeholder="Sök efter ett svenskt bolag…" />
                <h1>Aktien kunde inte hittas</h1>
                <p>Kontrollera symbolen eller sök efter bolagsnamnet.</p>
            </main>
        );
    }

    const { summary } = initialData;
    const profile = summary.profile;
    const quote = summary.quote;
    const changeTone = quote?.changePct == null ? "neutral" : quote.changePct >= 0 ? "positive" : "negative";

    const selectTab = (nextTab) => {
        setTab(nextTab);
        const path = `/aktie/${encodeURIComponent(symbol)}${nextTab === "overview" ? "" : `?tab=${nextTab}`}`;
        router.replace(path, { scroll: false });
    };

    return (
        <main className="company-page">
            <div className="company-search-row">
                <StockSearch placeholder="Sök efter ett svenskt bolag…" />
            </div>

            <header className="company-header">
                <div className="company-identity">
                    <div className="company-symbol-row">
                        <span>{profile.nativeSymbol ?? symbol.replace(".ST", "")}</span>
                        {profile.market && <small>{profile.market}</small>}
                        {profile.segment && <small>{profile.segment.replaceAll("_", " ")}</small>}
                    </div>
                    <div className="company-title-row">
                        <h1>{profile.name ?? symbol}</h1>
                        <WatchlistButton symbol={symbol} />
                    </div>
                    <p>{profile.sector ?? "Sektor saknas"}{profile.industry ? ` · ${profile.industry}` : ""}</p>
                </div>
                <div className="company-quote">
                    <strong>{quote?.price == null ? "Kurs saknas" : `${number(quote.price, 2)} kr`}</strong>
                    <span className={changeTone}>{quote?.change == null ? "–" : `${quote.change > 0 ? "+" : ""}${number(quote.change, 2)} kr · ${pct(quote.changePct)}`}</span>
                    <small>{quote?.verifiedRealtime && quote?.fresh ? "Verifierad realtid" : quote?.quoteTime ? `Senaste tillgängliga · ${svDateTime(quote.quoteTime)}${quote.source ? ` · ${quote.source}` : ""}` : "Tidpunkt saknas"}</small>
                </div>
            </header>

            <Performance returns={summary.performance?.returns} />

            <nav className="company-tabs" aria-label="Bolagsnavigation">
                {TABS.map((item) => (
                    <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => selectTab(item.id)}>{item.label}</button>
                ))}
            </nav>

            {tab === "overview" && <OverviewTab data={initialData} />}
            {tab === "financials" && <FinancialsTab financials={initialData.financials} />}
            {tab === "estimates" && <EstimatesTab summary={summary} estimates={initialData.estimates} />}
            {tab === "valuation" && <ValuationTab />}
            {tab === "news" && <NewsTab data={initialData} />}
            {tab === "calendar" && <CalendarTab calendar={summary.calendar} />}
        </main>
    );
}
