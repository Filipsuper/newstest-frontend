"use client";

import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
    Bar,
    CartesianGrid,
    Cell,
    ComposedChart,
    Line,
    ReferenceArea,
    ReferenceDot,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { FiChevronLeft, FiChevronRight, FiExternalLink, FiInfo, FiShare2, FiSliders } from "react-icons/fi";
import { FaLock, FaRegStar, FaScaleBalanced, FaStar } from "react-icons/fa6";
import { useAuthContext } from "../providers/AuthProvider";
import { useModal } from "../providers/ModalProvider";
import LogInModal from "../modals/logInModal";
import ShareStockModal from "../modals/ShareStockModal";
import NewsModal from "./NewsModal";
import { fetchCompanyIntraday, fetchInsiders, fetchValuation, toggleWatchlist } from "../utils/api";
import { tagLabel } from "../utils/newsTags";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const TABS = [
    { id: "overview", label: "Översikt" },
    { id: "financials", label: "Finansiellt" },
    { id: "estimates", label: "Estimat" },
    { id: "valuation", label: "Värdering" },
    { id: "insiders", label: "Insyn" },
    { id: "news", label: "Nyheter & rapporter" },
    { id: "calendar", label: "Kalender" },
];

const LINE_FADES = [
    ["company-line-fade-yellow", "--company-yellow", "--company-yellow-bright"],
    ["company-line-fade-blue", "--company-blue", "--company-blue-bright"],
    ["company-line-fade-muted", "--company-muted-line", "--company-muted-line-bright"],
];

const RANGES = [
    { id: "1d", label: "1 dag", intraday: true },
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

const svTime = (value) => value
    ? new Date(value).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })
    : "–";

const stockholmDay = (value) => new Date(value).toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });

const fiscalPeriodRank = (value) => {
    const match = typeof value === "string" ? /^(\d{4})-Q([1-4])$/.exec(value) : null;
    return match ? Number(match[1]) * 10 + Number(match[2]) : null;
};

function upcomingEstimateSnapshot(snapshot, financials) {
    if (!snapshot) return null;
    const estimateRank = fiscalPeriodRank(snapshot.fiscalPeriod);
    const actualRanks = [
        fiscalPeriodRank(financials?.latestReport?.fiscalPeriod),
        ...(financials?.quarterly ?? []).map((period) => fiscalPeriodRank(period.fiscalPeriod)),
    ].filter((rank) => rank != null);

    if (estimateRank != null && actualRanks.length) {
        return estimateRank > Math.max(...actualRanks) ? snapshot : null;
    }

    const reportDate = String(snapshot.reportDate ?? "").slice(0, 10);
    return !/^\d{4}-\d{2}-\d{2}$/.test(reportDate) || reportDate >= stockholmDay(Date.now())
        ? snapshot
        : null;
}

const periodLabel = (period) => {
    if (!period) return "Period saknas";
    if (period.estimate) return `${period.periodLabel ?? period.fiscalPeriod ?? period.periodEnd}E`;
    if (period.frequency === "ttm") return `${period.fiscalPeriod?.replace("-TTM", "") ?? period.periodEnd} · R12`;
    return period.fiscalPeriod ?? period.fiscalYear ?? period.periodEnd;
};

// Matches the slug scheme the article route expects: spaces become hyphens,
// existing hyphens become underscores.
const articleSlug = (title = "") => title.replaceAll("-", "_").replaceAll(" ", "-");

const compactAmount = new Intl.NumberFormat("sv-SE", {
    notation: "compact",
    maximumFractionDigits: 1,
});

const storyUrl = (story) => story.primarySource?.url ?? story.sources?.find((source) => source.url)?.url ?? null;

// Chart event markers -------------------------------------------------------
// A story only earns a mark on the chart if the wire ranked it material; the
// rest of the company news stays in the news list.
const MATERIAL_NEWS_IMPORTANCE = 70;
const MAX_NEWS_MARKERS_PER_DAY = 2;

const EVENT_MARKERS = {
    earnings: { rank: 0, letter: "R", legend: "Rapport", className: "company-marker-report" },
    dividend: { rank: 1, letter: "U", legend: "Utdelning", className: "company-marker-dividend" },
    news: { rank: 2, letter: "N", legend: "Väsentlig nyhet", className: "company-marker-news" },
};

const eventDayKey = (value) => {
    if (!value) return "";
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text.slice(0, 10)) && !text.includes("T")) return text.slice(0, 10);
    const time = Date.parse(text);
    return Number.isFinite(time) ? stockholmDay(time) : "";
};

const daysApart = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

// A dividend on a Sunday or a report released before the open still belongs to
// a session the chart actually draws, so events attach to the first trading day
// at or after them. Anything more than a week away from a traded day, or
// outside the stored history, has no bar to point at and is left out.
function snapToTradingDay(dayKey, barDates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return null;
    if (!barDates.length || dayKey < barDates[0] || dayKey > barDates.at(-1)) return null;
    let low = 0;
    let high = barDates.length - 1;
    while (low < high) {
        const middle = Math.floor((low + high) / 2);
        if (barDates[middle] < dayKey) low = middle + 1;
        else high = middle;
    }
    return daysApart(dayKey, barDates[low]) <= 7 ? barDates[low] : null;
}

function buildEventMarkers({ calendar, news, reports, bars }) {
    const barDates = bars.map((bar) => bar.date);
    const byDate = new Map();

    const add = (rawDate, item) => {
        const date = snapToTradingDay(eventDayKey(rawDate), barDates);
        if (!date) return;
        const items = byDate.get(date) ?? [];
        if (item.type === "news") {
            if (items.some((existing) => existing.label === item.label)) return;
            if (items.filter((existing) => existing.type === "news").length >= MAX_NEWS_MARKERS_PER_DAY) return;
        } else if (items.some((existing) => existing.type === item.type)) {
            // One report and one dividend line per session. Reports are added
            // first so the issuer document, not the calendar entry, keeps the link.
            return;
        }
        byDate.set(date, [...items, item]);
    };

    (reports ?? []).forEach((report) => add(report.publishedAt, {
        type: "earnings",
        label: report.periodLabel ?? report.fiscalPeriod ?? "Rapport",
        url: report.attachment?.url ?? report.releaseUrl ?? null,
    }));
    (calendar?.events ?? []).forEach((event) => {
        if (event.type === "earnings") add(event.date, { type: "earnings", label: event.fiscalPeriod ?? "Rapport" });
        if (event.type === "ex_dividend") add(event.date, { type: "dividend", label: "X-dag", detail: event.fiscalPeriod });
        if (event.type === "dividend") add(event.date, { type: "dividend", label: "Utdelning", detail: event.fiscalPeriod });
    });
    add(calendar?.exDividendDate, { type: "dividend", label: "X-dag" });
    add(calendar?.dividendDate, { type: "dividend", label: "Utdelning" });
    (news ?? []).forEach((story) => {
        if (Number(story.importance) < MATERIAL_NEWS_IMPORTANCE) return;
        // Carries the story itself so the mark opens the reader, not the issuer's site.
        add(story.publishedAt, { type: "news", label: story.headline, story });
    });

    return new Map([...byDate].map(([date, items]) => [
        date,
        [...items].sort((left, right) => EVENT_MARKERS[left.type].rank - EVENT_MARKERS[right.type].rank),
    ]));
}

const markerTypeLabel = (item) => (item.type === "earnings"
    ? `Rapport ${item.label}`
    : item.detail ? `${item.label} ${item.detail}` : item.label);

// "Vad rör aktien?" -------------------------------------------------------
// Composed entirely from what the wire already publishes: its own headline and
// summary, the reaction it measured, and the index over the same days. Nothing
// here is generated, so the box states only what a source says and what the
// numbers show — never why the market did something.
//
// Importance alone picks the wrong story: insider transactions score 66-76 and
// would outrank the quarter's report. REGULATORY co-occurs with half the wire
// and never makes a story material on its own.
const DRIVER_TAGS = new Set([
    "EARNINGS", "ORDER", "GUIDANCE", "M_AND_A", "MA", "M&A", "MERGER", "ACQUISITION",
    "DISPOSAL", "DIVESTMENT", "CAPITAL_RAISE", "RIGHTS_ISSUE", "BUYBACK", "MANAGEMENT",
    "AGREEMENT", "PARTNERSHIP", "LEGAL", "HALT",
]);
// Checked before anything else, because these arrive alongside a strong tag:
// an insider sale is filed as INSIDER + DISPOSAL and would otherwise be
// presented as the reason a large cap moved.
const EXCLUDED_DRIVER_TAGS = new Set(["INSIDER", "REPORT_INVITATION", "OBSERVATION"]);
const DRIVER_MIN_IMPORTANCE = 65;
const DRIVER_SESSION_WINDOW = 5;
const MAX_DRIVERS = 2;

function selectMoveDrivers(news, bars) {
    if (!news?.length || !bars?.length) return [];
    // Five sessions of real trading days rather than calendar days, so a long
    // weekend does not quietly shorten the window.
    const windowStart = bars[Math.max(0, bars.length - DRIVER_SESSION_WINDOW)].date;
    return news
        .filter((story) => Number(story.importance) >= DRIVER_MIN_IMPORTANCE
            && !(story.tags ?? []).some((tag) => EXCLUDED_DRIVER_TAGS.has(tag))
            && (story.tags ?? []).some((tag) => DRIVER_TAGS.has(tag))
            && eventDayKey(story.publishedAt) >= windowStart)
        .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
        .slice(0, MAX_DRIVERS);
}

// The index across the same days, so a broad market move is not read as company
// news. Benchmark history is daily, so on the day a story breaks there is no
// index bar to compare against yet and the number is left out instead of
// approximated from a different window.
function benchmarkMoveSince(dayKey, bars) {
    const start = (bars ?? []).findLast((bar) => bar.date <= dayKey);
    const end = (bars ?? []).at(-1);
    if (!start || !end || start.date >= end.date) return null;
    if (!Number.isFinite(start.close) || !Number.isFinite(end.close) || !start.close) return null;
    return ((end.close / start.close) - 1) * 100;
}

function MoveDrivers({ drivers, benchmarkBars }) {
    const { openModal } = useModal();
    const [lead, ...rest] = drivers;
    const benchmarkPct = benchmarkMoveSince(eventDayKey(lead.publishedAt), benchmarkBars);
    const reactionPct = Number(lead.reaction?.pct);
    const tag = (lead.tags ?? []).find((item) => DRIVER_TAGS.has(item));
    const openStory = (story) => openModal(<NewsModal story={story} />);

    return (
        <aside className="company-mover" aria-labelledby="company-mover-heading">
            <div className="company-mover-head">
                <p className="company-eyebrow" id="company-mover-heading">Vad rör aktien?</p>
                <time dateTime={lead.publishedAt}>{svDateTime(lead.publishedAt)}</time>
            </div>
            <h3 className="company-mover-headline">
                <button type="button" onClick={() => openStory(lead)}>{lead.headline}</button>
            </h3>
            {tag && <span className="company-mover-tag">{tagLabel(tag)}</span>}
            {lead.summary && <ExpandableText className="company-mover-summary" text={lead.summary} lines={4} />}
            <div className="company-mover-metrics">
                {Number.isFinite(reactionPct) && (
                    <div title="Kursreaktion sedan nyheten publicerades">
                        <span>Sedan nyheten</span>
                        <strong className={reactionPct >= 0 ? "positive" : "negative"}>{pct(reactionPct)}</strong>
                    </div>
                )}
                {benchmarkPct != null && (
                    <div title="OMX Stockholm All-Share, stängning före nyheten till senaste stängning">
                        <span>OMXSPI</span>
                        <strong>{pct(benchmarkPct)}</strong>
                    </div>
                )}
            </div>
            <p className="company-mover-source">
                <span>Källa: {lead.primarySource?.publisher ?? lead.primarySource?.name ?? "Okänd"}</span>
                <button type="button" onClick={() => openStory(lead)}>Läs nyheten</button>
            </p>
            {rest.length > 0 && (
                <div className="company-mover-more">
                    <p className="company-eyebrow">Även i perioden</p>
                    {rest.map((story) => (
                        <button key={story.id} type="button" onClick={() => openStory(story)}>
                            <time>{svDate(story.publishedAt, true)}</time>
                            <span>{story.headline}</span>
                        </button>
                    ))}
                </div>
            )}
        </aside>
    );
}

