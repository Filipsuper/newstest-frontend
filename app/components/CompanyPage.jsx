"use client";

import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Area,
    Bar,
    CartesianGrid,
    Cell,
    ComposedChart,
    Line,
    ReferenceDot,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { FiChevronLeft, FiChevronRight, FiExternalLink, FiInfo, FiShare2, FiSliders } from "react-icons/fi";
import { FaLock, FaScaleBalanced } from "react-icons/fa6";
import { useAuthContext } from "../providers/AuthProvider";
import ShareStockModal from "../modals/ShareStockModal";
import NewsFeedItem from "./NewsFeedItem";
import FollowCompanyButton from "./FollowCompanyButton";
import { storyToItem } from "../utils/storyToItem";
import { chronologicalNews, safeSourceUrl, storyHref } from "../utils/newsroom";
import { Container, Heading, Inline, Stack, Text } from "./ui/layout";
import { Button, IconButton } from "./ui/Button";
import { ChangeBadge, EmptyState } from "./ui/data";
import { Checkbox } from "./ui/Choices";
import { Dialog } from "./ui/overlays";
import { SegmentedControl } from "./ui/SegmentedControl";
import CompanyReportShell, { ReportSection } from "./CompanyReportShell";
import CompanyManagementComment from "./CompanyManagementComment";
import CompanyFinancialOverview from "./CompanyFinancialOverview";
import CompanyResearchProfile from "./CompanyResearchProfile";
import CompanyValuation from "./CompanyValuation";
import { financialPeriodLabel, researchPeriods } from "../utils/companyResearch";
import { geographicRevenueForCompany, segmentRevenueForCompany } from "../utils/segmentRevenue";
import styles from "./company-report.module.css";
import { fetchCompanyIntraday, fetchInsiders, fetchShorts } from "../utils/api";
import { companyPriceCurrency, pollCompanySnapshots } from "../utils/companyPriceUpdates";
import { COMPANY_CHART_RANGES as RANGES, companyChartRange, companyRangeDisabled, companyIntradayRows, companyIntradayTick } from "../utils/companyChartRanges";
import { tagLabel } from "../utils/newsTags";

const API_URL = process.env.NEXT_PUBLIC_API_URL;


const LINE_FADES = [
    ["company-line-fade-yellow", "--company-yellow", "--company-yellow-bright"],
    ["company-line-fade-blue", "--company-blue", "--company-blue-bright"],
    ["company-line-fade-muted", "--company-muted-line", "--company-muted-line-bright"],
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

function MoveDrivers({ drivers }) {
    const [lead] = chronologicalNews(drivers.map(storyToItem));
    if (!lead) return null;
    return (
        <aside className={styles.driver} aria-labelledby="company-mover-heading">
            <Heading as="h2" size="subsection" id="company-mover-heading">Aktuell händelse</Heading>
            <NewsFeedItem item={lead} showSymbol={false} summaryPreview />
        </aside>
    );
}

function EventMarker({ cx, cy, items, onOpenStory }) {
    if (!Number.isFinite(cx) || !Number.isFinite(cy) || !items?.length) return null;
    const marker = EVENT_MARKERS[items[0].type];
    // A news mark opens the story in the reader; a report mark points at the
    // issuer's own PDF, which belongs in a new tab.
    const story = items.find((item) => item.story)?.story ?? null;
    const url = safeSourceUrl(items.find((item) => item.url)?.url);
    const activate = story
        ? () => onOpenStory(story)
        : url ? () => window.open(url, "_blank", "noopener,noreferrer") : undefined;
    return (
        <g
            role={activate ? "button" : "img"}
            tabIndex={activate ? 0 : undefined}
            data-company-story={story ? "true" : undefined}
            onKeyDown={activate ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); activate(); } } : undefined}
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

function ChartTooltip({ active, payload, label, compare, intraday, currency, timezone }) {
    if (!active || !payload?.length) return null;
    const values = Object.fromEntries(payload.map((entry) => [entry.dataKey, entry.value]));
    const events = payload[0]?.payload?.events ?? [];
    return (
        <div className="company-tooltip">
            <strong>{intraday ? companyIntradayTick(label, "2d", timezone) : svDate(label)}</strong>
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
                <span>Kurs {number(values.currentPrice ?? values.previousPrice, 2)} {currency}</span>
            ) : compare ? (
                <>
                    <span>Aktien {pct(values.returnPct)}</span>
                    <span>OMXSPI {pct(values.benchmarkPct)}</span>
                </>
            ) : (
                <>
                    <span>Kurs {number(values.close, 2)} {currency}</span>
                    {values.ma50 != null && <span>MA50 {number(values.ma50, 2)} {currency}</span>}
                    {values.ma200 != null && <span>MA200 {number(values.ma200, 2)} {currency}</span>}
                    {values.volume != null && <span>Volym {Number(values.volume).toLocaleString("sv-SE")}</span>}
                </>
            )}
        </div>
    );
}

// Opens the share sheet for the move the reader is actually looking at: the
// selected period and its return.
function ShareMoveButton({ symbol, companyName, range, ma50, ma200 }) {
    return (
        <Dialog title={`Dela ${companyName}`} trigger={<IconButton label="Dela aktien"><FiShare2 aria-hidden="true" /></IconButton>}>
            <ShareStockModal symbol={symbol} companyName={companyName} rangeId={range} ma50={ma50} ma200={ma200} embedded />
        </Dialog>
    );
}

