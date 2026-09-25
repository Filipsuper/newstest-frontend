"use client";

import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Bar,
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
import { FiCalendar, FiExternalLink, FiShare2, FiSliders } from "react-icons/fi";
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
import CompanyEstimates from "./CompanyEstimates";
import CompanyOwnership from "./CompanyOwnership";
import CompanyShortInterest from "./CompanyShortInterest";
import CompanyCalendar from "./CompanyCalendar";
import { financialPeriodLabel, researchPeriods } from "../utils/companyResearch";
import { geographicRevenueForCompany, segmentRevenueForCompany } from "../utils/segmentRevenue";
import { upcomingCompanyEvents } from "../utils/companyResearchViews";
import styles from "./company-report.module.css";
import { fetchCompanyIntraday } from "../utils/api";
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
    const nextReport = upcomingCompanyEvents(summary.calendar).find(event => event.type === 'earnings');
    const quote = useMemo(() => {
        if (snapshotOnly && intraday) return intraday.quote ? { ...summary.quote, ...intraday.quote } : null;
        return isIntraday && intraday?.quote ? { ...summary.quote, ...intraday.quote } : summary.quote;
    }, [isIntraday, snapshotOnly, intraday, summary.quote]);
    const priceCurrency = companyPriceCurrency(profile, quote);
    const quoteTime = quote?.quoteTime ?? quote?.dataAsOf;
    const quoteDayLabel = quoteTime ? (stockholmDay(quoteTime) === stockholmDay(Date.now()) ? 'Idag' : svDate(quoteTime, true)) : 'Senaste kurs';
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
                <div className={styles.quote} data-nosnippet="">
                    <strong>{quote?.price == null ? "Kurs saknas" : `${number(quote.price, 2)} ${priceCurrency === "SEK" ? "kr" : priceCurrency}`}</strong>
                    <ChangeBadge value={quote?.changePct} label="Dagsförändring" />
                    <span className={styles.quoteMeta}>{quoteDayLabel}{quote?.change != null && ` · ${quote.change > 0 ? "+" : ""}${number(quote.change, 2)} ${priceCurrency}`}</span>
                </div>
                <Inline className={styles.quoteContext}><Text as="span" size="xs" tone="secondary" data-nosnippet="">
                    {quote?.quoteTime || quote?.dataAsOf ? `Kursuppdatering ${svDateTime(quote.quoteTime ?? quote.dataAsOf)}` : "Kurstidpunkt saknas"}
                    {quote?.delayed && " · Fördröjd kurs"}
                    {(quote?.source?.startsWith("yahoo") || chart?.sourceName === "Yahoo Finance") && <> · Källa: <a href="https://finance.yahoo.com/" target="_blank" rel="noreferrer">Yahoo Finance</a></>}
                    {snapshotOnly && quote?.price != null && " · Kan vara fördröjd"}
                </Text>{nextReport && <a className={styles.reportDate} href="#calendar"><FiCalendar aria-hidden="true" /> Nästa rapport · {svDate(nextReport.date, true)}</a>}</Inline>
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
    const [filter, setFilter] = useState('all');
    const items = useMemo(() => chronologicalNews((news ?? []).map(storyToItem)), [news]);
    const reports = items.filter(item => item.labels?.includes('EARNINGS'));
    const visible = filter === 'reports' ? reports : items;
    if (!items.length) return <EmptyState title="Inga bolagsspecifika nyheter finns ännu." />;
    return (
        <Stack gap={2}>
            <Inline className={styles.financialToolbar}><SegmentedControl label="Bolagsnyheter" value={filter} onValueChange={value => { setFilter(value); setCount(6); }} options={[{ value: 'all', label: 'Alla nyheter' }, { value: 'reports', label: 'Rapporter' }]} /><Text size="xs" tone="secondary">{visible.length} i urvalet · senaste först</Text></Inline>
            {visible.slice(0, count).map(item => <NewsFeedItem key={item.id} item={item} showSymbol={false} />)}
            {!visible.length && <EmptyState title="Inga rapportnyheter i det hämtade urvalet" />}
            {visible.length > count && <Button variant="secondary" onClick={() => setCount(value => value + 6)}>Visa fler nyheter</Button>}
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
    return <Stack gap={3} className={styles.business}>
        <Heading as="h3" size="subsection">Om {profile.name ?? summary.symbol}</Heading>
        <div className={styles.about}>
            {profile.description ? <ExpandableText text={profile.description} className={styles.description} lines={4} /> : <Text size="sm" tone="secondary">Bolagsbeskrivning saknas ännu.</Text>}
            <dl className={styles.facts}>
                {profile.sector && <><dt>Sektor</dt><dd>{profile.sector}</dd></>}
                {profile.industry && <><dt>Bransch</dt><dd>{profile.industry}</dd></>}
                {profile.employees && <><dt>Anställda</dt><dd>{Number(profile.employees).toLocaleString("sv-SE")}</dd></>}
                {safeSourceUrl(profile.website) && <><dt>Webbplats</dt><dd><a href={safeSourceUrl(profile.website)} target="_blank" rel="noreferrer">Besök bolaget ↗</a></dd></>}
            </dl>
        </div>
    </Stack>;
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
    </div>;
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
            <CompanyAbout summary={summary} />
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
            {research(<CompanyEstimates symbol={symbol} financials={initialData.financials} estimates={initialData.estimates} availability={initialData.availability?.estimates} financialAvailability={initialData.availability?.financials} />)}
        </ReportSection>
        <ReportSection id="valuation" title="Värdering" deferred={hasPlus}>
            {research(<CompanyValuation key={symbol} symbol={symbol} financials={initialData.financials} estimates={initialData.estimates} estimateAvailability={initialData.availability?.estimates} />)}
        </ReportSection>
        <ReportSection id="insiders" title="Insyn & ägare" deferred={hasPlus}>
            {research(<CompanyOwnership key={symbol} symbol={symbol} price={quote?.price} currency={companyPriceCurrency(summary.profile, quote)} />)}
        </ReportSection>
        <ReportSection id="shorts" title="Blankning" deferred={hasPlus}>
            {research(<CompanyShortInterest key={symbol} symbol={symbol} />)}
        </ReportSection>
        <ReportSection id="calendar" title="Kalender" deferred>
            <div className={styles.research}><CompanyCalendar key={symbol} calendar={summary.calendar} /></div>
        </ReportSection>
    </CompanyReportShell>;
}