function EventMarker({ cx, cy, items, onOpenStory }) {
    if (!Number.isFinite(cx) || !Number.isFinite(cy) || !items?.length) return null;
    const marker = EVENT_MARKERS[items[0].type];
    // A news mark opens the story in the reader; a report mark points at the
    // issuer's own PDF, which belongs in a new tab.
    const story = items.find((item) => item.story)?.story ?? null;
    const url = items.find((item) => item.url)?.url ?? null;
    const activate = story
        ? () => onOpenStory(story)
        : url ? () => window.open(url, "_blank", "noopener,noreferrer") : undefined;
    return (
        <g
            role="img"
            aria-label={items.map(markerTypeLabel).join(", ")}
            className={`company-event-marker ${marker.className}${activate ? " company-event-marker-linked" : ""}`}
            transform={`translate(${cx}, ${cy - 11})`}
            onClick={activate}
        >
            <circle r="7.5" />
            <text textAnchor="middle" dy="0.32em">{marker.letter}</text>
        </g>
    );
}

function estimatePeriodFromSnapshot(snapshot) {
    if (!snapshot?.metrics?.length) return null;
    const eligible = snapshot.metrics.filter((metric) => !metric.scope && Number.isFinite(Number(metric.amount)));
    const amountMetric = (...keys) => keys
        .map((key) => eligible.find((metric) => metric.key === key && metric.unit !== "%" && metric.currency))
        .find(Boolean) ?? null;
    const marginMetric = (...keys) => keys
        .map((key) => eligible.find((metric) => metric.key === key && (metric.unit === "%" || /margin/i.test(metric.label ?? ""))))
        .find(Boolean) ?? eligible.find((metric) => /^ebit/.test(metric.key ?? "") && /margin/i.test(metric.label ?? "")) ?? null;

    const revenue = amountMetric("revenue");
    const ebitReported = amountMetric("ebit");
    const ebitAdjusted = amountMetric("ebit_adjusted");
    const ebitaReported = amountMetric("ebita");
    const ebitaAdjusted = amountMetric("ebita_adjusted");
    const ebitdaReported = amountMetric("ebitda");
    const ebitdaAdjusted = amountMetric("ebitda_adjusted");
    const marginReported = marginMetric("ebit_margin");
    const marginAdjusted = marginMetric("ebit_margin_adjusted", "ebit_adjusted");
    const selectedEbit = ebitReported ?? ebitAdjusted;
    const selectedEbita = ebitaReported ?? ebitaAdjusted;
    const selectedEbitda = ebitdaReported ?? ebitdaAdjusted;
    const selectedMargin = marginReported ?? marginAdjusted;
    if (![revenue, selectedEbit, selectedEbita, selectedEbitda, selectedMargin].some(Boolean)) return null;

    return {
        periodKey: snapshot.snapshotId,
        periodEnd: snapshot.reportDate ?? snapshot.publishedAt,
        fiscalPeriod: snapshot.fiscalPeriod,
        periodLabel: snapshot.periodLabel,
        frequency: "quarterly",
        dataType: "estimate",
        estimate: true,
        revenue: revenue?.amount ?? null,
        ebit: selectedEbit?.amount ?? null,
        ebita: selectedEbita?.amount ?? null,
        ebitda: selectedEbitda?.amount ?? null,
        ebitMarginPct: selectedMargin?.amount ?? null,
        estimateAdjusted: {
            ebit: !ebitReported && Boolean(ebitAdjusted),
            ebita: !ebitaReported && Boolean(ebitaAdjusted),
            ebitda: !ebitdaReported && Boolean(ebitdaAdjusted),
            ebitMarginPct: !marginReported && Boolean(marginAdjusted),
        },
        estimateSource: {
            ...snapshot.source,
            contributors: snapshot.contributors,
            publishedAt: snapshot.publishedAt,
        },
    };
}

function statementParagraphs(text) {
    return String(text ?? "")
        .trim()
        .replace(/([A-Za-zÅÄÖåäö])-\s*\n\s*([a-zåäö])/g, "$1$2")
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
        .filter(Boolean);
}

function movingAverage(rows, window) {
    let sum = 0;
    return rows.map((row, index) => {
        sum += row.close ?? 0;
        if (index >= window) sum -= rows[index - window].close ?? 0;
        return index >= window - 1 ? sum / window : null;
    });
}

// Recharts left-anchors the ticks of a right-side axis, leaving the rest of the
// axis box as dead space. Anchor them to the axis' right edge instead.
function RightAxisTick({ x, y, width, payload, format }) {
    return (
        <text x={x + width - 2} y={y} dy="0.32em" textAnchor="end" className="recharts-cartesian-axis-tick-value">
            {format(payload.value)}
        </text>
    );
}

function LiveEndpointDot({ cx, cy }) {
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
    return (
        <g className="company-live-endpoint" aria-hidden="true">
            <circle className="company-live-endpoint-pulse" cx={cx} cy={cy} r="7" />
            <circle className="company-live-endpoint-core" cx={cx} cy={cy} r="3.2" />
        </g>
    );
}