function CompanyChart({ chart, companyName, summary, symbol, initialRange, initialMovingAverages = "", news, reports, onQuoteChange }) {
    const router = useRouter();
    const [range, setRange] = useState(
        RANGES.some((option) => option.id === initialRange) ? initialRange : "1y",
    );
    const [compare, setCompare] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const initialMaSelection = String(initialMovingAverages).split(",");
    const [ma50, setMa50] = useState(initialMaSelection.includes("50"));
    const [ma200, setMa200] = useState(initialMaSelection.includes("200"));
    const [showEvents, setShowEvents] = useState(true);
    useEffect(() => {
        if (window.location.pathname !== `/aktie/${encodeURIComponent(symbol)}`) return;
        const params = new URLSearchParams(window.location.search);
        if (range !== "1y" || params.has("range")) params.set("range", range);
        const averages = [ma50 && "50", ma200 && "200"].filter(Boolean).join(",");
        if (averages) params.set("ma", averages);
        else params.delete("ma");
        const query = params.toString();
        const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
        window.history.replaceState(window.history.state, "", next);
    }, [range, ma50, ma200, symbol]);
    const [intraday, setIntraday] = useState(null);
    const [intradayError, setIntradayError] = useState("");
    const [intradayLive, setIntradayLive] = useState(false);
    const lastLiveTickRef = useRef(null);
    const snapshotOnly = Boolean(summary?.priceCapabilities);
    const selectedRange = companyChartRange(range);
    const isIntraday = Boolean(selectedRange.intraday);

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
        const dailyRange = isIntraday ? companyChartRange("1y") : selectedRange;
        // The wire's story history only reaches back a few months, so on the
        // multi-year ranges the news marks would bunch against the right edge
        // instead of explaining moves. Reports and dividends span the full
        // stored calendar and stay.
        const withNews = !["3y", "5y"].includes(range);
        const ma50Values = movingAverage(allRows, 50);
        const ma200Values = movingAverage(allRows, 200);
        const benchmark = new Map((chart?.benchmark?.bars ?? []).map((row) => [row.date, row.close]));
        const start = Math.max(0, allRows.length - dailyRange.sessions);
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
    }, [chart, range, selectedRange, isIntraday, markers, showEvents]);

    useEffect(() => {
        if (snapshotOnly) {
            setIntradayLive(false);
            setIntraday(null);
            setIntradayError("");
            // The five-stock pilot has no tick subscription. Poll the same
            // chart contract on every range so the header quote also updates.
            if (summary.priceCapabilities.minute?.status !== "supported") return undefined;
            return pollCompanySnapshots({
                load: () => fetchCompanyIntraday(symbol),
                onData: (payload) => {
                    setIntraday(payload);
                    setIntradayError(payload.current?.length ? "" : "Kursdata saknas för perioden.");
                },
                onError: () => setIntradayError("Kunde inte uppdatera kursen."),
            });
        }
        if (!isIntraday) {
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
                        let previousFull = current.previousFull ?? [];
                        let currentBars = current.current ?? [];
                        let previousClose = current.previousClose;
                        let sessionDate = current.sessionDate;
                        let previousSessionDate = current.previousSessionDate;

                        if (sessionDate && tickDay < sessionDate) return current;
                        if (sessionDate && tickDay !== sessionDate) {
                            previousFull = currentBars;
                            previous = currentBars.slice(Math.floor(currentBars.length * 0.75));
                            previousClose = currentBars.at(-1)?.close ?? previousClose;
                            previousSessionDate = sessionDate;
                            sessionDate = tickDay;
                            currentBars = [];
                        }

                        const nextPoint = { time: bucketTime, close: Number(tick.price), volume: null };
                        const latest = currentBars.at(-1);
                        if (latest && bucketTime < latest.time) return current;
                        // Retain this session's morning observations. The session
                        // rollover bounds the 10-second series; a 700-point tail
                        // would silently turn the 2-day view into two partial days.
                        const nextBars = latest?.time === bucketTime
                            ? [...currentBars.slice(0, -1), nextPoint]
                            : [...currentBars, nextPoint];
                        return {
                            ...current,
                            sessionDate: sessionDate ?? tickDay,
                            previousSessionDate,
                            previousClose,
                            previous,
                            previousFull,
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
                if (active) {
                    setIntraday(payload);
                    setIntradayError(payload.current?.length ? "" : "Kursdata saknas för perioden.");
                }
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
    }, [isIntraday, symbol, snapshotOnly, summary.priceCapabilities]);

    const intradayData = useMemo(() => companyIntradayRows(intraday, range), [intraday, range]);
    const data = isIntraday ? intradayData : dailyData;
    const chartCompare = !isIntraday && compare;
    // Tick data has no event history of its own, so the marks belong to the
    // daily ranges only.
    const markedRows = isIntraday ? [] : dailyData.filter((row) => row.events.length);
    const markedTypes = [...new Set(markedRows.flatMap((row) => row.events.map((event) => event.type)))]
        .sort((left, right) => EVENT_MARKERS[left].rank - EVENT_MARKERS[right].rank);
    const firstIntradayPoint = intradayData.find((row) => row.session === "current");
    const lastIntradayPoint = intradayData.findLast((row) => row.currentPrice != null);
    const profile = summary.profile;
    const quote = useMemo(() => {
        if (snapshotOnly && intraday) return intraday.quote ? { ...summary.quote, ...intraday.quote } : null;
        return isIntraday && intraday?.quote ? { ...summary.quote, ...intraday.quote } : summary.quote;
    }, [isIntraday, snapshotOnly, intraday, summary.quote]);
    const priceCurrency = companyPriceCurrency(profile, quote);
    useEffect(() => { onQuoteChange?.(quote); }, [quote, onQuoteChange]);
    const loadingIntraday = isIntraday && !data.length;
    const placeholderPrice = Number(quote?.price ?? dailyData.at(-1)?.close ?? 1);
    const renderedData = data;
    const intradayPrices = [
        intraday?.previousClose,
        ...intradayData.map((row) => row.previousPrice ?? row.currentPrice),
    ].filter((value) => Number.isFinite(value) && value > 0);
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


    return (
        <div className={styles.intro}>
            <header className={styles.identity}>
                <div className={styles.identityTop}>
                    <div>
                        <Heading as="h1" size="page" id="overview-heading" tabIndex={-1}>{profile.name ?? symbol}</Heading>
                        <Text size="sm" tone="secondary" className={styles.identityMeta}>
                            {[profile.nativeSymbol ?? symbol, profile.segment?.replaceAll("_", " "), profile.sector].filter(Boolean).join(" · ")}
                        </Text>
                    </div>
                    <span data-nosnippet=""><FollowCompanyButton symbol={symbol} name={profile.name} /></span>
                </div>
                <Text size="sm" tone="secondary">Följ nyheter om {companyName}, aktiens kursreaktioner och kommande rapporter.</Text>
                <div className={styles.quote} data-nosnippet="">
                    <strong>{quote?.price == null ? "Kurs saknas" : `${number(quote.price, 2)} ${priceCurrency === "SEK" ? "kr" : priceCurrency}`}</strong>
                    <ChangeBadge value={quote?.changePct} label="Dagsförändring" />
                    <span className={styles.quoteMeta}>{snapshotOnly && quote?.quoteTime ? svDate(quote.quoteTime) : "Idag"}{quote?.change != null && ` · ${quote.change > 0 ? "+" : ""}${number(quote.change, 2)} ${priceCurrency}`}</span>
                </div>
                <Text as="span" size="xs" tone="secondary" data-nosnippet="">
                    {quote?.quoteTime || quote?.dataAsOf ? `Kursuppdatering ${svDateTime(quote.quoteTime ?? quote.dataAsOf)}` : "Kurstidpunkt saknas"}
                    {quote?.delayed && " · Fördröjd kurs"}
                    {(quote?.source?.startsWith("yahoo") || chart?.sourceName === "Yahoo Finance") && <> · Källa: <a href="https://finance.yahoo.com/" target="_blank" rel="noreferrer">Yahoo Finance</a></>}
                    {snapshotOnly && quote?.price != null && " · Kan vara fördröjd"}
                </Text>
            </header>
            <div className={styles.controls} data-nosnippet="">
                <SegmentedControl label="Kursperiod" value={range} onValueChange={setRange} className={styles.ranges}
                    options={RANGES.map((option) => ({
                        value: option.id, label: option.label,
                        disabled: companyRangeDisabled(option, chart?.bars?.length ?? 0, summary.priceCapabilities),
                    }))} />
                <div className={styles.actions}>
                    <ShareMoveButton symbol={symbol} companyName={companyName} range={range} ma50={!isIntraday && ma50} ma200={!isIntraday && ma200} />
                    {!isIntraday && <>
                        <IconButton label="Jämför med OMXSPI" aria-pressed={compare} onClick={() => setCompare((value) => !value)}><FaScaleBalanced aria-hidden="true" /></IconButton>
                        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen} title="Diagraminställningar" trigger={<IconButton label="Diagraminställningar"><FiSliders aria-hidden="true" /></IconButton>}>
                            <Stack gap={4}>
                                <Checkbox label="MA50" aria-label="MA50" description="Glidande medelvärde, 50 handelsdagar" checked={ma50} onCheckedChange={setMa50} />
                                <Checkbox label="MA200" aria-label="MA200" description="Glidande medelvärde, 200 handelsdagar" checked={ma200} onCheckedChange={setMa200} />
                                <Checkbox label="Händelser" aria-label="Händelser" description="Rapporter och utdelningar. Väsentliga nyheter visas för perioder upp till 1 år." checked={showEvents} onCheckedChange={setShowEvents} />
                            </Stack>
                        </Dialog>
                    </>}
                </div>
            </div>
            {!isIntraday && !dailyData.length ? <EmptyState title="Ingen historisk kursdata är tillgänglig ännu." /> : <div className={`${styles.chartLayout} ${drivers.length ? styles.chartWithContext : ""}`}>
            <div className="company-chart-main" data-nosnippet="">
            <div className={`company-chart ${loadingIntraday ? "company-chart-is-loading" : ""}`} role="group" aria-label={`Kursutveckling för ${companyName}`}>
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
                        <XAxis dataKey="date" tickFormatter={(value) => isIntraday ? companyIntradayTick(value, range, intraday?.timezone) : svDate(value, true)} minTickGap={58} axisLine={false} tickLine={false} />
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
                        <Tooltip content={(props) => loadingIntraday ? null : <ChartTooltip {...props} compare={chartCompare} intraday={isIntraday} currency={priceCurrency === "SEK" ? "kr" : priceCurrency} timezone={intraday?.timezone} />} />
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
                            <Line yAxisId="price" type="monotone" dataKey="currentPrice" stroke="url(#company-line-fade-yellow)" strokeWidth={2.2} dot={data.length === 1 ? { r: 3 } : false} isAnimationActive={false} connectNulls={false} />
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
                                        onOpenStory={(story) => router.push(storyHref(story.id, story.title ?? story.headline), { scroll: false })}
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
                        <span>{intradayError || (range === "2d" ? "Hämtar två handelsdagar" : "Hämtar dagens kurs")}</span>
                    </div>
                )}
            </div>
            <div className="company-chart-legend">
                <span><i className="legend-yellow" />{companyName}</span>
                {range === "2d" && intraday && !intraday.previousFull?.length && <span>Föregående handelsdag saknas.</span>}
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
                    <MoveDrivers drivers={drivers} />
                )}
            </div>}
        </div>
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

function FinancialSummary({ highlights }) {
    const period = highlights?.ttm ?? highlights?.annual ?? highlights?.quarterly;
    if (!period) return null;
    const currency = highlights.currency ?? "SEK";
    // This summary was public before the report migration and stays public;
    // the detailed statements below still use server-resolved Plus access.
    return <Stack gap={3} className={styles.financialSummary}>
        <div className={styles.metrics}>
            {[
                ["Omsättning", money(period.revenue, currency)],
                ["EBIT", money(period.ebit, currency)],
                ["Nettoresultat", money(period.netIncome, currency)],
                ["Fritt kassaflöde", money(period.freeCashFlow, currency)],
                ["Nettoskuld", money(period.netDebt, currency)],
                ["Nettoskuld / EBITDA", period.netDebtToEbitda == null ? "Saknas" : `${number(period.netDebtToEbitda, 2)}×`],
            ].map(([label, value]) => <div key={label}><Text size="xs" tone="secondary">{label}</Text><Text numeric>{value}</Text></div>)}
        </div>
        <Text size="xs" tone="secondary">{periodLabel(period)}{highlights.source && ` · ${highlights.source}`}{highlights.dataAsOf && ` · ${svDate(highlights.dataAsOf)}`}</Text>
    </Stack>;
}

// Company news opens the shared URL-backed reader, preserving page context.
function NewsList({ news }) {
    const [count, setCount] = useState(6);
    const items = useMemo(() => chronologicalNews((news ?? []).map(storyToItem)), [news]);
    if (!items.length) return <EmptyState title="Inga bolagsspecifika nyheter finns ännu." />;
    return (
        <Stack gap={2}>
            {items.slice(0, count).map(item => <NewsFeedItem key={item.id} item={item} showSymbol={false} />)}
            {items.length > count && <Button variant="secondary" onClick={() => setCount(value => value + 6)}>Visa fler nyheter</Button>}
        </Stack>
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
                <Button variant="ghost" size="sm" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
                    {expanded ? "Visa mindre" : "Läs mer"}
                </Button>
            )}
        </>
    );
}

function CompanyAbout({ summary }) {
    const { profile } = summary;
    return <details className={styles.details}>
        <summary>Om {profile.name ?? summary.symbol}</summary>
        <div className={styles.about}>
            <Text>{profile.description || "Bolagsbeskrivning saknas ännu."}</Text>
            <dl className={styles.facts}>
                {profile.sector && <><dt>Sektor</dt><dd>{profile.sector}</dd></>}
                {profile.industry && <><dt>Bransch</dt><dd>{profile.industry}</dd></>}
                {profile.employees && <><dt>Anställda</dt><dd>{Number(profile.employees).toLocaleString("sv-SE")}</dd></>}
                {safeSourceUrl(profile.website) && <><dt>Webbplats</dt><dd><a href={safeSourceUrl(profile.website)} target="_blank" rel="noreferrer">Besök bolaget ↗</a></dd></>}
            </dl>
        </div>
    </details>;
}


// A row's whole history in one glance: tiny bars over every known period,
// each filled with a gradient that is strongest at the bar's tip and fades
// toward the row's own zero level. Bars below zero wear the negative color.
// Plain SVG — thirty rows of a charting library would be felt, this is not.
function MiniTrend({ points, format }) {
    const id = useId().replace(/[^a-z0-9]/gi, "");
    const width = 148;
    const height = 30;
    const known = points.filter((point) => point.value != null);
    if (known.length < 2) return null;
    const top = Math.max(0, ...known.map((point) => point.value));
    const bottom = Math.min(0, ...known.map((point) => point.value));
    const range = top - bottom || 1;
    const y = (value) => ((top - value) / range) * (height - 2) + 1;
    const zero = y(0);
    const hasNegative = bottom < 0;
    const gap = points.length > 20 ? 1 : 2;
    const barWidth = Math.max(1.5, (width - gap * (points.length - 1)) / points.length);
    return (
        <svg className="company-trend" viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label="Utveckling över alla tillgängliga perioder">
            <defs>
                {/* Rendered even when degenerate (top === 0): SVG then paints
                    the last stop, which is exactly the faint stub we want. */}
                <linearGradient id={`trend-bar-pos-${id}`} gradientUnits="userSpaceOnUse" x1="0" y1="1" x2="0" y2={zero}>
                    <stop offset="0" className="company-trend-stop-strong" />
                    <stop offset="1" className="company-trend-stop-faint" />
                </linearGradient>
                {hasNegative && (
                    <linearGradient id={`trend-bar-neg-${id}`} gradientUnits="userSpaceOnUse" x1="0" y1={zero} x2="0" y2={height - 1}>
                        <stop offset="0" className="company-trend-stop-neg-faint" />
                        <stop offset="1" className="company-trend-stop-neg-strong" />
                    </linearGradient>
                )}
            </defs>
            {hasNegative && <line className="company-trend-zero" x1="1" x2={width - 1} y1={zero} y2={zero} />}
            {points.map((point, index) => point.value == null ? null : (
                <rect
                    key={index}
                    x={index * (barWidth + gap)}
                    y={point.value >= 0 ? y(point.value) : zero}
                    width={barWidth}
                    height={Math.max(Math.abs(y(point.value) - zero), 1.5)}
                    fill={`url(#trend-bar-${point.value < 0 ? "neg" : "pos"}-${id})`}
                    className={point.estimate ? "company-trend-estimate" : ""}
                >
                    <title>{`${point.label}: ${format(point.value)}`}</title>
                </rect>
            ))}
        </svg>
    );
}