function ChartTooltip({ active, payload, label, compare, intraday }) {
    if (!active || !payload?.length) return null;
    const values = Object.fromEntries(payload.map((entry) => [entry.dataKey, entry.value]));
    const events = payload[0]?.payload?.events ?? [];
    return (
        <div className="company-tooltip">
            <strong>{intraday ? svDateTime(label) : svDate(label)}</strong>
            {events.length > 0 && (
                <div className="company-tooltip-events">
                    {events.map((event, index) => (
                        <span key={`${event.type}-${index}`} className={EVENT_MARKERS[event.type].className}>
                            <i />{markerTypeLabel(event)}
                        </span>
                    ))}
                </div>
            )}
            {intraday ? (
                <span>Kurs {number(values.currentPrice ?? values.previousPrice, 2)} kr</span>
            ) : compare ? (
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

// Opens the share sheet for the move the reader is actually looking at: the
// selected period and its return.
function ShareMoveButton({ symbol, companyName, range, ma50, ma200 }) {
    const { openModal } = useModal();

    return (
        <button
            className="company-icon-control"
            aria-label="Dela aktien"
            title="Dela aktien"
            onClick={() => openModal(
                <ShareStockModal
                    symbol={symbol}
                    companyName={companyName}
                    rangeId={range}
                    ma50={ma50}
                    ma200={ma200}
                />,
            )}
        >
            <FiShare2 />
        </button>
    );
}

function CompanyChart({ chart, companyName, summary, symbol, initialRange, initialMovingAverages = "", news, reports }) {
    const [range, setRange] = useState(
        RANGES.some((option) => option.id === initialRange) ? initialRange : "1y",
    );
    const [compare, setCompare] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const initialMaSelection = String(initialMovingAverages).split(",");
    const [ma50, setMa50] = useState(initialMaSelection.includes("50"));
    const [ma200, setMa200] = useState(initialMaSelection.includes("200"));
    const [showEvents, setShowEvents] = useState(true);
    const { openModal } = useModal();
    const [intraday, setIntraday] = useState(null);
    const [intradayError, setIntradayError] = useState("");
    const [intradayLive, setIntradayLive] = useState(false);
    const lastLiveTickRef = useRef(null);

    const markers = useMemo(() => buildEventMarkers({
        calendar: summary?.calendar,
        news,
        reports,
        bars: chart?.bars ?? [],
    }), [summary?.calendar, news, reports, chart?.bars]);

    // Most companies have no material story in a given week, and an empty
    // column beside the chart would read as something failing to load. When
    // there is nothing to explain, the chart simply takes the full width.
    const drivers = useMemo(
        () => selectMoveDrivers(news, chart?.bars ?? []),
        [news, chart?.bars],
    );

    const dailyData = useMemo(() => {
        const allRows = chart?.bars ?? [];
        const selectedRange = RANGES.find((item) => item.id === range && !item.intraday) ?? RANGES[2];
        // The wire's story history only reaches back a few months, so on the
        // multi-year ranges the news marks would bunch against the right edge
        // instead of explaining moves. Reports and dividends span the full
        // stored calendar and stay.
        const withNews = range === "6m" || range === "1y";
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
            const rowEvents = (showEvents ? markers.get(row.date) ?? [] : [])
                .filter((event) => withNews || event.type !== "news");
            return {
                ...row,
                ma50: ma50Values[index],
                ma200: ma200Values[index],
                events: rowEvents,
                returnPct: firstClose ? ((row.close / firstClose) - 1) * 100 : null,
                benchmarkPct: firstBenchmark && benchmarkClose
                    ? ((benchmarkClose / firstBenchmark) - 1) * 100
                    : null,
            };
        });
    }, [chart, range, markers, showEvents]);

    useEffect(() => {
        if (range !== "1d") {
            setIntradayLive(false);
            return undefined;
        }

        let active = true;
        let source;
        let staleTimer;

        const openStream = () => {
            if (!active) return;
            source = new EventSource(`${API_URL}/feed/company/${encodeURIComponent(symbol)}/stream`);

            source.addEventListener("quote", (event) => {
                if (!active) return;
                try {
                    const tick = JSON.parse(event.data);
                    if (tick.symbol !== symbol || !Number.isFinite(Number(tick.price)) || !Number.isFinite(Number(tick.ts))) return;
                    const tickTime = Number(tick.ts);
                    const tickDay = stockholmDay(tickTime);
                    const bucketTime = Math.floor(tickTime / 10_000) * 10_000;
                    lastLiveTickRef.current = tickTime;
                    setIntradayLive(tick.freshStream === true && Math.abs(Date.now() - tickTime) <= 90_000);
                    setIntraday((current) => {
                        if (!current) return current;
                        let previous = current.previous ?? [];
                        let currentBars = current.current ?? [];
                        let previousClose = current.previousClose;
                        let sessionDate = current.sessionDate;
                        let previousSessionDate = current.previousSessionDate;

                        if (sessionDate && tickDay !== sessionDate) {
                            previous = currentBars.slice(Math.floor(currentBars.length * 0.75));
                            previousClose = currentBars.at(-1)?.close ?? previousClose;
                            previousSessionDate = sessionDate;
                            sessionDate = tickDay;
                            currentBars = [];
                        }

                        const nextPoint = { time: bucketTime, close: Number(tick.price), volume: null };
                        const latest = currentBars.at(-1);
                        const nextBars = latest?.time === bucketTime
                            ? [...currentBars.slice(0, -1), nextPoint]
                            : [...currentBars, nextPoint].slice(-700);
                        return {
                            ...current,
                            sessionDate: sessionDate ?? tickDay,
                            previousSessionDate,
                            previousClose,
                            previous,
                            current: nextBars,
                            quote: {
                                ...current.quote,
                                price: Number(tick.price),
                                change: Number.isFinite(Number(tick.change)) ? Number(tick.change) : current.quote?.change,
                                changePct: Number.isFinite(Number(tick.changePct)) ? Number(tick.changePct) : current.quote?.changePct,
                                quoteTime: tickTime,
                                fresh: tick.freshStream === true,
                            },
                        };
                    });
                } catch {
                    // Ignore malformed stream frames; EventSource remains open.
                }
            });

            source.addEventListener("status", (event) => {
                try {
                    if (JSON.parse(event.data)?.connected === false) setIntradayLive(false);
                } catch {
                    // Ignore malformed status frames.
                }
            });
            source.onerror = () => setIntradayLive(false);
            staleTimer = setInterval(() => {
                if (!lastLiveTickRef.current || Date.now() - lastLiveTickRef.current > 90_000) setIntradayLive(false);
            }, 15_000);
        };

        setIntradayError("");
        setIntraday(null);
        lastLiveTickRef.current = null;
        fetchCompanyIntraday(symbol)
            .then((payload) => {
                if (active) setIntraday(payload);
            })
            .catch(() => {
                if (active) setIntradayError("Kunde inte hämta intradagsdata.");
            })
            .finally(openStream);

        return () => {
            active = false;
            source?.close();
            clearInterval(staleTimer);
        };
    }, [range, symbol]);

    const intradayData = useMemo(() => [
        ...(intraday?.previous ?? []).map((row) => ({
            ...row,
            date: row.time,
            session: "previous",
            previousPrice: row.close,
            currentPrice: null,
        })),
        ...(intraday?.current ?? []).map((row) => ({
            ...row,
            date: row.time,
            session: "current",
            previousPrice: null,
            currentPrice: row.close,
        })),
    ], [intraday]);

    const isIntraday = range === "1d";
    const data = isIntraday ? intradayData : dailyData;
    const chartCompare = !isIntraday && compare;
    // Tick data has no event history of its own, so the marks belong to the
    // daily ranges only.
    const markedRows = isIntraday ? [] : dailyData.filter((row) => row.events.length);
    const markedTypes = [...new Set(markedRows.flatMap((row) => row.events.map((event) => event.type)))]
        .sort((left, right) => EVENT_MARKERS[left].rank - EVENT_MARKERS[right].rank);
    const firstIntradayPoint = intradayData.find((row) => row.currentPrice != null);
    const lastIntradayPoint = intradayData.findLast((row) => row.currentPrice != null);
    const profile = summary.profile;
    const quote = isIntraday && intraday?.quote ? { ...summary.quote, ...intraday.quote } : summary.quote;
    const loadingIntraday = isIntraday && !data.length;
    const placeholderPrice = Number(quote?.price ?? dailyData.at(-1)?.close ?? 1);
    const quoteTimeValue = quote?.quoteTime ?? quote?.dataAsOf ?? dailyData.at(-1)?.date;
    const quoteTime = typeof quoteTimeValue === "number" ? quoteTimeValue : Date.parse(quoteTimeValue);
    const placeholderEnd = Number.isFinite(quoteTime) ? quoteTime : 0;
    const placeholderData = Array.from({ length: 5 }, (_, index) => ({
        date: placeholderEnd - (4 - index) * 2 * 60 * 60 * 1000,
        session: "current",
        currentPrice: placeholderPrice,
        previousPrice: null,
        volume: null,
    }));
    const renderedData = loadingIntraday ? placeholderData : data;
    const intradayPrices = [
        intraday?.previousClose,
        ...intradayData.map((row) => row.previousPrice ?? row.currentPrice),
    ].map(Number).filter(Number.isFinite);
    const intradayMinimum = intradayPrices.length ? Math.min(...intradayPrices) : placeholderPrice;
    const intradayMaximum = intradayPrices.length ? Math.max(...intradayPrices) : placeholderPrice;
    const intradayPadding = Math.max(
        (intradayMaximum - intradayMinimum) * 0.08,
        Math.max(Math.abs(intradayMinimum), Math.abs(intradayMaximum), 1) * 0.004,
    );
    const intradayPriceDomain = [
        intradayMinimum - intradayPadding,
        intradayMaximum + intradayPadding,
    ];

    if (!dailyData.length) {
        return <p className="company-empty">Ingen historisk kursdata är tillgänglig ännu.</p>;
    }

    const changeTone = quote?.changePct == null ? "neutral" : quote.changePct >= 0 ? "positive" : "negative";

    return (
        <section className="company-chart-section" aria-labelledby="price-heading">
            <div className="flex flex-col company-chart-heading">
                {/* <div>
                    <p className="company-eyebrow">Historisk utvecklin g</p>
                    <h2 id="price-heading">Hur har aktien utvecklats?</h2>
                </div> */}
                <header className="w-full company-header">
                    <div className="company-identity">
                        <div className="company-symbol-row">
                            {/* <span>{profile.nativeSymbol ?? symbol.replace(".ST", "")}</span> */}
                            {/* {profile.market && <small>{profile.market}</small>} */}
                            {profile.segment && <small className="font-bold">{profile.segment.replaceAll("_", " ")}</small>}
                            <div className="text-text-muted">•</div>
                            <h1 className="font-serif "> {profile.name ?? symbol}</h1>
                            {/* <small className="">{profile.sector ?? "Sektor saknas"} - {profile.industry ? `${profile.industry}` : ""}</small> */}
                            <WatchlistButton symbol={symbol} />
                        </div>
                        <div className="company-symbol-row" />
                        <div className="company-quote gap-4">
                            <strong>{quote?.price == null ? "Kurs saknas" : `${number(quote.price, 2)} kr`}</strong>
                            <span className={changeTone}>{quote?.change == null ? "–" : `${quote.change > 0 ? "+" : ""}${number(quote.change, 2)} kr · ${pct(quote.changePct)}`}</span>
                        </div>
                        {/* <div className="company-title-row">
                            <h1>{profile.name ?? symbol}</h1>
                            <WatchlistButton symbol={symbol} />
                        </div> */}
                        
                    </div>
                    
                </header>
                <div className="flex flex-row w-full justify-between">
                    <div className="company-range-row" aria-label="Välj tidsperiod">
                        {RANGES.map((option) => (
                            <button
                                key={option.id}
                                disabled={!option.intraday && (chart?.bars?.length ?? 0) < Math.min(option.sessions * 0.75, option.sessions - 15)}
                                className={range === option.id ? "company-range-active" : ""}
                                onClick={() => setRange(option.id)}
                            >
                                <span>{option.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="company-chart-actions max-w-fit">
                        <ShareMoveButton
                            symbol={symbol}
                            companyName={companyName}
                            range={range}
                            ma50={!isIntraday && ma50}
                            ma200={!isIntraday && ma200}
                        />
                        {!isIntraday && (
                            <button
                                className="company-control company-icon-control"
                                onClick={() => setCompare((value) => !value)}
                            >
                                <FaScaleBalanced/>
                            </button>
                        )}
                        {!isIntraday && (
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
                                        <label><input type="checkbox" checked={showEvents} onChange={(event) => setShowEvents(event.target.checked)} /> Händelser</label>
                                        {showEvents && <small>Rapport och utdelning visas för hela perioden. Väsentliga nyheter visas för 6 mån och 1 år.</small>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                 
            </div>
            <div className={`company-chart-layout${drivers.length ? " company-chart-has-context" : ""}`}>
            <div className="company-chart-main">
            <div className={`company-chart ${loadingIntraday ? "company-chart-is-loading" : ""}`} role="img" aria-label={`Kursutveckling för ${companyName}`}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={renderedData} margin={{ top: 14, right: 0, bottom: 4, left: 4 }}>
                        <defs>
                            {LINE_FADES.map(([id, color, bright]) => (
                                <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" style={{ stopColor: `var(${color})`, stopOpacity: 0 }} />
                                    <stop offset="22%" style={{ stopColor: `var(${color})`, stopOpacity: 1 }} />
                                    
                                    <stop offset="50%" style={{ stopColor: `var(${color})`, stopOpacity: 1 }} />
                                    <stop offset="90%" style={{ stopColor: `var(${bright})`, stopOpacity: 1 }} />
                                    <stop offset="100%" style={{ stopColor: `var(${color})`, stopOpacity: 1 }} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid stroke="var(--company-grid-line)" strokeDasharray="2 6" />
                        <XAxis dataKey="date" tickFormatter={(value) => isIntraday ? svTime(value) : svDate(value, true)} minTickGap={58} axisLine={false} tickLine={false} />
                        <YAxis
                            yAxisId="price"
                            orientation="right"
                            axisLine={false}
                            tickLine={false}
                            tickSize={0}
                            tickMargin={0}
                            width={54}
                            domain={isIntraday ? intradayPriceDomain : ["auto", "auto"]}
                            allowDataOverflow={isIntraday}
                            tick={<RightAxisTick format={(value) => chartCompare ? `${value.toFixed(0)}%` : number(value, 0)} />}
                        />
                        {/* Kept mounted in compare mode as well: the event marks
                            hang off the bottom of this axis. */}
                        <YAxis yAxisId="volume" hide domain={chartCompare ? [0, 1] : [0, (maximum) => maximum * 4]} />
                        <Tooltip content={(props) => loadingIntraday ? null : <ChartTooltip {...props} compare={chartCompare} intraday={isIntraday} />} />
                        {!chartCompare && (
                            <Bar yAxisId="volume" dataKey="volume" fill="var(--company-volume)" isAnimationActive={false}>
                                {isIntraday && renderedData.map((row) => (
                                    <Cell key={`${row.session}-${row.date}`} fill={row.session === "previous" ? "var(--company-muted-volume)" : "var(--company-volume)"} />
                                ))}
                            </Bar>
                        )}
                        {isIntraday && !loadingIntraday && firstIntradayPoint && (
                            <ReferenceLine yAxisId="price" x={firstIntradayPoint.date} stroke="var(--company-muted-line)" strokeOpacity={0.55} strokeDasharray="4 6" />
                        )}
                        {isIntraday && !loadingIntraday && (
                            <Line yAxisId="price" type="monotone" dataKey="previousPrice" stroke="var(--company-muted-line)" strokeOpacity={0.62} strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls={false} />
                        )}
                        {isIntraday && !loadingIntraday && (
                            <Line yAxisId="price" type="monotone" dataKey="currentPrice" stroke="url(#company-line-fade-yellow)" strokeWidth={2.2} dot={false} isAnimationActive={false} connectNulls={false} />
                        )}
                        {isIntraday && !loadingIntraday && intradayLive && lastIntradayPoint && (
                            <ReferenceDot yAxisId="price" x={lastIntradayPoint.date} y={lastIntradayPoint.currentPrice} isFront shape={(props) => <LiveEndpointDot {...props} />} />
                        )}
                        {!isIntraday && (
                            <Line
                                yAxisId="price"
                                type="monotone"
                                dataKey={chartCompare ? "returnPct" : "close"}
                                stroke="url(#company-line-fade-yellow)"
                                strokeWidth={2.2}
                                dot={false}
                                isAnimationActive={false}
                            />
                        )}
                        {chartCompare && (
                            <Line yAxisId="price" type="monotone" dataKey="benchmarkPct" stroke="url(#company-line-fade-blue)" strokeWidth={1.6} dot={false} isAnimationActive={false} />
                        )}
                        {!isIntraday && !chartCompare && ma50 && (
                            <Line yAxisId="price" type="monotone" dataKey="ma50" stroke="url(#company-line-fade-blue)" strokeWidth={1.4} dot={false} isAnimationActive={false} />
                        )}
                        {!isIntraday && !chartCompare && ma200 && (
                            <Line yAxisId="price" type="monotone" dataKey="ma200" stroke="url(#company-line-fade-muted)" strokeWidth={1.4} dot={false} isAnimationActive={false} />
                        )}
                        {markedRows.map((row) => (
                            <ReferenceDot
                                key={`event-${row.date}`}
                                yAxisId="volume"
                                x={row.date}
                                y={0}
                                isFront
                                shape={(props) => (
                                    <EventMarker
                                        {...props}
                                        items={row.events}
                                        onOpenStory={(story) => openModal(<NewsModal story={story} />)}
                                    />
                                )}
                            />
                        ))}
                    </ComposedChart>
                </ResponsiveContainer>
                {isIntraday && (
                    <div
                        className={`company-chart-loading ${loadingIntraday ? "company-chart-loading-visible" : ""} ${intradayError ? "company-chart-loading-error" : ""}`}
                        aria-hidden={!loadingIntraday}
                    >
                        {!intradayError && <span className="company-chart-loading-pulse" />}
                        <span>{intradayError || "Hämtar dagens kurs"}</span>
                    </div>
                )}
            </div>
            <div className="company-chart-legend">
                <span><i className="legend-yellow" />{companyName}</span>
                {chartCompare && <span><i className="legend-blue" />OMXSPI</span>}
                {!isIntraday && !chartCompare && ma50 && <span><i className="legend-blue" />MA50</span>}
                {!isIntraday && !chartCompare && ma200 && <span><i className="legend-muted" />MA200</span>}
                {markedTypes.map((type) => (
                    <span key={type} className={EVENT_MARKERS[type].className}>
                        <i className="legend-marker" />{EVENT_MARKERS[type].legend}
                    </span>
                ))}
            </div>
            </div>
                {drivers.length > 0 && (
                    <MoveDrivers drivers={drivers} benchmarkBars={chart?.benchmark?.bars} />
                )}
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

function FinancialSnapshot({ highlights, onSelectTab }) {
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
                <button type="button" className="company-text-link" onClick={() => onSelectTab("financials")}>Visa finansiellt <FiChevronRight /></button>
            </div>
            <div className="company-metric-grid">
                <Metric label="Omsättning" value={money(period.revenue, currency)} detail={periodLabel(period)} />
                <Metric label="EBIT" value={money(period.ebit, currency)} detail={`${number(period.ebitMarginPct)}% marginal`} />
                <Metric label="Nettoresultat" value={money(period.netIncome, currency)} />
                <Metric label="Fritt kassaflöde" value={money(period.freeCashFlow, currency)} />
                <Metric label="Nettoskuld" value={money(period.netDebt, currency)} />
                <Metric label="Nettoskuld / EBITDA" value={period.netDebtToEbitda == null ? "Saknas" : `${number(period.netDebtToEbitda, 2)}×`} />
            </div>
            {/* <p className="company-source">Källa: {highlights?.source ?? "Yahoo"} · Uppdaterad {svDate(highlights?.dataAsOf)}</p> */}
        </section>
    );
}

function CalendarPreview({ calendar, onSelectTab }) {
    const earnings = calendar?.earningsDates?.[0] ?? calendar?.events?.find((event) => event.type === "earnings")?.date;
    return (
        <section className="company-context-section" aria-labelledby="calendar-preview-heading">
            <p className="company-eyebrow">Nästa händelse</p>
            <h2 id="calendar-preview-heading">{earnings ? svDate(earnings) : "Inget datum bekräftat"}</h2>
            <p>{earnings ? "Nästa rapportdatum enligt tillgänglig bolagskalender." : "Vi visar datumet när bolaget eller en verifierad källa publicerar det."}</p>
            <button type="button" className="company-text-link" onClick={() => onSelectTab("calendar")}>Öppna kalendern <FiChevronRight /></button>
        </section>
    );
}

// The wire's own story opens in place. Every field the modal shows is already
// in this payload, so reading the news never leaves the company page and never
// costs another request; the original release stays one click away inside it.
function NewsList({ news, compact = false }) {
    const { openModal } = useModal();
    if (!news?.length) return <p className="company-empty">Inga bolagsspecifika nyheter finns ännu.</p>;
    return (
        <div className="company-news-list">
            {news.slice(0, compact ? 3 : 8).map((story) => (
                <article key={story.id} className="company-news-item company-news-linked">
                    <button type="button" onClick={() => openModal(<NewsModal story={story} />)}>
                        <div className="company-news-meta">
                            <time>{svDate(story.publishedAt, true)}</time>
                            {(story.tags ?? []).slice(0, 2).map((tag) => <span key={tag}>{tagLabel(tag)}</span>)}
                        </div>
                        <h3>{story.headline}</h3>
                        {!compact && story.summary && <p>{story.summary}</p>}
                    </button>
                </article>
            ))}
        </div>
    );
}

// The letters that talked about this company — the way back into the editorial
// side of the site from a stock page.
function MentionsList({ mentions, companyName }) {
    if (!mentions?.length) return null;
    return (
        <section className="company-context-section" aria-labelledby="company-mentions-heading">
            <p className="company-eyebrow">I breven</p>
            <h2 id="company-mentions-heading">Nämns i breven</h2>
            <div className="company-mentions-list">
                {mentions.map((item) => (
                    <Link key={item.id} href={`/article/${articleSlug(item.title)}`}>
                        <time>{svDate(item.createdAt, true)}</time>
                        <span>{item.title}</span>
                        <small>{item.isEveningLetter ? "Kvällsbrevet" : "Morgonbrevet"}</small>
                    </Link>
                ))}
            </div>
            <p className="company-source">Sök efter {companyName} i alla brev via <Link className="company-text-link" href="/alla-nyhetsbrev">arkivet <FiChevronRight /></Link></p>
        </section>
    );
}

function ExpandableText({ text, className = "", lines = 6 }) {
    const [expanded, setExpanded] = useState(false);
    const [clipped, setClipped] = useState(false);
    const textRef = useRef(null);

    useEffect(() => {
        const node = textRef.current;
        if (!node || expanded) return;
        const measure = () => setClipped(node.scrollHeight > node.clientHeight + 1);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
    }, [text, expanded, lines]);

    return (
        <>
            <p
                ref={textRef}
                className={`${className} ${expanded ? "" : "company-clamp"}`.trim()}
                style={expanded ? undefined : { "--company-clamp-lines": lines }}
            >
                {text}
            </p>
            {clipped && (
                <button className="company-readmore" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
                    {expanded ? "Visa mindre" : "Läs mer"}
                </button>
            )}
        </>
    );
}

function OverviewTab({ data, mentions = [], onSelectTab }) {
    const { summary, chart, news } = data;
    return (
        <>
            {/* <CompanyChart chart={chart} companyName={summary.profile.name ?? summary.symbol} /> */}
            <div className="company-overview-layout">
                <div className="company-main-column">
                    <section className="company-section" aria-labelledby="company-question">
                        <p className="company-eyebrow">Bolaget i korthet</p>
                        <h2 id="company-question">Vad gör bolaget?</h2>
                        <ExpandableText className="company-description" text={summary.profile.description || "Bolagsbeskrivning saknas ännu."} />
                        <dl className="company-facts">
                            {summary.profile.sector && <><dt>Sektor</dt><dd>{summary.profile.sector}</dd></>}
                            {summary.profile.industry && <><dt>Bransch</dt><dd>{summary.profile.industry}</dd></>}
                            {summary.profile.employees && <><dt>Anställda</dt><dd>{Number(summary.profile.employees).toLocaleString("sv-SE")}</dd></>}
                            {summary.profile.website && <><dt>Webbplats</dt><dd><a href={summary.profile.website} target="_blank" rel="noreferrer">Besök bolaget <FiExternalLink /></a></dd></>}
                        </dl>
                    </section>
                    <FinancialSnapshot highlights={summary.financialHighlights} onSelectTab={onSelectTab} />
                </div>
                <aside className="company-context-column">
                    <CalendarPreview calendar={summary.calendar} onSelectTab={onSelectTab} />
                    <section className="company-context-section" aria-labelledby="news-preview-heading">
                        <div className="company-section-heading">
                            <div>
                                <p className="company-eyebrow">Senaste bolagsnytt</p>
                                <h2 id="news-preview-heading">Vad har hänt?</h2>
                            </div>
                        </div>
                        <NewsList news={news} compact />
                        <button type="button" className="company-text-link" onClick={() => onSelectTab("news")}>Alla nyheter <FiChevronRight /></button>
                    </section>
                    <MentionsList mentions={mentions} companyName={summary.profile.name ?? summary.symbol} />
                </aside>
            </div>
        </>
    );
}

const FINANCIAL_SERIES = [
    { key: "revenue", label: "Omsättning", color: "var(--company-fin-revenue)" },
    { key: "ebit", label: "EBIT", color: "var(--company-fin-ebit)" },
    { key: "ebita", label: "EBITA", color: "var(--company-fin-ebita)" },
    { key: "ebitda", label: "EBITDA", color: "var(--company-fin-ebitda)" },
];

function FinancialChartTooltip({ active, payload, label, currency }) {
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload;
    if (!point) return null;
    return (
        <div className="company-tooltip company-financial-tooltip">
            <div className="company-financial-tooltip-title">
                <strong>{label}</strong>
                {point.estimate && <span>ESTIMAT</span>}
            </div>
            {FINANCIAL_SERIES.filter((series) => point[series.key] != null).map((series) => (
                <div key={series.key}>
                    <span style={{ color: series.color }}>{series.label}</span>
                    <strong>{money(point[series.key], currency)}</strong>
                </div>
            ))}
            {point.ebitMarginPct != null && <div><span>EBIT-marginal</span><strong>{number(point.ebitMarginPct)}%</strong></div>}
        </div>
    );
}

function FinancialDevelopmentChart({ periods, currency }) {
    const id = useId().replace(/[^a-z0-9]/gi, "");
    const data = periods.map((period) => ({ ...period, label: periodLabel(period) }));
    const series = FINANCIAL_SERIES.filter((candidate) => periods.some((period) => period[candidate.key] != null));
    return (
        <div className="company-financial-visual">
            <div className="company-financial-legend" aria-hidden="true">
                {series.map((item) => <span key={item.key}><i style={{ background: item.color }} />{item.label}</span>)}
                {periods.some((period) => period.ebitMarginPct != null) && <span><i className="company-margin-line" />EBIT-marginal</span>}
                {periods.some((period) => period.estimate) && <span><i className="company-estimate-key" />Estimat</span>}
            </div>
            <div className="company-financial-chart" role="img" aria-label="Omsättning, rörelseresultat och EBIT-marginal per period">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 24, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%" barGap={0}>
                        <defs>
                            {series.map((item) => (
                                <pattern key={item.key} id={`estimate-${item.key}-${id}`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                                    <rect width="7" height="7" fill="var(--company-estimate-base)" />
                                    <line x1="0" y1="0" x2="0" y2="7" stroke={item.color} strokeWidth="2" />
                                </pattern>
                            ))}
                        </defs>
                        <XAxis dataKey="label" axisLine={{ stroke: "var(--company-grid-line)" }} tickLine={false} minTickGap={20} />
                        <YAxis yAxisId="amount" axisLine={false} tickLine={false} tickFormatter={(value) => compactAmount.format(value)} width={58} />
                        <YAxis yAxisId="margin" orientation="right" axisLine={false} tickLine={false} tickFormatter={(value) => `${number(value)}%`} width={52} domain={["auto", "auto"]} />
                        <Tooltip content={(props) => <FinancialChartTooltip {...props} currency={currency} />} cursor={{ fill: "var(--company-chart-cursor)" }} />
                        {series.map((item) => (
                            <Bar key={item.key} yAxisId="amount" dataKey={item.key} fill={item.color} maxBarSize={42} radius={[3, 3, 0, 0]} isAnimationActive={false}>
                                {data.map((point) => (
                                    <Cell
                                        key={`${point.periodKey ?? point.periodEnd}-${item.key}`}
                                        fill={point.estimate ? `url(#estimate-${item.key}-${id})` : item.color}
                                        stroke={point.estimate ? item.color : "none"}
                                    />
                                ))}
                            </Bar>
                        ))}
                        <Line yAxisId="margin" type="monotone" dataKey="ebitMarginPct" stroke="var(--company-fin-margin)" strokeWidth={2.3} dot={{ r: 3, fill: "var(--company-fin-margin)", strokeWidth: 0 }} connectNulls isAnimationActive={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function ManagementComment({ comment, latestReport }) {
    if (!comment) {
        if (!latestReport) return null;
        return <p className="company-ceo-pending">Inget VD-ord</p>;
    }
    const summary = comment.summary;
    const isComment = comment.type === "ceo_comment";
    const sourceUrl = comment.source?.releaseUrl ?? comment.source?.url;
    const paragraphs = statementParagraphs(comment.text);
    return (
        <section className="company-ceo-section" aria-labelledby="company-ceo-heading">
            <div className="company-ceo-heading">
                <div>
                    <p className="company-eyebrow">{isComment ? "VD-kommentar" : "VD-ord"} · {comment.fiscalPeriod ?? comment.periodLabel ?? "senaste rapport"}</p>
                    <h3 id="company-ceo-heading">Ledningens bild av läget</h3>
                </div>
                <time>{svDate(comment.publishedAt)}</time>
            </div>
            {summary ? (
                <>
                    <p className="company-ceo-lead">{summary.summary}</p>
                    {summary.noMeaningfulUpdate && <p className="company-ceo-no-update">Ingen tydlig ny förändring i ledningens budskap.</p>}
                    <div className="company-ceo-columns">
                        {summary.outlook?.length > 0 && (
                            <div><h4>Utsikter</h4><ul>{summary.outlook.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
                        )}
                        {summary.changesAndRisks?.length > 0 && (
                            <div><h4>Förändringar och risker</h4><ul>{summary.changesAndRisks.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
                        )}
                    </div>
                    {summary.keyFigures?.length > 0 && (
                        <div className="company-ceo-keyfigures">
                            {summary.keyFigures.slice(0, 5).map((item, index) => (
                                <div key={`${item.label}-${index}`}><span>{item.label}</span><strong>{item.value}</strong>{item.context && <small>{item.context}</small>}</div>
                            ))}
                        </div>
                    )}
                    <p className="company-ceo-ai-note">AI-sammanfattning från det källbelagda {isComment ? "VD-uttalandet" : "VD-ordet"}. Kontrollera väsentliga detaljer i originaltexten.</p>
                </>
            ) : <p className="company-ceo-pending">Sammanfattningen förbereds. Originaltexten finns tillgänglig nedan.</p>}
            {paragraphs.length > 0 && (
                <details className="company-ceo-details">
                    <summary>Läs hela {isComment ? "VD-kommentaren" : "VD-ordet"}</summary>
                    <div>{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
                </details>
            )}
            {sourceUrl && <a className="company-text-link company-ceo-source" href={sourceUrl} target="_blank" rel="noreferrer">Öppna originalkällan <FiExternalLink /></a>}
        </section>
    );
}

function FinancialsTab({ financials, estimates }) {
    const latestEstimate = upcomingEstimateSnapshot(estimates?.latest, financials);
    const estimatePeriod = estimatePeriodFromSnapshot(latestEstimate);
    const [frequency, setFrequency] = useState(estimatePeriod ? "quarterly" : financials?.ttm?.length ? "ttm" : "annual");
    const options = [
        ["annual", "År", financials?.annual],
        ["quarterly", "Kvartal", financials?.quarterly],
        ["ttm", "R12", financials?.ttm],
    ];
    const basePeriods = options.find(([id]) => id === frequency)?.[2] ?? [];
    const periods = [
        ...basePeriods.slice(frequency === "quarterly" && estimatePeriod ? -5 : -6),
        ...(frequency === "quarterly" && estimatePeriod ? [estimatePeriod] : []),
    ];
    const currency = financials?.currency ?? latestEstimate?.metrics?.find((metric) => metric.currency)?.currency ?? "SEK";
    const has = (key) => periods.some((period) => period[key] != null);
    // The full statement view, grouped the way an annual report reads. A row
    // only appears when at least one shown period carries the figure, so a
    // company without gross-profit data gets no row of "Saknas".
    const financialGroups = [
        ["Resultat", [
            ["Omsättning", "revenue", "money"],
            ["EBIT", "ebit", "money"],
            ...(has("ebita") ? [["EBITA", "ebita", "money"]] : []),
            ["EBITDA", "ebitda", "money"],
            ["Nettoresultat", "netIncome", "money"],
            ...(has("dilutedEps") ? [["Vinst per aktie", "dilutedEps", "eps"]] : []),
        ]],
        ["Marginaler och avkastning", [
            ...(has("grossMarginPct") ? [["Bruttomarginal", "grossMarginPct", "pct"]] : []),
            ["EBIT-marginal", "ebitMarginPct", "pct"],
            ...(has("netMarginPct") ? [["Nettomarginal", "netMarginPct", "pct"]] : []),
            ...(has("roePct") ? [["Avkastning på eget kapital (ROE)", "roePct", "pct"]] : []),
            ...(has("roicPct") ? [["Avkastning på investerat kapital (ROIC)", "roicPct", "pct"]] : []),
        ]],
        ["Balans och skuldsättning", [
            ...(has("equity") ? [["Eget kapital", "equity", "money"]] : []),
            ...(has("netDebt") ? [["Nettoskuld", "netDebt", "money"]] : []),
            ...(has("equityRatioPct") ? [["Soliditet", "equityRatioPct", "pct"]] : []),
            ...(has("netDebtToEbitda") ? [["Nettoskuld / EBITDA", "netDebtToEbitda", "x"]] : []),
        ]],
        ["Kassaflöde", [
            ...(has("operatingCashFlow") ? [["Kassaflöde från driften", "operatingCashFlow", "money"]] : []),
            ...(has("capitalExpenditure") ? [["Investeringar (capex)", "capitalExpenditure", "money"]] : []),
            ["Fritt kassaflöde", "freeCashFlow", "money"],
            ...(has("freeCashFlowMarginPct") ? [["FCF-marginal", "freeCashFlowMarginPct", "pct"]] : []),
            ...(has("cashConversionPct") ? [["Kassagenerering (OCF/EBITDA)", "cashConversionPct", "pct"]] : []),
        ]],
        ["Tillväxt", [
            ...(has("revenueGrowthPct") ? [["Omsättningstillväxt", "revenueGrowthPct", "signedPct"]] : []),
        ]],
    ].filter(([, rows]) => rows.length);
    const financialCell = (period, key, type) => {
        const value = period[key];
        // Estimate columns only carry a handful of figures; a dash reads
        // better than a wall of "Saknas" for rows nobody estimates.
        if (value == null) return period.estimate ? "–" : type === "money" ? "Saknas" : "–";
        if (type === "money") return money(value, currency);
        if (type === "eps") return number(value, 2);
        if (type === "x") return `${number(value, 1)}x`;
        if (type === "signedPct") return pct(value);
        return `${number(value)}%`;
    };
    return (
        <section className="company-tab-section">
            <p className="company-eyebrow">Rapporterat, härlett och estimerat</p>
            <h2>Finansiell utveckling</h2>
            {/* <p className="company-intro">Jämför bolagets senaste perioder. R12 beräknas bara när fyra sammanhängande kvartal finns och estimat markeras med randiga staplar.</p> */}
            <div className="company-period-tabs">
                {options.map(([id, label, values]) => (
                    <button key={id} disabled={!values?.length} className={frequency === id ? "active" : ""} onClick={() => setFrequency(id)}>{label}</button>
                ))}
            </div>
            {!periods.length ? <p className="company-empty">Data saknas för vald period.</p> : (
                <>
                    <FinancialDevelopmentChart periods={periods} currency={currency} />
                    <div className="company-table-wrap">
                        <table className="company-financial-table company-financial-statement">
                            <colgroup>
                                <col className="company-metric-column" />
                                {periods.map((period) => (
                                    <col className="company-period-column" key={period.periodKey ?? period.periodEnd} />
                                ))}
                            </colgroup>
                            <thead><tr><th>Nyckeltal</th>{periods.map((period) => <th className={period.estimate ? "company-estimate-cell" : ""} key={period.periodKey ?? period.periodEnd}>{periodLabel(period)}</th>)}</tr></thead>
                            <tbody>
                                {financialGroups.map(([groupLabel, rows]) => (
                                    <Fragment key={groupLabel}>
                                        <tr className="company-row-group"><th colSpan={periods.length + 1}>{groupLabel}</th></tr>
                                        {rows.map(([label, key, type]) => (
                                            <tr key={key}><th>{label}</th>{periods.map((period) => (
                                                <td className={period.estimate ? "company-estimate-cell" : ""} key={period.periodKey ?? period.periodEnd}>
                                                    {financialCell(period, key, type)}
                                                    {period.estimateAdjusted?.[key] && <small className="company-adjusted-mark"> just.</small>}
                                                </td>
                                            ))}</tr>
                                        ))}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
            <p className="company-source">
                ROE, ROIC, soliditet, kassagenerering och tillväxt beräknas av OMXsum ur bolagets rapporterade siffror. Avkastningsmått visas bara där resultatsidan täcker ett helt år (helår och R12); kvartalstillväxt jämför samma kvartal föregående år.
                {frequency === "quarterly" && estimatePeriod ? ` Estimat: ${estimatePeriod.estimateSource.publisher ?? estimatePeriod.estimateSource.name}${estimatePeriod.estimateSource.contributors ? `, ${estimatePeriod.estimateSource.contributors} bidragsgivare` : ""}.` : ""}
                {frequency === "quarterly" && estimatePeriod?.estimateSource.url && <> <a href={estimatePeriod.estimateSource.url} target="_blank" rel="noreferrer">Visa estimatkällan <FiExternalLink /></a></>}
            </p>
            <ManagementComment comment={financials?.managementComment} latestReport={financials?.latestReport} />
        </section>
    );
}

function EstimatesTab({ summary, financials, estimates }) {
    const calendar = summary.calendar;
    const latest = upcomingEstimateSnapshot(estimates?.latest, financials);
    const summaryEstimate = upcomingEstimateSnapshot(summary.upcomingEstimate, financials);
    return (
        <section className="company-tab-section">
            <p className="company-eyebrow">Offentligt konsensus</p>
            <h2>Vad väntar marknaden sig?</h2>
            <p className="company-intro">Estimat visas bara med källa och period. Täckningen är fortfarande begränsad för mindre svenska bolag.</p>
            <div className="company-metric-grid company-metric-grid-small">
                <Metric label="EPS-estimat" value={calendar?.epsEstimate?.average == null ? "Saknas" : `${number(calendar.epsEstimate.average, 2)} ${calendar.currency ?? "SEK"}`} />
                <Metric label="Omsättningsestimat" value={money(calendar?.revenueEstimate?.average, calendar?.currency ?? "SEK")} />
                <Metric label="Nästa estimatperiod" value={latest?.fiscalPeriod ?? summaryEstimate?.fiscalPeriod ?? "Saknas"} />
            </div>
            {!latest && <p className="company-empty">Inget öppet konsensusestimat har samlats in för bolaget ännu.</p>}
        </section>
    );
}

// The band answers one question: what has the market paid for this company's
// own reported figures, and where does today sit in that range? It is not a
// fair value and carries no rating.
const MULTIPLE_HELP = {
    pe: "Aktiekurs delat med vinst per aktie för det senast rapporterade helåret.",
    ps: "Börsvärde delat med omsättningen för det senast rapporterade helåret.",
    evEbit: "Börsvärde plus rapporterad nettoskuld, delat med rörelseresultatet.",
    evSales: "Börsvärde plus rapporterad nettoskuld, delat med omsättningen.",
};

const UNAVAILABLE_COPY = {
    fx_unavailable: "Bolaget rapporterar i en annan valuta än den aktien handlas i, och det saknas växelkurshistorik att räkna om med. Vi visar hellre ingenting än multiplar med en påhittad kurs.",
    unknown_reporting_currency: "Rapportvalutan saknas i underlaget, och utan den går multiplarna inte att jämföra med kursen.",
    unknown_trading_currency: "Handelsvalutan för listningen saknas i underlaget.",
    no_usable_annual_period: "Det finns inga rapporterade helår som klarar rimlighetskontrollen, så det går inte att bygga någon historik.",
};

const UNRELIABLE_COPY = {
    short_history: "Spannet bygger på mindre än ett års observationer och säger ännu inte vad som är normalt för bolaget.",
    mostly_not_meaningful: "Bolaget låg nära nollresultat större delen av perioden, så nyckeltalet saknar meningsfull historik. Titta på P/S eller EV/S i stället.",
};

function ValuationNote({ title, label, children }) {
    const tooltipId = useId();

    return (
        <div className="company-valuation-note-wrap">
            <button
                type="button"
                className="company-valuation-note-trigger"
                aria-describedby={tooltipId}
            >
                <FiInfo aria-hidden="true" />
                <span>{label}</span>
            </button>
            <div id={tooltipId} role="tooltip" className="company-valuation-note-tooltip">
                <strong>{title}</strong>
                {children}
            </div>
        </div>
    );
}

// FI:s verbatim natures -> readable Swedish; the normalized direction decides
// the sign and color, so an odd nature never masquerades as a trade.
// Full digits like the registry itself: "209 262 150 SEK" carries more weight
// than a compacted "209,3 M SEK" and stays honest to the öre.
const sekFull = (value, currency = "SEK") =>
    `${Math.round(value).toLocaleString("sv-SE")} ${currency}`;

const INSIDER_DIRECTION = {
    acquisition: { label: "Köp", tone: "buy" },
    subscription: { label: "Teckning", tone: "buy" },
    disposal: { label: "Sälj", tone: "sell" },
    loan_in: { label: "Inlån", tone: "neutral" },
    loan_out: { label: "Utlån", tone: "neutral" },
    other: { label: "Övrigt", tone: "neutral" },
};

// Net per person over the stored window. FI's register does not publish
// total holdings — unlike the US Form 4 — so the honest context we can give
// is each person's own pattern within our 24 months, and the trade's scale
// against the company's market value.
function insiderPersons(rows) {
    const byPerson = new Map();
    for (const row of rows) {
        if (typeof row.value !== "number" || (row.currency && row.currency !== "SEK")) continue;
        const entry = byPerson.get(row.person) ?? { person: row.person, position: row.position, count: 0, net: 0 };
        entry.count += 1;
        if (row.direction === "acquisition" || row.direction === "subscription") entry.net += row.value;
        else if (row.direction === "disposal") entry.net -= row.value;
        byPerson.set(row.person, entry);
    }
    return [...byPerson.values()]
        .filter((entry) => entry.count >= 2)
        .sort((left, right) => Math.abs(right.net) - Math.abs(left.net))
        .slice(0, 5);
}

const capSharePct = (value, marketCap) =>
    marketCap && value ? (Math.abs(value) / marketCap) * 100 : null;

function InsidersTab({ symbol, companyName, marketCap }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let active = true;
        setData(null);
        setError(null);
        fetchInsiders(symbol)
            .then((body) => { if (active) setData(body); })
            .catch((cause) => { if (active) setError(cause.message); });
        return () => { active = false; };
    }, [symbol]);

    const rows = data?.transactions ?? [];
    const summary90 = data?.summary?.last90Days;
    const summary365 = data?.summary?.last365Days;
    const ownership = data?.ownership?.available ? data.ownership : null;
    const persons = insiderPersons(rows);
    const hasOwners = Boolean(ownership?.largestOwners?.length);
    const holdings = new Map((data?.personHoldings ?? []).map((entry) => [entry.person, entry]));
    const holdingShare = (row) => {
        const holding = holdings.get(row.person);
        if (!holding?.shares || row.unit !== "Quantity" || !row.volume) return null;
        return (row.volume / holding.shares) * 100;
    };

    return (
        <section className="company-tab-section">
            <p className="company-eyebrow">FI:s insynsregister</p>
            <h2>Insynshandel</h2>
            <p className="company-intro">Vad personer i ledande ställning i {companyName} själva gör med aktien</p>

            {error && <p className="company-empty">{error}</p>}
            {!data && !error && <p className="company-empty">Hämtar insynshandel …</p>}
            {data && !rows.length && <p className="company-empty">Inga insynstransaktioner registrerade för bolaget under de senaste två åren.</p>}

            {rows.length > 0 && (
                <div className={`company-insider-layout ${hasOwners ? "" : "company-insider-layout-single"}`}>
                    <div className="company-insider-transactions">
                        {(summary365?.transactions ?? 0) > 0 && (
                            <div className="company-insider-summary">
                                <small className="company-insider-heading">Insynshandel senaste 12 mån</small>
                                <strong className={`company-insider-net ${summary365.netValue >= 0 ? "company-insider-buy" : "company-insider-sell"}`}>
                                    {summary365.netValue >= 0 ? "+" : "−"}{sekFull(Math.abs(summary365.netValue))}
                                </strong>
                                <small className="company-insider-sub">
                                    {summary365.transactions} affärer · {summary365.buyers} köpare · {summary365.sellers} säljare
                                    {capSharePct(summary365.netValue, marketCap) != null && ` · ≈ ${number(capSharePct(summary365.netValue, marketCap), 3)} % av börsvärdet`}
                                </small>
                                <div className="company-insider-split">
                                    <div>
                                        <span><i className="company-insider-dot company-insider-dot-buy" />Köp</span>
                                        <strong>{sekFull(summary365.boughtValue)}</strong>
                                    </div>
                                    <div>
                                        <span><i className="company-insider-dot company-insider-dot-sell" />Sälj</span>
                                        <strong>{sekFull(summary365.soldValue)}</strong>
                                    </div>
                                </div>
                                {(summary90?.transactions ?? 0) > 0 && summary90.transactions !== summary365.transactions && (
                                    <small className="company-insider-sub">Senaste 3 mån: netto {summary90.netValue >= 0 ? "+" : "−"}{sekFull(Math.abs(summary90.netValue))} ({summary90.transactions} affärer)</small>
                                )}
                            </div>
                        )}

                        {persons.length > 0 && (
                            <section className="company-insider-persons" aria-labelledby="company-insider-persons-heading">
                                <h3 id="company-insider-persons-heading" className="company-insider-section-title">Nettohandel per person</h3>
                                <p className="company-insider-sub">De största nettobeloppen under de senaste 24 månaderna.</p>
                                {persons.map((entry) => (
                                    <div key={entry.person} className="company-insider-person-row">
                                        <span className="company-insider-person-name">{entry.person}
                                            <small>{entry.position}</small>
                                            {holdings.get(entry.person)?.shares != null && (
                                                <small>Innehav {Math.round(holdings.get(entry.person).shares).toLocaleString("sv-SE")} aktier{holdings.get(entry.person).includesRelated ? " inkl. närstående" : ""} · ÅR {holdings.get(entry.person).fiscalYear}</small>
                                            )}
                                        </span>
                                        <span className="company-insider-person-net">
                                            <strong className={entry.net >= 0 ? "company-insider-buy" : "company-insider-sell"}>
                                                {entry.net >= 0 ? "+" : "−"}{sekFull(Math.abs(entry.net))}
                                            </strong>
                                            <small>{entry.count} affärer</small>
                                        </span>
                                    </div>
                                ))}
                            </section>
                        )}

                        <div className="company-insider-list-heading">
                            <h3 className="company-insider-section-title">Transaktioner</h3>
                            <p className="company-insider-depth">Senaste 24 månaderna</p>
                        </div>
                        <div className="company-insider-list">
                            {rows.slice(0, 60).map((row) => {
                                const direction = INSIDER_DIRECTION[row.direction] ?? INSIDER_DIRECTION.other;
                                const showInstrument = row.instrumentType && !/^(share|aktie)$/i.test(row.instrumentType);
                                return (
                                    <a key={row.txId} className="company-insider-row" href={row.url} target="_blank" rel="noreferrer">
                                        <small className={`company-insider-tag company-insider-${direction.tone}`}>
                                            {direction.label} · <span>{svDate(row.transactionDate ?? row.publishedAt)}{row.direction === "disposal" && holdingShare(row) != null && ` · ≈ ${number(holdingShare(row), 1)} % av innehavet (ÅR ${holdings.get(row.person).fiscalYear})`}</span>
                                        </small>
                                        <div className="company-insider-main">
                                            <span className="company-insider-name">{row.person}</span>
                                            <span className="company-insider-value">{row.value == null ? "–" : sekFull(row.value, row.currency ?? "SEK")}</span>
                                        </div>
                                        <div className="company-insider-meta">
                                            <span>{row.closelyAssociated ? "Närstående till " : ""}{row.position}{showInstrument ? ` · ${row.instrumentType}` : ""}</span>
                                            <span>{row.volume == null ? "" : `${Math.round(row.volume).toLocaleString("sv-SE")} st`}{row.volume != null && row.price != null ? " · " : ""}{row.price == null ? "" : `${number(row.price, 2)} ${row.currency ?? "SEK"}`}</span>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                        {rows.length > 60 && <p className="company-source">Visar de 60 senaste av {rows.length} transaktioner.</p>}
                        <p className="company-source">Källa: Finansinspektionens insynsregister. Registret innehåller inte personens totala innehav, så nettot per person avser de senaste 24 månaderna — inte andel av innehavet. Varje rad länkar till FI:s anmälan. Värde beräknas som volym × pris när enheten är antal; teckningar räknas som köp, aktielån som varken eller. Ingen rekommendation.</p>
                    </div>

                    {hasOwners && (
                        <aside className="company-insider-owner-panel" aria-labelledby="company-insider-owners-heading">
                            <h3 id="company-insider-owners-heading" className="company-insider-section-title">Största ägare</h3>
                            {ownership.ownersAsOf && <p className="company-insider-sub">Ägarbild {ownership.ownersAsOf}</p>}
                            <div className="company-insider-persons company-insider-owners">
                                {ownership.largestOwners.slice(0, 8).map((owner) => (
                                    <div key={owner.name} className="company-insider-person-row">
                                        <span className="company-insider-person-name">{owner.name}
                                            {owner.shares != null && <small>{Math.round(owner.shares).toLocaleString("sv-SE")} aktier</small>}
                                        </span>
                                        <span className="company-insider-person-net">
                                            <strong>{owner.capitalPct != null ? `${number(owner.capitalPct, 1)} %` : owner.votesPct != null ? `${number(owner.votesPct, 1)} %` : "–"}</strong>
                                            <small>{owner.capitalPct != null ? "av kapitalet" : owner.votesPct != null ? "av rösterna" : ""}{owner.capitalPct != null && owner.votesPct != null ? ` · ${number(owner.votesPct, 1)} % av rösterna` : ""}</small>
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <p className="company-source">Ur {ownership.source?.issuer ? `${ownership.source.issuer}s` : "bolagets"} årsredovisning{ownership.fiscalYear ? ` ${ownership.fiscalYear - 1}` : ""}{ownership.source?.url ? <> · <a href={ownership.source.url} target="_blank" rel="noreferrer">källa</a></> : null}. Innehav per rapportdatum, inte dagens position.</p>
                        </aside>
                    )}
                </div>
            )}
        </section>
    );
}

function ValuationTab({ symbol, companyName }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState("pe");

    useEffect(() => {
        let active = true;
        setData(null);
        setError(null);
        fetchValuation(symbol)
            .then((body) => { if (active) setData(body); })
            .catch((cause) => { if (active) setError(cause.message); });
        return () => { active = false; };
    }, [symbol]);

    const multiples = data?.multiples ?? [];
    const usable = multiples.filter((multiple) => multiple.available);
    // Land on something worth reading rather than an empty P/E for a loss-maker.
    const active = usable.find((multiple) => multiple.id === selected)
        ?? usable.find((multiple) => multiple.reliable)
        ?? usable[0]
        ?? null;

    return (
        <section className="company-tab-section">
            <p className="company-eyebrow">Bolagets egen historik</p>
            <h2>Värdering</h2>
            <p className="company-intro">Vad marknaden har betalat för {companyName}s egna rapporterade siffror, och var dagens kurs ligger i det spannet. Ingen riktkurs, inget totalbetyg — varje tal går att räkna om från underlaget längst ned.</p>

            {error && <p className="company-empty">{error}</p>}
            {!data && !error && <p className="company-empty">Hämtar värderingshistorik …</p>}

            {data?.unavailableReason && (
                <ValuationNote
                    title="Varför saknas värderingshistoriken?"
                    label="Varför saknas värderingshistoriken?"
                >
                    <p>
                        {UNAVAILABLE_COPY[data.unavailableReason] ?? "Värderingshistoriken går inte att visa för det här bolaget."}
                        {data.unavailableReason === "reporting_currency_mismatch" && ` Rapporterar i ${data.reportingCurrency}, handlas i ${data.tradingCurrency}.`}
                    </p>
                </ValuationNote>
            )}

            {data && !data.unavailableReason && !usable.length && (
                <p className="company-empty">Inget nyckeltal går att beräkna på bolagets rapporterade helår.</p>
            )}

            {active && (
                <>
                    <div className="company-period-tabs">
                        {multiples.map((multiple) => (
                            <button
                                key={multiple.id}
                                disabled={!multiple.available}
                                className={active.id === multiple.id ? "active" : ""}
                                onClick={() => setSelected(multiple.id)}
                            >
                                {multiple.label}
                                {multiple.available && !multiple.reliable && <span className="company-valuation-warn-mark" aria-label="osäkert underlag">!</span>}
                            </button>
                        ))}
                    </div>

                    <ValuationBand multiple={active} asOf={data.asOf} fx={data.fx} />

                    <p className="company-valuation-help">{MULTIPLE_HELP[active.id]}</p>

                    {!multiples.find((multiple) => multiple.id === selected)?.available && (
                        <ValuationNote
                            title={`Varför saknas ${MULTIPLES_LABEL[selected] ?? "nyckeltalet"}?`}
                            label={`Varför saknas ${MULTIPLES_LABEL[selected] ?? "nyckeltalet"}?`}
                        >
                            <p>{MULTIPLES_LABEL[selected] ?? "Nyckeltalet"} går inte att beräkna eftersom nämnaren är negativ eller saknas för bolagets rapporterade helår.</p>
                        </ValuationNote>
                    )}

                    {!active.reliable && (
                        <ValuationNote
                            title={`Om underlaget för ${active.label}`}
                            label="Läs om det osäkra underlaget"
                        >
                            <p>{UNRELIABLE_COPY[active.unreliableReason] ?? "Underlaget är för tunt för att spannet ska läsas som ett normalläge."}</p>
                        </ValuationNote>
                    )}

                    <ValuationMethod data={data} multiple={active} />
                </>
            )}
        </section>
    );
}

const MULTIPLES_LABEL = { pe: "P/E", ps: "P/S", evEbit: "EV/EBIT", evSales: "EV/S" };

// A readable scale: round the axis top up to a whole step so it reads 0–25 in
// fives rather than 0–23,4 in quarters.
function niceScale(rough) {
    if (!Number.isFinite(rough) || rough <= 0) return { ceiling: 0, ticks: [0] };
    const target = rough / 5;
    const magnitude = 10 ** Math.floor(Math.log10(target));
    const normalized = target / magnitude;
    const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10) * magnitude;
    const ceiling = Math.ceil(rough / step) * step;
    const ticks = [];
    for (let value = 0; value <= ceiling + step / 2; value += step) ticks.push(Number(value.toFixed(6)));
    return { ceiling, ticks };
}

function ValuationBand({ multiple, asOf, fx }) {
    const stats = multiple.stats;
    const { ceiling, ticks: yTicks } = niceScale(multiple.displayMax ?? stats?.max ?? 0);
    const data = multiple.series.map((point) => ({
        ...point,
        time: Date.parse(point.date),
        // Values above the readable ceiling are clipped from the line, not from
        // the statistics; outliersAbove below says how many.
        plotted: point.value <= ceiling ? point.value : null,
    }));
    // A real time axis, not one category per sample. A year the metric could
    // not be computed for — a loss year drops out of P/E entirely — then reads
    // as the gap it is instead of being collapsed into the neighbouring years.
    const yearTicks = [];
    if (data.length) {
        const lastYear = new Date(data.at(-1).time).getFullYear();
        for (let year = new Date(data[0].time).getFullYear(); year <= lastYear; year += 1) {
            const tick = Date.parse(`${year}-01-01`);
            if (tick >= data[0].time) yearTicks.push(tick);
        }
    }
    const percentile = stats?.currentPercentile;
    const verdict = percentile == null ? null
        : percentile >= 80 ? "högre än nästan hela"
            : percentile >= 60 ? "i övre delen av"
                : percentile >= 40 ? "mitt i"
                    : percentile >= 20 ? "i nedre delen av"
                        : "lägre än nästan hela";

    return (
        <div className="company-valuation">
            <div className="company-valuation-stats">
                <div className="company-valuation-now">
                    <small>Nu</small>
                    <strong>{number(stats?.current, 1)}</strong>
                </div>
                <div><small>Median</small><span>{number(stats?.median, 1)}</span></div>
                <div><small>Normalspann</small><span>{number(stats?.p25, 1)}–{number(stats?.p75, 1)}</span></div>
                <div><small>Lägsta–högsta</small><span>{number(stats?.min, 1)}–{number(stats?.max, 1)}</span></div>
                <div><small>Percentil</small><span>{percentile == null ? "Saknas" : `${percentile}`}</span></div>
            </div>

            <div className="company-valuation-chart" role="img" aria-label={`${multiple.label} över tid mot bolagets eget historiska spann`}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke="var(--company-grid-line)" vertical={false} />
                        {stats?.p25 != null && stats?.p75 != null && (
                            <ReferenceArea y1={stats.p25} y2={stats.p75} fill="var(--company-yellow)" fillOpacity={0.13} stroke="none" />
                        )}
                        {stats?.median != null && (
                            <ReferenceLine y={stats.median} stroke="var(--company-muted-line)" strokeDasharray="4 4" />
                        )}
                        <XAxis
                            dataKey="time"
                            type="number"
                            scale="time"
                            domain={["dataMin", "dataMax"]}
                            axisLine={{ stroke: "var(--company-grid-line)" }}
                            tickLine={false}
                            ticks={yearTicks}
                            tickFormatter={(value) => new Date(value).getFullYear()}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            width={46}
                            domain={[0, ceiling]}
                            ticks={yTicks}
                            allowDataOverflow
                            tickFormatter={(value) => number(value, 1)}
                        />
                        <Tooltip
                            cursor={{ stroke: "var(--company-grid-line)" }}
                            content={({ active: hovered, payload }) => {
                                if (!hovered || !payload?.length) return null;
                                const point = payload[0].payload;
                                return (
                                    <div className="company-tooltip">
                                        <strong>{svDate(point.date)}</strong>
                                        <span>{multiple.label} {number(point.value, 1)}</span>
                                        <span className="company-tooltip-note">Rapporterat helår</span>
                                    </div>
                                );
                            }}
                        />
                        <Line type="monotone" dataKey="plotted" stroke="var(--company-yellow)" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            <p className="company-valuation-verdict">
                {verdict
                    ? <>Aktien handlas till {multiple.label} {number(stats.current, 1)} — {verdict} sitt eget spann sedan {String(multiple.from).slice(0, 4)}.</>
                    : "För få observationer för att placera dagens nivå i historiken."}
                {multiple.outliersAbove > 0 && ` ${multiple.outliersAbove} av ${stats.count} observationer ligger över skalan och är utelämnade ur linjen, men ingår i statistiken.`}
                {multiple.notMeaningful > 0 && ` Under ${multiple.notMeaningful} handelsdagar låg resultatet så nära noll att nyckeltalet saknade mening — de dagarna ingår inte i spannet.`}
            </p>
            <p className="company-source">
                Beräknat på stängningskurs {svDate(asOf)}.
                {fx && ` Rapportsiffror omräknade med daglig växelkurs (${fx.pair}, nu ${number(fx.rateNow, 2)}).`}
            </p>
        </div>
    );
}

function ValuationMethod({ data, multiple }) {
    return (
        <details className="company-valuation-method">
            <summary>Så räknas {multiple.label}</summary>
            <p>{MULTIPLE_HELP[multiple.id]} Siffrorna gäller från det datum de var offentliga — {data.method.publicationLagDays} dagar efter bokslutsdagen — så ingen punkt i grafen bygger på en rapport marknaden ännu inte sett. Nettoskulden hämtas från samma period som resultatet och antas aldrig vara noll när den saknas.{data.fx && ` Bolaget rapporterar i ${data.reportingCurrency} men handlas i ${data.tradingCurrency}; varje dags multipel använder den dagens växelkurs (${data.fx.pair}), inte dagens kurs bakåt i tiden. Tabellen nedan visar siffrorna i rapportvalutan.`}{data.method.notMeaningfulAbove && ` Resultatmultiplar över ${data.method.notMeaningfulAbove} behandlas som "ej meningsfulla" — de uppstår när resultatet passerar noll och beskriver inte någon värdering.`}</p>
            <div className="company-table-wrap">
                <table className="company-financial-table">
                    <thead>
                        <tr>
                            <th>Räkenskapsår</th>
                            <th>Gäller från</th>
                            <th>Vinst/aktie</th>
                            <th>Omsättning</th>
                            <th>EBIT</th>
                            <th>Nettoskuld</th>
                            <th>Aktier</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.periods.map((period) => (
                            <tr key={period.periodEnd}>
                                <th>{period.fiscalPeriod ?? period.periodEnd}</th>
                                <td>{svDate(period.effectiveFrom)}</td>
                                <td>{number(period.eps, 2)}</td>
                                <td>{money(period.revenue, data.currency ?? "SEK")}</td>
                                <td>{money(period.ebit, data.currency ?? "SEK")}</td>
                                <td>{money(period.netDebt, data.currency ?? "SEK")}</td>
                                {/* An audit table: the exact share count, not "2 md". */}
                                <td>{number(period.sharesOutstanding, 0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {data.rejectedPeriods?.length > 0 && (
                <ValuationNote
                    title="Utelämnade rader ur underlaget"
                    label="Visa utelämnade rader"
                >
                    <p>
                        {data.rejectedPeriods.map((row) => `${row.periodEnd} (${row.reason === "non_positive_revenue" ? "omsättning saknas eller är negativ" : row.reason === "scale_mismatch" ? "siffrorna ligger i en annan storleksordning än övriga år" : "överlappar föregående räkenskapsår"})`).join(", ")}. Det är nästan alltid en R12-kolumn som datakällan har lagt in som ett räkenskapsår.
                    </p>
                </ValuationNote>
            )}
            <p className="company-source">Kurshistorik: dagliga stängningskurser. Rapporterade siffror från bolagets egna bokslut. Detta är ingen riktkurs och ingen rekommendation.</p>
        </details>
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

const CALENDAR_EVENT_LABELS = {
    earnings: "Rapport",
    agm: "Årsstämma",
    ex_dividend: "X-dag",
    dividend: "Utdelning",
    capital_market_day: "Kapitalmarknadsdag",
};

const parseCalendarDate = (value) => {
    const [year, month, day] = String(value ?? "").slice(0, 10).split("-").map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day, 12);
    return Number.isNaN(date.getTime()) ? null : date;
};

const calendarDateKey = (value) => {
    const date = value instanceof Date ? value : parseCalendarDate(value);
    if (!date) return "";
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
};

const calendarEventLabel = (type) => CALENDAR_EVENT_LABELS[type]
    ?? String(type ?? "Händelse").replaceAll("_", " ");

function CalendarTab({ calendar }) {
    const todayKey = stockholmDay(Date.now());
    const today = parseCalendarDate(todayKey);
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12);
    const [visibleMonth, setVisibleMonth] = useState(currentMonth);

    const events = useMemo(() => {
        const candidates = [
            ...(calendar?.events ?? []),
            ...(calendar?.earningsDates ?? []).map((date) => ({ type: "earnings", date })),
            ...(calendar?.exDividendDate ? [{ type: "ex_dividend", date: calendar.exDividendDate }] : []),
            ...(calendar?.dividendDate ? [{ type: "dividend", date: calendar.dividendDate }] : []),
        ];
        const seen = new Set();
        return candidates
            .filter((event) => calendarDateKey(event.date) >= todayKey)
            .filter((event) => {
                const key = `${calendarDateKey(event.date)}-${event.type}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((left, right) => calendarDateKey(left.date).localeCompare(calendarDateKey(right.date)));
    }, [calendar, todayKey]);

    const eventsByDate = useMemo(() => events.reduce((result, event) => {
        const key = calendarDateKey(event.date);
        result.set(key, [...(result.get(key) ?? []), event]);
        return result;
    }, new Map()), [events]);

    const days = useMemo(() => {
        const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1, 12);
        const mondayOffset = (first.getDay() + 6) % 7;
        const start = new Date(first);
        start.setDate(first.getDate() - mondayOffset);
        const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
        const cellCount = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;
        return Array.from({ length: cellCount }, (_, index) => {
            const date = new Date(start);
            date.setDate(start.getDate() + index);
            return date;
        });
    }, [visibleMonth]);

    const showingCurrentMonth = visibleMonth.getFullYear() === currentMonth.getFullYear()
        && visibleMonth.getMonth() === currentMonth.getMonth();
    const moveMonth = (offset) => setVisibleMonth((month) =>
        new Date(month.getFullYear(), month.getMonth() + offset, 1, 12));
    const showEventMonth = (event) => {
        const date = parseCalendarDate(event.date);
        if (date) setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
    };

    return (
        <section className="company-tab-section">
            <p className="company-eyebrow">Bolagets datum</p>
            <h2>Rapporter och kapitalhändelser</h2>
            <div className="company-calendar-layout">
                <div className="company-calendar">
                    <header className="company-calendar-toolbar">
                        <button type="button" disabled={showingCurrentMonth} aria-label="Föregående månad" onClick={() => moveMonth(-1)}><FiChevronLeft /></button>
                        <h3>{visibleMonth.toLocaleDateString("sv-SE", { month: "long", year: "numeric" })}</h3>
                        <button type="button" aria-label="Nästa månad" onClick={() => moveMonth(1)}><FiChevronRight /></button>
                    </header>
                    <div className="company-calendar-weekdays" aria-hidden="true">
                        {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map((day) => <span key={day}>{day}</span>)}
                    </div>
                    <div className="company-calendar-grid" role="grid" aria-label={visibleMonth.toLocaleDateString("sv-SE", { month: "long", year: "numeric" })}>
                        {days.map((date) => {
                            const key = calendarDateKey(date);
                            const dayEvents = eventsByDate.get(key) ?? [];
                            const outsideMonth = date.getMonth() !== visibleMonth.getMonth();
                            const hasPassed = key < todayKey;
                            return (
                                <div
                                    key={key}
                                    role="gridcell"
                                    className={`company-calendar-day ${outsideMonth ? "outside" : ""} ${hasPassed ? "past" : ""} ${key === todayKey ? "today" : ""}`}
                                >
                                    <time dateTime={key}>{date.getDate()}</time>
                                    <div className="company-calendar-day-events">
                                        {dayEvents.slice(0, 2).map((event) => (
                                            <span key={event.id ?? event.eventId ?? `${event.type}-${event.date}`} title={`${calendarEventLabel(event.type)}${event.fiscalPeriod ? ` · ${event.fiscalPeriod}` : ""}`}>
                                                {event.fiscalPeriod ?? calendarEventLabel(event.type)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <aside className="company-calendar-upcoming" aria-label="Kommande händelser">
                    <div className="company-calendar-upcoming-heading">
                        <h3>Kommande</h3>
                        <span>{events.length}</span>
                    </div>
                    {events.length ? events.slice(0, 6).map((event) => {
                        const date = parseCalendarDate(event.date);
                        return (
                            <button type="button" key={event.id ?? event.eventId ?? `${event.type}-${event.date}`} onClick={() => showEventMonth(event)}>
                                <time dateTime={calendarDateKey(event.date)}>
                                    <strong>{date?.getDate()}</strong>
                                    <span>{date?.toLocaleDateString("sv-SE", { month: "short", year: "numeric" })}</span>
                                </time>
                                <span>
                                    <strong>{event.fiscalPeriod ?? calendarEventLabel(event.type)}</strong>
                                    <small>{calendarEventLabel(event.type)}</small>
                                </span>
                                <FiChevronRight />
                            </button>
                        );
                    }) : <p className="company-empty">Inga kommande bolagshändelser är bekräftade.</p>}
                </aside>
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

// Tabs that live behind Plus. Everything else — identity, chart, description,
// news and calendar — stays open so the page works as a public landing page.
const PLUS_TABS = new Set(["financials", "estimates", "valuation", "insiders"]);

function PlusTabGate({ companyName }) {
    const { isGuestUser } = useAuthContext();
    const { openModal } = useModal();
    return (
        <section className="company-tab-section company-plus-gate">
            <FaLock />
            <h2>Finansiell data ingår i Plus</h2>
            <p>
                Omsättning, resultat, marginaler och estimat för {companyName} – tillsammans med
                live-nyhetsflödet och klickbara tickers i breven.
            </p>
            <div className="company-plus-gate-actions">
                <Link href="/pro" className="primary-btn extra-padding">Se planer – från 49 kr/mån</Link>
                {isGuestUser !== false && (
                    <button onClick={() => openModal(<LogInModal />)}>Har du redan Plus? Logga in</button>
                )}
            </div>
        </section>
    );
}

export default function CompanyPage({ symbol, initialData, initialTab, initialRange, initialMovingAverages, mentions = [] }) {
    const { isPlusUser } = useAuthContext();
    const allowedTab = TABS.some((tab) => tab.id === initialTab) ? initialTab : "overview";
    const [tab, setTab] = useState(allowedTab);

    useEffect(() => {
        setTab(allowedTab);
    }, [allowedTab]);

    if (!initialData?.summary) {
        return (
            <main className="company-page company-not-found">
                <h1>Aktien kunde inte hittas</h1>
                <p>Kontrollera symbolen eller använd aktiesökningen i sidhuvudet.</p>
                <Link className="company-text-link" href="/">Till startsidan <FiChevronRight /></Link>
            </main>
        );
    }

    const { summary } = initialData;
    const profile = summary.profile;
    // The server already resolved the plan while fetching, so the correct view
    // renders on the first paint; the context is only a fallback for payloads
    // from a backend that predates the access flag.
    const hasPlus = initialData.access?.plus ?? isPlusUser;

    const selectTab = (nextTab) => {
        setTab(nextTab);
        const params = new URLSearchParams(window.location.search);
        if (nextTab === "overview") params.delete("tab");
        else params.set("tab", nextTab);
        const query = params.toString();
        const path = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
        window.history.replaceState(window.history.state, "", path);
    };

    return (
        <main className="company-page">
            

            {/* <Performance returns={summary.performance?.returns} /> */}
            <CompanyChart
                summary={summary}
                symbol={symbol}
                chart={initialData.chart}
                news={initialData.news}
                reports={initialData.reports}
                initialRange={initialRange}
                initialMovingAverages={initialMovingAverages}
                companyName={initialData.summary.profile.name ?? initialData.summary.symbol}
            />

            <nav className="company-tabs" aria-label="Bolagsnavigation">
                {TABS.map((item) => (
                    <button type="button" key={item.id} className={"flex flex-row items-center " + (tab === item.id ? "active" : "")} onClick={() => selectTab(item.id)}>
                        {item.label}
                        {!hasPlus && PLUS_TABS.has(item.id) && <FaLock className="company-tab-lock" />}
                    </button>
                ))}
            </nav>

            {tab === "overview" && <OverviewTab data={initialData} mentions={mentions} onSelectTab={selectTab} />}
            {!hasPlus && PLUS_TABS.has(tab) && <PlusTabGate companyName={profile.name ?? symbol} />}
            {hasPlus && tab === "financials" && <FinancialsTab financials={initialData.financials} estimates={initialData.estimates} />}
            {hasPlus && tab === "estimates" && <EstimatesTab summary={summary} financials={initialData.financials} estimates={initialData.estimates} />}
            {hasPlus && tab === "valuation" && <ValuationTab symbol={symbol} companyName={profile.name ?? symbol} />}
            {hasPlus && tab === "insiders" && <InsidersTab symbol={symbol} companyName={profile.name ?? symbol} marketCap={(() => {
                // The newest period does not always carry a share count; use
                // the most recent one that does.
                const price = summary.quote?.price;
                if (!price) return null;
                for (const periods of [initialData.financials?.ttm, initialData.financials?.quarterly, initialData.financials?.annual]) {
                    for (let index = (periods?.length ?? 0) - 1; index >= 0; index -= 1) {
                        if (periods[index]?.sharesOutstanding) return price * periods[index].sharesOutstanding;
                    }
                }
                return null;
            })()} />}
            {tab === "news" && <NewsTab data={initialData} />}
            {tab === "calendar" && <CalendarTab calendar={summary.calendar} />}
        </main>
    );
}