function FinancialsTab({ symbol, financials, estimates }) {
    const segmentRevenue = segmentRevenueForCompany(financials, symbol);
    const geographicRevenue = geographicRevenueForCompany(financials, symbol);
    const latestEstimate = upcomingEstimateSnapshot(estimates?.latest, financials);
    const estimatePeriod = estimatePeriodFromSnapshot(latestEstimate);
    const [frequency, setFrequency] = useState(financials?.quarterly?.length ? "quarterly" : financials?.annual?.length ? "annual" : financials?.ttm?.length ? "ttm" : "quarterly");
    const [showTtm, setShowTtm] = useState(false);
    const options = [
        ["quarterly", "Kvartal", financials?.quarterly],
        ["annual", "År", financials?.annual],
        // Never label rolling data as a reported quarter or year. Retain the
        // existing R12-only fallback; otherwise R12 belongs in the full table.
        ...(!financials?.quarterly?.length && !financials?.annual?.length && financials?.ttm?.length ? [["ttm", "R12", financials.ttm]] : []),
    ];
    const basePeriods = researchPeriods(options.find(([id]) => id === frequency)?.[2] ?? [], financials?.currency ?? financials?.[frequency]?.find(p => p.currency)?.currency, frequency, Infinity);
    const statementBase = showTtm ? financials.ttm : basePeriods;
    const estimateTail = !showTtm && frequency === "quarterly" && estimatePeriod ? [estimatePeriod] : [];
    const periods = [
        ...statementBase.slice(estimateTail.length ? -5 : -6),
        ...estimateTail,
    ];
    // The trend column reads the whole history, not just the visible slice —
    // that is what lets the visible table stay narrow without losing the long view.
    const trendPeriods = [...statementBase, ...estimateTail];
    const currency = financials?.currency ?? latestEstimate?.metrics?.find((metric) => metric.currency)?.currency ?? "SEK";
    const valueOf = (period, row) => (row.get ? row.get(period) : period[row.key]);
    const has = (row) => periods.some((period) => valueOf(period, row) != null);
    const row = (label, key, type, subs = []) => ({ label, key, type, subs });
    const sub = (label, key, type, get) => ({ label, key, type, get, sub: true });
    // The statement view, grouped the way an annual report reads. Percent rows
    // sit directly under the figure they qualify — the rhythm of absolute
    // numbers broken by relative ones is what makes the table scannable. A row
    // only appears when at least one shown period carries the figure.
    const financialGroups = [
        ["Resultaträkning", [
            row("Omsättning", "revenue", "money", [
                sub("Tillväxt å/å", "revenueGrowthPct", "signedPct"),
            ]),
            row("Bruttoresultat", "grossProfit", "money", [
                sub("Bruttomarginal", "grossMarginPct", "pct"),
            ]),
            row("EBITDA", "ebitda", "money", [
                sub("EBITDA-marginal", "ebitdaMarginPct", "pct", (period) =>
                    period.ebitda != null && period.revenue > 0 ? (period.ebitda / period.revenue) * 100 : null),
            ]),
            row("EBITA", "ebita", "money"),
            row("Rörelseresultat (EBIT)", "ebit", "money", [
                sub("EBIT-marginal", "ebitMarginPct", "pct"),
            ]),
            row("Resultat före skatt", "pretaxIncome", "money"),
            row("Nettoresultat", "netIncome", "money", [
                sub("Nettomarginal", "netMarginPct", "pct"),
            ]),
            row("Vinst per aktie", "dilutedEps", "eps"),
            row("Antal aktier", "sharesOutstanding", "shares"),
        ]],
        ["Balansräkning", [
            row("Eget kapital", "equity", "money", [
                sub("Soliditet", "equityRatioPct", "pct"),
            ]),
            row("Rörelsekapital", "workingCapital", "money"),
        ]],
        ["Tillgångar", [
            row("Totala tillgångar", "totalAssets", "money"),
            row("Kassa och likvida medel", "cash", "money"),
        ]],
        ["Skulder", [
            row("Totala skulder", "totalLiabilities", "money"),
            row("Räntebärande skulder", "totalDebt", "money"),
            row("Nettoskuld", "netDebt", "money", [
                sub("Nettoskuld / EBITDA", "netDebtToEbitda", "x"),
            ]),
        ]],
        ["Kassaflöde", [
            row("Kassaflöde från driften", "operatingCashFlow", "money", [
                sub("Kassagenerering (OCF/EBITDA)", "cashConversionPct", "pct"),
            ]),
            row("Investeringar (capex)", "capitalExpenditure", "money"),
            row("Fritt kassaflöde", "freeCashFlow", "money", [
                sub("FCF-marginal", "freeCashFlowMarginPct", "pct"),
            ]),
            row("Utdelning", "dividendsPaid", "money"),
            row("Återköp av aktier", "shareRepurchases", "money"),
        ]],
        ["Avkastning", [
            row("Avkastning på eget kapital (ROE)", "roePct", "pct"),
            row("Avkastning på investerat kapital (ROIC)", "roicPct", "pct"),
        ]],
    ]
        .map(([groupLabel, rows]) => [
            groupLabel,
            rows.filter(has).map((item) => ({ ...item, subs: (item.subs ?? []).filter(has) })),
        ])
        .filter(([, rows]) => rows.length);
    const formatValue = (value, type) => {
        if (value == null) return "–";
        if (type === "money") return money(value, currency);
        if (type === "eps") return number(value, 2);
        if (type === "shares") return `${number(value / 1e6, 1)} M`;
        if (type === "x") return `${number(value, 1)}x`;
        if (type === "signedPct") return pct(value);
        return `${number(value)}%`;
    };
    const valueClass = (value, type) =>
        (type === "signedPct" || type === "pct" || type === "x") && value != null
            ? value < 0 ? "company-fin-neg" : "company-fin-pos"
            : "";
    // CSS sticky cannot pin the header to the viewport from inside the
    // horizontal scroll wrap, so a scroll handler slides the thead down while
    // the page scrolls through the table, and lets it go at the last row.
    const tableWrapRef = useRef(null);
    useEffect(() => {
        const thead = tableWrapRef.current?.querySelector("thead");
        if (!thead) return undefined;
        let frame = 0;
        const align = () => {
            frame = 0;
            const table = thead.parentElement;
            const offset = parseFloat(getComputedStyle(table).getPropertyValue("--report-offset")) || 0;
            const shift = Math.min(Math.max(offset - table.getBoundingClientRect().top, 0), table.clientHeight - thead.clientHeight);
            thead.style.transform = shift > 0 ? `translateY(${shift}px)` : "";
        };
        const onScroll = () => { if (!frame) frame = requestAnimationFrame(align); };
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        align();
        return () => {
            if (frame) cancelAnimationFrame(frame);
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            thead.style.transform = "";
        };
    }, [frequency, showTtm, periods.length]);
    const renderRow = (item) => (
        <tr key={item.key} className={item.sub ? "company-row-sub" : ""}>
            <th>{item.label}</th>
            {periods.map((period) => {
                const value = valueOf(period, item);
                return (
                    <td className={`${period.estimate ? "company-estimate-cell " : ""}${valueClass(value, item.type)}`} key={period.periodKey ?? period.periodEnd}>
                        {formatValue(value, item.type)}
                        {period.estimateAdjusted?.[item.key] && <small className="company-adjusted-mark"> just.</small>}
                    </td>
                );
            })}
            <td className="company-trend-cell">
                <MiniTrend
                    points={trendPeriods.map((period) => ({
                        value: valueOf(period, item),
                        estimate: Boolean(period.estimate),
                        label: periodLabel(period),
                    }))}
                    format={(value) => formatValue(value, item.type)}
                />
            </td>
        </tr>
    );
    return (
        <section className="company-tab-section">
            {options.some(([, , values]) => values?.length) && <Inline gap={3} className={styles.financialToolbar}>
                <Text size="xs" tone="secondary">{basePeriods.length ? `${frequency === 'annual' ? 'Senaste helår' : frequency === 'ttm' ? 'Senaste R12, beräknat' : 'Senaste kvartal'}: ${financialPeriodLabel(basePeriods.at(-1))}` : 'Rapporterade perioder saknas'}</Text>
                <SegmentedControl label="Finansiell period" value={frequency} onValueChange={value => { setFrequency(value); setShowTtm(false); }} options={options.map(([id, label, values]) => ({ value: id, label, disabled: !values?.length }))} />
            </Inline>}
            {periods.length || segmentRevenue || geographicRevenue
                ? <CompanyFinancialOverview periods={basePeriods} frequency={frequency} currency={financials?.currency} source={financials?.source} segmentRevenue={segmentRevenue} geographicRevenue={geographicRevenue} />
                : <p className="company-empty">Data saknas för vald period.</p>}
            {periods.length > 0 && (
                    <details className={`${styles.details} ${styles.researchDetails}`}>
                        <summary>Alla nyckeltal och rapporterade siffror</summary>
                        {frequency !== 'ttm' && financials?.ttm?.length > 0 && <Checkbox label="Visa R12 i tabellen (beräknat)" checked={showTtm} onCheckedChange={setShowTtm} />}
                    <div className="company-table-wrap" ref={tableWrapRef} tabIndex={0} role="region" aria-label="Finansiella nyckeltal, rulla i sidled">
                        <table className="company-financial-table company-financial-statement">
                            <colgroup>
                                <col className="company-metric-column" />
                                {periods.map((period) => (
                                    <col className="company-period-column" key={period.periodKey ?? period.periodEnd} />
                                ))}
                                <col className="company-trend-column" />
                            </colgroup>
                            <thead><tr>
                                <th>Nyckeltal</th>
                                {periods.map((period) => <th className={period.estimate ? "company-estimate-cell" : ""} key={period.periodKey ?? period.periodEnd}>{periodLabel(period)}</th>)}
                                <th className="company-trend-cell">{trendPeriods.length > periods.length ? `${trendPeriods.length} perioder` : "Trend"}</th>
                            </tr></thead>
                            <tbody>
                                {financialGroups.map(([groupLabel, rows]) => (
                                    <Fragment key={groupLabel}>
                                        <tr className="company-row-group"><th colSpan={periods.length + 2}>{groupLabel}</th></tr>
                                        {rows.map((item) => (
                                            <Fragment key={item.key}>
                                                {renderRow(item)}
                                                {item.subs.map((subItem) => renderRow(subItem))}
                                            </Fragment>
                                        ))}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
            <p className="company-source">
                ROE, ROIC, soliditet, kassagenerering och tillväxt beräknas av OMXsum ur bolagets rapporterade siffror. Avkastningsmått visas bara där resultatsidan täcker ett helt år (helår och R12); kvartalstillväxt jämför samma kvartal föregående år.
                {estimateTail.length ? ` Estimat: ${estimatePeriod.estimateSource.publisher ?? estimatePeriod.estimateSource.name}${estimatePeriod.estimateSource.contributors ? `, ${estimatePeriod.estimateSource.contributors} bidragsgivare` : ""}.` : ""}
                {estimateTail.length > 0 && estimatePeriod?.estimateSource.url && <> <a href={estimatePeriod.estimateSource.url} target="_blank" rel="noreferrer">Visa estimatkällan <FiExternalLink /></a></>}
            </p>
                    </details>
            )}
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
// total holdings — unlike the US Form 4 — so each person's 24-month pattern
// is joined onto their report-anchored holding in one list.
function insiderNetTrades(rows) {
    const byPerson = new Map();
    for (const row of rows) {
        if (typeof row.value !== "number" || (row.currency && row.currency !== "SEK")) continue;
        const entry = byPerson.get(row.person) ?? { position: row.position, count: 0, net: 0 };
        entry.count += 1;
        if (row.direction === "acquisition" || row.direction === "subscription") entry.net += row.value;
        else if (row.direction === "disposal") entry.net -= row.value;
        byPerson.set(row.person, entry);
    }
    return byPerson;
}

const capSharePct = (value, marketCap) =>
    marketCap && value ? (Math.abs(value) / marketCap) * 100 : null;

function InsidersTab({ symbol, companyName, marketCap, sharesOutstanding, price }) {
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
    const hasOwners = Boolean(ownership?.largestOwners?.length);
    // computed below once holdings exist; aside shows for either section
    const holdings = new Map((data?.personHoldings ?? []).map((entry) => [entry.person, entry]));
    // One row per person i ledande ställning: the report-anchored holding
    // (rolled forward with registry flows, valued at today's price) joined
    // with the person's own net trading over the stored 24 months. A person
    // appears with either side alone — a disclosed holding without filings,
    // or filings without any disclosed holding.
    const insiderPeople = (() => {
        const roleByPerson = new Map();
        for (const row of rows) {
            if (row.person && row.position && !roleByPerson.has(row.person)) roleByPerson.set(row.person, row.position);
        }
        const byName = new Map();
        for (const holding of holdings.values()) {
            const shares = holding.estimatedShares ?? holding.shares;
            if (shares == null) continue;
            byName.set(holding.person, {
                name: holding.person,
                role: holding.role || roleByPerson.get(holding.person) || null,
                shares,
                estimated: holding.flowCount > 0 && holding.estimatedShares != null && holding.estimatedShares !== holding.shares,
                includesRelated: holding.includesRelated,
            });
        }
        for (const lead of ownership?.leadership ?? []) {
            if (lead.shares == null || byName.has(lead.name)) continue;
            byName.set(lead.name, {
                name: lead.name, role: lead.role || null, shares: lead.shares,
                estimated: false, includesRelated: lead.includesRelated,
            });
        }
        for (const [person, trade] of insiderNetTrades(rows)) {
            const entry = byName.get(person);
            if (entry) {
                entry.net = trade.net;
                entry.tradeCount = trade.count;
            } else {
                byName.set(person, {
                    name: person,
                    role: roleByPerson.get(person) || trade.position || null,
                    shares: null, estimated: false, includesRelated: false,
                    net: trade.net, tradeCount: trade.count,
                });
            }
        }
        // Known holdings first (largest value on top); people with only
        // trades follow, ordered by the size of their net.
        return [...byName.values()]
            .map((person) => ({ ...person, value: price && person.shares != null ? person.shares * price : null }))
            .sort((left, right) => {
                const leftRank = left.value ?? left.shares;
                const rightRank = right.value ?? right.shares;
                if (leftRank != null && rightRank != null) return rightRank - leftRank;
                if (leftRank != null) return -1;
                if (rightRank != null) return 1;
                return Math.abs(right.net ?? 0) - Math.abs(left.net ?? 0);
            });
    })();
    const holdingShare = (row) => {
        const holding = holdings.get(row.person);
        if (!holding?.shares || row.unit !== "Quantity" || !row.volume) return null;
        return (row.volume / holding.shares) * 100;
    };
    // The registry and the annual report are independent sources: a small cap
    // with a disclosed owner table but no filed transactions still has an
    // ownership picture worth showing.
    const hasOwnershipView = hasOwners || insiderPeople.length > 0;

    return (
        <section className="company-tab-section">
            <p className="company-eyebrow">{ownership ? "FI:s insynsregister · Bolagets årsredovisning" : "FI:s insynsregister"}</p>
            <p className="company-intro">Vad personer i ledande ställning i {companyName} själva gör med aktien{hasOwners ? ", och vilka de största ägarna är" : ""}</p>

            {error && <p className="company-empty">{error}</p>}
            {!data && !error && <p className="company-empty">Hämtar insyn och ägarbild …</p>}
            {data && !rows.length && !hasOwnershipView && <p className="company-empty">Inga insynstransaktioner registrerade för bolaget under de senaste två åren, och ingen ägarförteckning har ännu hämtats ur bolagets rapporter.</p>}

            {(rows.length > 0 || hasOwnershipView) && (
                <div className={`company-insider-layout ${rows.length > 0 && hasOwnershipView ? "" : "company-insider-layout-single"}`}>
                    {!rows.length && (
                        <p className="company-empty">Inga insynstransaktioner registrerade för bolaget under de senaste två åren.</p>
                    )}
                    {rows.length > 0 && (
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
                    )}

                    {hasOwnershipView && (
                        <aside className="company-insider-owner-panel" aria-labelledby="company-insider-owners-heading">
                            {insiderPeople.length > 0 && (
                                <>
                                    <h3 className="company-insider-section-title">Insynspersoner</h3>
                                    <p className="company-insider-sub">Innehav ur bolagets rapporter{insiderPeople.some((person) => person.estimated) ? ", framrullade med registrerade affärer" : ""}, värderade till dagens kurs.{rows.length > 0 ? " Netto avser personens registrerade affärer under de senaste 24 månaderna." : ""}</p>
                                    <div className="company-insider-persons">
                                        {insiderPeople.slice(0, 12).map((person) => (
                                            <div key={person.name} className="company-insider-person-row">
                                                <span className="company-insider-person-name">{person.name}
                                                    <small>{person.role || "Person i ledande ställning"}</small>
                                                </span>
                                                <span className="company-insider-person-net">
                                                    {person.shares != null ? (
                                                        <>
                                                            <strong>{person.value != null ? money(person.value, "SEK") : `${Math.round(person.shares).toLocaleString("sv-SE")} st`}</strong>
                                                            <small>
                                                                {Math.round(person.shares).toLocaleString("sv-SE")} aktier
                                                                {sharesOutstanding ? ` · ${number((person.shares / sharesOutstanding) * 100, 2)} %` : ""}
                                                                {person.estimated ? " · uppskattat" : ""}
                                                            </small>
                                                        </>
                                                    ) : (
                                                        <small>Innehav ej känt</small>
                                                    )}
                                                    {(person.tradeCount ?? 0) > 0 && (
                                                        <small className={person.net >= 0 ? "company-insider-buy" : "company-insider-sell"}>
                                                            {person.net >= 0 ? "+" : "−"}{sekFull(Math.abs(person.net))} netto · {person.tradeCount} affärer
                                                        </small>
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                        {insiderPeople.length > 12 && <p className="company-insider-sub">Visar de 12 största av {insiderPeople.length} personer.</p>}
                                    </div>
                                </>
                            )}
                            {hasOwners && (<>
                            <h3 id="company-insider-owners-heading" className="company-insider-section-title">Största ägare</h3>
                            {ownership.ownersAsOf && <p className="company-insider-sub">Ägarbild {ownership.ownersAsOf}</p>}
                            <div className="company-insider-persons company-insider-owners">
                                {ownership.largestOwners.slice(0, 25).map((owner) => (
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
                            </>)}
                        </aside>
                    )}
                </div>
            )}
        </section>
    );
}

const SHORT_RANGES = [
    { id: "3m", label: "3 mån", sessions: 63 },
    { id: "12m", label: "12 mån", sessions: 252 },
    { id: "full", label: "Max", sessions: null },
];

function ShortsTab({ symbol, companyName, bars }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [range, setRange] = useState("full");

    useEffect(() => {
        let active = true;
        setData(null);
        setError(null);
        fetchShorts(symbol)
            .then((body) => { if (active) setData(body); })
            .catch((cause) => { if (active) setError(cause.message); });
        return () => { active = false; };
    }, [symbol]);

    const series = data?.series ?? [];
    const positions = data?.positions ?? [];
    const aggregate = data?.aggregate ?? null;

    // Daily closes joined with the disclosed short level in effect that day.
    // The disclosed sum is a step function: a position holds its reported
    // size until its next change, so the join carries the latest point
    // forward instead of interpolating.
    const chartData = useMemo(() => {
        if (!series.length || !bars?.length) return [];
        const firstShort = series[0].date;
        const firstIndex = bars.findIndex((bar) => bar.date >= firstShort);
        const start = Math.max(0, (firstIndex === -1 ? bars.length : firstIndex) - 60);
        let cursor = -1;
        return bars.slice(start).map((bar) => {
            while (cursor + 1 < series.length && series[cursor + 1].date <= bar.date) cursor += 1;
            return {
                time: new Date(bar.date).getTime(),
                date: bar.date,
                close: bar.close,
                shortPct: cursor >= 0 ? series[cursor].pct : null,
            };
        });
    }, [series, bars]);

    const sessions = SHORT_RANGES.find((option) => option.id === range)?.sessions ?? null;
    const visible = sessions ? chartData.slice(-sessions) : chartData;

    // Year marks over long windows, month marks inside one; the formatter
    // follows the same split.
    const spanDays = visible.length > 1
        ? (visible[visible.length - 1].time - visible[0].time) / 86400000
        : 0;
    const ticks = useMemo(() => {
        if (visible.length < 2) return [];
        const first = new Date(visible[0].date);
        const last = new Date(visible[visible.length - 1].date);
        const marks = [];
        if (spanDays > 730) {
            for (let year = first.getFullYear() + 1; year <= last.getFullYear(); year += 1) {
                marks.push(new Date(`${year}-01-01`).getTime());
            }
        } else {
            const cursor = new Date(first.getFullYear(), first.getMonth() + 1, 1);
            const stepMonths = spanDays > 200 ? 2 : 1;
            while (cursor <= last) {
                marks.push(cursor.getTime());
                cursor.setMonth(cursor.getMonth() + stepMonths);
            }
        }
        return marks;
    }, [visible, spanDays]);

    const maxShort = visible.reduce((most, point) => Math.max(most, point.shortPct ?? 0), 0);
    const ceiling = Math.max(1, Math.ceil(maxShort * 1.25));
    const visibleSum = positions.reduce((sum, position) => sum + (position.pct ?? 0), 0);
    const belowBar = aggregate ? Math.max(0, Math.round((aggregate.pct - visibleSum) * 100) / 100) : null;
    const available = Boolean(data?.available);

    return (
        <section className="company-tab-section">
            <p className="company-eyebrow">FI:s blankningsregister</p>
            <p className="company-intro">Hur stor andel av {companyName} som är blankad, och vilka som står bakom de största positionerna</p>

            {error && <p className="company-empty">{error}</p>}
            {!data && !error && <p className="company-empty">Hämtar blankningsdata …</p>}
            {data && !available && <p className="company-empty">Inga blankningspositioner över tröskelvärdena är anmälda för bolaget. Det utesluter inte mindre positioner — enskilda innehav syns först vid 0,5 % och aggregatet vid 0,1 % av kapitalet.</p>}

            {available && (
                <>
                    <div className="company-metric-grid company-metric-grid-small">
                        <Metric label="Total blankning" value={aggregate ? `${number(aggregate.pct, 2)} %` : "Saknas"} />
                        <Metric label="Namngivna positioner" value={`${number(visibleSum, 2)} %`} />
                        <Metric label="Under 0,5 %-tröskeln" value={belowBar == null ? "Saknas" : `${number(belowBar, 2)} %`} />
                    </div>

                    {chartData.length > 0 && (
                        <div className="company-period-tabs">
                            {SHORT_RANGES.map((option) => (
                                <button
                                    key={option.id}
                                    className={range === option.id ? "active" : ""}
                                    onClick={() => setRange(option.id)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {visible.length > 0 && (
                        <div className="company-shorts-chart" role="img" aria-label={`Blankning i ${companyName} över tid mot aktiekursen`}>
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={visible} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
                                    <defs>
                                        <linearGradient id="company-short-fill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="var(--company-yellow)" stopOpacity={0.32} />
                                            <stop offset="100%" stopColor="var(--company-yellow)" stopOpacity={0.02} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="var(--company-grid-line)" vertical={false} />
                                    <XAxis
                                        dataKey="time"
                                        type="number"
                                        scale="time"
                                        domain={["dataMin", "dataMax"]}
                                        axisLine={{ stroke: "var(--company-grid-line)" }}
                                        tickLine={false}
                                        ticks={ticks}
                                        tickFormatter={(value) => spanDays > 730
                                            ? new Date(value).getFullYear()
                                            : new Date(value).toLocaleDateString("sv-SE", { month: "short" })}
                                    />
                                    <YAxis
                                        yAxisId="short"
                                        axisLine={false}
                                        tickLine={false}
                                        width={52}
                                        domain={[0, ceiling]}
                                        tickFormatter={(value) => `${number(value, 1)} %`}
                                    />
                                    <YAxis yAxisId="price" hide domain={["auto", "auto"]} />
                                    <Tooltip
                                        cursor={{ stroke: "var(--company-grid-line)" }}
                                        content={({ active: hovered, payload }) => {
                                            if (!hovered || !payload?.length) return null;
                                            const point = payload[0].payload;
                                            return (
                                                <div className="company-tooltip">
                                                    <strong>{svDate(point.date)}</strong>
                                                    <span>Blankning {point.shortPct == null ? "–" : `${number(point.shortPct, 2)} %`}</span>
                                                    <span>Kurs {number(point.close, 2)}</span>
                                                    <span className="company-tooltip-note">Summan av namngivna positioner ≥ 0,5 %</span>
                                                </div>
                                            );
                                        }}
                                    />
                                    <Line
                                        yAxisId="price"
                                        type="monotone"
                                        dataKey="close"
                                        stroke="var(--company-muted-line)"
                                        strokeWidth={1.5}
                                        strokeDasharray="4 4"
                                        dot={false}
                                        isAnimationActive={false}
                                    />
                                    <Area
                                        yAxisId="short"
                                        type="stepAfter"
                                        dataKey="shortPct"
                                        stroke="var(--company-yellow)"
                                        strokeWidth={2}
                                        fill="url(#company-short-fill)"
                                        dot={false}
                                        connectNulls={false}
                                        isAnimationActive={false}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <h3 className="company-insider-section-title">Största blankare</h3>
                    {positions.length > 0 ? (
                        <>
                            <p className="company-insider-sub">Namngivna nettopositioner på minst 0,5 % av kapitalet, per position i FI:s register.</p>
                            <div className="company-insider-persons">
                                {positions.map((position) => (
                                    <div key={position.holder} className="company-insider-person-row">
                                        <span className="company-insider-person-name">{position.holder}
                                            <small>per {svDate(position.positionDate)}</small>
                                        </span>
                                        <span className="company-insider-person-net">
                                            <strong>{number(position.pct, 2)} %</strong>
                                            <small>av kapitalet</small>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="company-insider-sub">Inga enskilda positioner når 0,5 % just nu — hela blankningen ligger i mindre, icke namngivna positioner.</p>
                    )}

                    <p className="company-source">Källa: Finansinspektionens blankningsregister. Enskilda positioner offentliggörs först vid 0,5 % av aktiekapitalet; aggregatet summerar alla positioner över 0,1 % och kan därför överstiga de namngivna tillsammans. Den gula linjen visar summan av namngivna positioner över tid, med varje position kvar på sin senast anmälda nivå tills nästa ändring; den streckade linjen är stängningskursen. Att data saknas betyder att inget anmälts över tröskelvärdena — inte att ingen blankning finns. Ingen rekommendation.</p>
                </>
            )}
        </section>
    );
}

function NewsSection({ data, mentions, hasPlus }) {
    return <div className={styles.news}>
        <NewsList news={data.news} />
        <div className={styles.newsContext}>
            <details className={styles.details}>
                <summary>Rapportdokument{data.reports?.length ? ` · ${data.reports.length}` : ""}</summary>
                <div className={styles.documents}>
                    {!hasPlus ? <Text size="sm" tone="secondary">Rapportdokument ingår i Plus. <Link href="/pro">Utforska Plus →</Link></Text>
                    : data.availability?.reports === 'unavailable' ? <Text size="sm" tone="secondary">Rapportdokument kunde inte hämtas. Försök igen senare.</Text>
                    : (data.reports ?? []).length ? data.reports.map((report) => {
                        const href = safeSourceUrl(report.attachment?.url ?? report.releaseUrl);
                        return href ? <a key={report.reportDocumentId} href={href} target="_blank" rel="noreferrer">
                            <span>{report.title ?? report.periodLabel ?? report.fiscalPeriod} ↗</span><small>{svDate(report.publishedAt)}</small>
                        </a> : <Text key={report.reportDocumentId} size="sm">{report.title ?? report.periodLabel} · Källänk saknas</Text>;
                    }) : <Text size="sm" tone="secondary">Inga rapportdokument hittades.</Text>}
                </div>
            </details>
            {mentions?.length > 0 && <details className={styles.details}>
                <summary>Bolaget i breven · {mentions.length}</summary>
                <div className={styles.documents}>{mentions.map((item) => <Link key={item.id} href={`/article/${articleSlug(item.title)}`}>
                    <span>{item.title}</span><small>{item.isEveningLetter ? "Kvällsbrevet" : "Morgonbrevet"} · {svDate(item.createdAt, true)}</small>
                </Link>)}</div>
            </details>}
        </div>
        <CompanyAbout summary={data.summary} />
    </div>;
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
                        <IconButton disabled={showingCurrentMonth} label="Föregående månad" onClick={() => moveMonth(-1)}><FiChevronLeft /></IconButton>
                        <h3>{visibleMonth.toLocaleDateString("sv-SE", { month: "long", year: "numeric" })}</h3>
                        <IconButton label="Nästa månad" onClick={() => moveMonth(1)}><FiChevronRight /></IconButton>
                    </header>
                    <div className="company-calendar-weekdays" aria-hidden="true">
                        {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map((day) => <span key={day}>{day}</span>)}
                    </div>
                    <div className="company-calendar-grid" role="group" aria-label={visibleMonth.toLocaleDateString("sv-SE", { month: "long", year: "numeric" })}>
                        {days.map((date) => {
                            const key = calendarDateKey(date);
                            const dayEvents = eventsByDate.get(key) ?? [];
                            const outsideMonth = date.getMonth() !== visibleMonth.getMonth();
                            const hasPassed = key < todayKey;
                            return (
                                <div
                                    key={key}
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

function PlusSectionGate({ companyName }) {
    return <div className={styles.gate}>
        <Text size="sm"><FaLock aria-hidden="true" /> Fördjupad bolagsdata för {companyName} ingår i Plus.</Text>
        <Button render={<Link href="/pro" />} nativeButton={false} variant="secondary">Utforska Plus</Button>
    </div>;
}

export default function CompanyPage({ symbol, initialData, initialTab, initialRange, initialMovingAverages, mentions = [], missing = false }) {
    const { isPlusUser } = useAuthContext();
    const [quote, setQuote] = useState(initialData?.summary?.quote);
    if (!initialData?.summary) {
        return <Container as="main">
            <EmptyState title={missing ? "Aktien kunde inte hittas" : "Bolagssidan kunde inte hämtas"}
                description={missing ? "Sök efter bolaget i aktielistan." : "Försök igen om en stund."}
                action={<Button render={<Link href={missing ? "/aktier" : `/aktie/${encodeURIComponent(symbol)}`} />} nativeButton={false}>{missing ? "Till aktier" : "Försök igen"}</Button>} />
        </Container>;
    }
    const { summary } = initialData;
    const name = summary.profile.name ?? symbol;
    // Preserve the server-resolved access boundary. Off-screen research does
    // not mount (or make private requests) for visitors without access.
    const hasPlus = initialData.access?.plus ?? isPlusUser;
    const sharesOutstanding = [initialData.financials?.ttm, initialData.financials?.quarterly, initialData.financials?.annual]
        .flatMap(periods => [...(periods ?? [])].reverse()).find(period => period.sharesOutstanding)?.sharesOutstanding ?? null;
    const research = (children) => hasPlus ? <div className={styles.research}>{children}</div> : <PlusSectionGate companyName={name} />;
    return <CompanyReportShell symbol={symbol} name={name} quote={quote} currency={companyPriceCurrency(summary.profile, quote)} hasPlus={hasPlus} initialTab={initialTab}>
        <ReportSection id="overview">
            <CompanyChart summary={summary} symbol={symbol} chart={initialData.chart} news={initialData.news} reports={initialData.reports}
                initialRange={initialRange} initialMovingAverages={initialMovingAverages} companyName={name} onQuoteChange={setQuote} />
        </ReportSection>
        <ReportSection id="news" title={`Nyheter om ${name}`}>
            <NewsSection data={initialData} mentions={mentions} hasPlus={hasPlus} />
        </ReportSection>
        <ReportSection id="profile" title="Bolagsprofil" deferred>
            <div className={styles.research}><CompanyResearchProfile key={symbol} symbol={symbol} companyName={name} /></div>
        </ReportSection>
        <ReportSection id="financials" title="Finansiell utveckling" deferred={hasPlus}>
            {(!hasPlus || !['quarterly', 'annual', 'ttm'].some(frequency => initialData.financials?.[frequency]?.length)) && <FinancialSummary highlights={summary.financialHighlights} />}
            {research(initialData.availability?.financials === 'unavailable'
                ? <Text size="sm" tone="secondary">Finansiella uppgifter kunde inte hämtas. Försök igen senare.</Text>
                : <FinancialsTab key={symbol} symbol={symbol} financials={initialData.financials} estimates={initialData.estimates} />)}
        </ReportSection>
        <ReportSection id="management" title="Ledningens bild av läget" deferred={hasPlus}>
            {research(initialData.availability?.financials === 'unavailable'
                ? <Text size="sm" tone="secondary">Rapportunderlaget kunde inte hämtas. Försök igen senare.</Text>
                : <CompanyManagementComment comment={initialData.financials?.managementComment} latestReport={initialData.financials?.latestReport} />)}
        </ReportSection>
        <ReportSection id="estimates" title="Estimat" deferred={hasPlus}>
            {research(<EstimatesTab summary={summary} financials={initialData.financials} estimates={initialData.estimates} />)}
        </ReportSection>
        <ReportSection id="valuation" title="Värdering" deferred={hasPlus}>
            {research(<CompanyValuation key={symbol} symbol={symbol} financials={initialData.financials} estimates={initialData.estimates} estimateAvailability={initialData.availability?.estimates} />)}
        </ReportSection>
        <ReportSection id="insiders" title="Insyn & ägare" deferred={hasPlus}>
            {research(<InsidersTab symbol={symbol} companyName={name} price={summary.quote?.price ?? null} sharesOutstanding={sharesOutstanding} marketCap={summary.quote?.price && sharesOutstanding ? summary.quote.price * sharesOutstanding : null} />)}
        </ReportSection>
        <ReportSection id="shorts" title="Blankning" deferred={hasPlus}>
            {research(<ShortsTab symbol={symbol} companyName={name} bars={initialData.chart?.bars ?? []} />)}
        </ReportSection>
        <ReportSection id="calendar" title="Kalender" deferred>
            <div className={styles.research}><CalendarTab calendar={summary.calendar} /></div>
        </ReportSection>
    </CompanyReportShell>;
}
