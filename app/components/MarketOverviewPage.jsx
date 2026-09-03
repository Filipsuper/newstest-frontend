"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiArrowRight, FiClock, FiStar } from "react-icons/fi";
import NewsModal from "./NewsModal";
import StockSearch from "./StockSearch";
import MarketStorySparkline from "./MarketStorySparkline";
import MiniPriceChart from "./MiniPriceChart";
import LogInModal from "../modals/logInModal";
import { useModal } from "../providers/ModalProvider";
import { useAuthContext } from "../providers/AuthProvider";
import { fetchLiveFeed, toggleWatchlist } from "../utils/api";
import { tagColor, tagLabel } from "../utils/newsTags";
import { storyToItem } from "../utils/storyToItem";
import { stripSummaryMarkup } from "../utils/stripSummaryMarkup";
import {
    curateMarketNews,
    normalizedSymbol,
    rankNews,
    storyReaction,
    storySymbols,
    uniqueNews,
} from "../utils/marketNewsRanking";

const MOBILE_PANELS = [
    { id: "drivers", label: "Drivkrafter" },
    { id: "movers", label: "Reaktioner" },
];

const INDEX_COPY = {
    omxspi: "OMXSPI",
    omxs30: "OMXS30",
    sp500: "S&P 500",
};

const marketDateKey = (value, timeZone = "Europe/Stockholm") => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone,
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
};

const stockholmDateKey = (value) => marketDateKey(value, "Europe/Stockholm");

const stockholmMinutes = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "Europe/Stockholm",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const hours = Number(values.hour);
    const minutes = Number(values.minute);
    return Number.isFinite(hours) && Number.isFinite(minutes)
        ? (hours * 60) + minutes
        : null;
};

const formatMarketDate = (value) => {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
        ? new Date(`${value}T12:00:00Z`)
        : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("sv-SE", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "Europe/Stockholm",
    }).format(date).replace(".", "");
};

const formatTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("sv-SE", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Stockholm",
    }).format(date);
};

const formatNewsTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    if (stockholmDateKey(date) === stockholmDateKey(new Date())) return formatTime(date);
    return new Intl.DateTimeFormat("sv-SE", {
        day: "numeric",
        month: "short",
        timeZone: "Europe/Stockholm",
    }).format(date).replace(".", "");
};

const finite = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const formatPercent = (value) => `${value >= 0 ? "+" : ""}${Number(value).toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}%`;

const formatCompactPercent = (value) => `${value >= 0 ? "+" : ""}${Number(value).toLocaleString("sv-SE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
})}%`;

const formatPrice = (value) => finite(value) === null
    ? null
    : Number(value).toLocaleString("sv-SE", { maximumFractionDigits: 2 });

const formatMultiple = (value) => finite(value) === null
    ? null
    : `${Number(value).toLocaleString("sv-SE", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    })}× normal handel`;

const formatTurnover = (value) => {
    const amount = finite(value);
    if (amount === null) return null;
    if (amount >= 1_000_000_000) {
        return `${(amount / 1_000_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} mdkr`;
    }
    if (amount >= 1_000_000) {
        return `${(amount / 1_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} mkr`;
    }
    if (amount >= 1_000) {
        return `${Math.round(amount / 1_000).toLocaleString("sv-SE")} tkr`;
    }
    return `${Math.round(amount).toLocaleString("sv-SE")} kr`;
};

const letterExcerpt = (article) => {
    const firstBullet = article?.bulletPoints
        ?.split("\n")
        .map((line) => line.replace(/^[-*•]\s*/, "").trim())
        .find(Boolean);
    const excerpt = stripSummaryMarkup(
        article?.introText?.trim() || firstBullet || article?.summary || "",
    );
    if (excerpt.length <= 240) return excerpt;
    return `${excerpt.slice(0, 237).trimEnd()}…`;
};

const benchmarkChange = (benchmark) => {
    const sessionChange = finite(benchmark?.session?.changePct);
    if (sessionChange !== null) return sessionChange;
    const closes = (benchmark?.bars ?? []).map((bar) => finite(bar.close)).filter((value) => value !== null);
    if (closes.length < 2 || closes.at(-2) === 0) return null;
    return ((closes.at(-1) - closes.at(-2)) / closes.at(-2)) * 100;
};

const benchmarkChart = (benchmark, referenceTime) => {
    const sessionPoints = (benchmark?.session?.points ?? [])
        .filter((point) => Array.isArray(point) && finite(point[0]) !== null && finite(point[1]) !== null);
    if (sessionPoints.length >= 2) {
        const timeZone = benchmark.session.timeZone ?? "Europe/Stockholm";
        const currentSession = benchmark.session.date === marketDateKey(referenceTime, timeZone);
        return {
            points: sessionPoints,
            label: currentSession ? "Idag" : "Senaste session",
        };
    }
    return {
        points: (benchmark?.bars ?? []).slice(-6).map((bar) => [bar.time, bar.close]),
        label: "Senaste veckan",
    };
};

const matchesWatchlist = (item, watchlistSet) =>
    storySymbols(item).some((symbol) => watchlistSet.has(symbol));

const marketTone = (breadth, news) => {
    const rising = finite(breadth.rising) ?? 0;
    const falling = finite(breadth.falling) ?? 0;
    const total = finite(breadth.total) ?? 0;
    const reactions = news.map(storyReaction).filter((value) => value !== null && value !== 0);
    const positiveReactions = reactions.filter((value) => value > 0).length;
    const negativeReactions = reactions.filter((value) => value < 0).length;
    const breadthSignal = total > 0 ? (rising - falling) / total : null;
    const reactionSignal = reactions.length
        ? (positiveReactions - negativeReactions) / reactions.length
        : null;
    const signals = [breadthSignal, reactionSignal].filter((value) => value !== null);
    const score = signals.length
        ? signals.reduce((sum, value) => sum + value, 0) / signals.length
        : null;

    const result = score === null || Math.abs(score) < 0.14
        ? { label: "Blandad", className: "" }
        : score > 0
            ? { label: "Positiv", className: "market-positive" }
            : { label: "Negativ", className: "market-negative" };

    return {
        ...result,
        detail: total > 0
            ? `${rising} stiger · ${falling} faller`
            : reactions.length
                ? `${positiveReactions} positiva · ${negativeReactions} negativa reaktioner`
                : "Underlaget uppdateras",
    };
};

function MarketPulse({ benchmarks, breadth, news, referenceTime }) {
    const tone = marketTone(breadth, news);
    const byId = new Map(benchmarks.map((benchmark) => [benchmark.id, benchmark]));

    return (
        <section className="market-pulse" aria-label="Dagens marknadston">
            <div className="market-pulse__item market-pulse__item--tone">
                <span>Marknadston</span>
                <strong className={tone.className}>{tone.label}</strong>
                <small>{tone.detail}</small>
            </div>
            {["omxspi", "omxs30", "sp500"].map((id) => {
                const benchmark = byId.get(id);
                const change = benchmarkChange(benchmark);
                const chart = benchmarkChart(benchmark, referenceTime);
                return (
                    <div className="market-pulse__item market-pulse__item--index" key={id}>
                        <div className="market-pulse__index-heading">
                            <span>{INDEX_COPY[id]}</span>
                            <small>{chart.label}</small>
                        </div>
                        <strong className={change === null ? "" : change >= 0 ? "market-positive" : "market-negative"}>
                            {change === null ? "Saknas" : formatPercent(change)}
                        </strong>
                        <MiniPriceChart
                            points={chart.points}
                            change={change}
                            label={`${INDEX_COPY[id]}, ${chart.label.toLowerCase()}`}
                        />
                    </div>
                );
            })}
        </section>
    );
}

function MoveBadge({ value, fallback = "Nyhet", title }) {
    const movement = finite(value);
    const tone = movement === null || movement === 0
        ? "is-neutral"
        : movement > 0 ? "is-positive" : "is-negative";
    return (
        <span className={`market-move-badge ${tone}`} title={movement === null ? undefined : title}>
            {movement === null ? fallback : formatCompactPercent(movement)}
        </span>
    );
}

function ImpactStory({ item, personalized = false, onOpen }) {
    const reaction = storyReaction(item);
    const primaryTag = (item.labels ?? []).find((tag) => tag !== "REGULATORY")
        ?? ((item.labels ?? []).includes("REGULATORY") ? "REGULATORY" : null);
    const isoTime = Number.isFinite(item.ts) ? new Date(item.ts).toISOString() : undefined;
    const company = item.company ?? item.symbol ?? null;

    return (
        <li className="impact-story">
            <MoveBadge value={reaction} title="Kursreaktion sedan publicering" />
            <div className="impact-story__content">
                <button type="button" className="impact-story__headline" onClick={() => onOpen(item)}>
                    {company && <strong>{company}</strong>}
                    {company && <span aria-hidden="true"> — </span>}
                    <span>{item.title}</span>
                </button>
                <div className="impact-story__meta">
                    {personalized && <span>Din aktie</span>}
                    {reaction !== null && <span>Sedan publicering</span>}
                    <time dateTime={isoTime}>{formatNewsTime(item.ts)}</time>
                    {(item.sourceCount ?? 0) > 1 && (
                        <span className="impact-story__sources">{item.sourceCount} källor</span>
                    )}
                    {primaryTag && (
                        <span className={`impact-story__tag ${tagColor(primaryTag)}`}>
                            {tagLabel(primaryTag)}
                        </span>
                    )}
                    {item.symbol && (
                        <Link href={`/aktie/${encodeURIComponent(item.symbol)}`}>
                            {item.symbol.replace(".ST", "")}
                        </Link>
                    )}
                </div>
            </div>
            {item.symbol && (
                <MarketStorySparkline
                    symbol={item.symbol}
                    company={company}
                    publishedAt={item.ts}
                />
            )}
        </li>
    );
}

function WatchlistEmpty({ user, isGuestUser, watchlist, loading, busy, message, onAdd, onLogin }) {
    if (!user || loading) {
        return <div className="market-empty-state">Hämtar nyheter för dina aktier…</div>;
    }

    if (isGuestUser) {
        return (
            <div className="market-empty-state">
                <FiStar aria-hidden="true" />
                <h3>Följ det som är viktigt för dig</h3>
                <p>Logga in för att samla nyheter och rörelser för dina egna aktier här.</p>
                <button type="button" className="primary-btn" onClick={onLogin}>Logga in</button>
            </div>
        );
    }

    if (watchlist.length === 0) {
        return (
            <div className="market-empty-state market-empty-state--search">
                <FiStar aria-hidden="true" />
                <h3>Lägg till din första aktie</h3>
                <p>Sök efter ett bolag så börjar den personliga marknadsvyn fyllas.</p>
                <StockSearch
                    placeholder={busy ? "Lägger till…" : "Sök bolag att följa"}
                    showSuggestions
                    onSelect={onAdd}
                    className={busy ? "is-busy" : ""}
                />
                {message && <small className="market-negative">{message}</small>}
            </div>
        );
    }

    return (
        <div className="market-empty-state">
            <FiStar aria-hidden="true" />
            <h3>Inga viktiga nyheter i dagens urval</h3>
            <p>Dina aktier är fortfarande bevakade. Vi visar dem här när en relevant händelse dyker upp.</p>
            <div className="market-empty-state__symbols">
                {watchlist.slice(0, 6).map((symbol) => (
                    <Link key={symbol} href={`/aktie/${encodeURIComponent(symbol)}`}>
                        {symbol.replace(".ST", "").replaceAll("-", " ")}
                    </Link>
                ))}
            </div>
            <Link href="/mina-aktier" className="market-text-link">Hantera mina aktier <FiArrowRight /></Link>
        </div>
    );
}

function DriversPanel({
    items,
    view,
    user,
    isGuestUser,
    watchlist,
    loading,
    busy,
    message,
    onAdd,
    onLogin,
    onOpen,
    active,
}) {
    const watchlistView = view === "watchlist";
    return (
        <section className={`market-digest__panel market-digest__panel--drivers ${active ? "is-active" : ""}`}>
            <header className="market-digest__panel-heading">
                <div>
                    <h2>{watchlistView ? "Viktigast för dina aktier" : "Det som driver marknaden"}</h2>
                    <span>
                        {items.length} {items.length === 1 ? "händelse" : "händelser"} · viktigast först
                    </span>
                </div>
                <Link href={watchlistView ? "/mina-aktier" : "/marknadsnyheter"}>
                    {watchlistView ? "Hantera" : "Hela flödet"} <FiArrowRight aria-hidden="true" />
                </Link>
            </header>

            {items.length ? (
                <ol className="market-digest__stories">
                    {items.map((item) => (
                        <ImpactStory
                            key={item.id}
                            item={item}
                            personalized={watchlistView}
                            onOpen={onOpen}
                        />
                    ))}
                </ol>
            ) : watchlistView ? (
                <WatchlistEmpty
                    user={user}
                    isGuestUser={isGuestUser}
                    watchlist={watchlist}
                    loading={loading}
                    busy={busy}
                    message={message}
                    onAdd={onAdd}
                    onLogin={onLogin}
                />
            ) : (
                <div className="market-empty-state">Inga viktiga marknadsnyheter just nu.</div>
            )}
        </section>
    );
}

function MoverItem({ item, story, onOpen }) {
    const change = finite(item.changePct);
    const price = formatPrice(item.price);
    const relativeVolume = finite(item.explanation?.relativeVolume ?? item.metrics?.rvolAtTime);
    const turnover = finite(item.explanation?.turnover ?? item.metrics?.turnover);
    const lowTurnover = item.explanation?.lowTurnover
        ?? (turnover !== null && turnover < 1_000_000);
    const confidence = item.explanation?.confidence === "likely" ? "likely" : "possible";
    const confidenceLabel = confidence === "likely" ? "Trolig nyhetsreaktion" : "Möjlig koppling";
    const volumeLabel = formatMultiple(relativeVolume);
    const turnoverLabel = formatTurnover(turnover);
    return (
        <li className="explained-mover">
            <div className="explained-mover__company">
                <MoveBadge value={change} fallback="–" title="Dagens kursförändring" />
                <Link href={`/aktie/${encodeURIComponent(item.symbol)}`}>
                    <strong>{item.name ?? item.nativeSymbol ?? item.symbol}</strong>
                    <small>
                        {item.nativeSymbol ?? item.symbol}
                        {price ? ` · ${price} kr` : ""}
                    </small>
                </Link>
            </div>
            <div className="explained-mover__trading">
                <span>Handel</span>
                <strong title="Dagens volym jämfört med normalt vid samma tidpunkt">
                    {volumeLabel ?? "Volym saknas"}
                </strong>
                {turnoverLabel && (
                    <small>{lowTurnover ? "Låg omsättning" : "Omsättning"} · {turnoverLabel}</small>
                )}
            </div>
            <div className="explained-mover__narrative">
                <div className="explained-mover__narrative-meta">
                    <span className={`is-${confidence}`}>{confidenceLabel}</span>
                    <time dateTime={Number.isFinite(story.ts) ? new Date(story.ts).toISOString() : undefined}>
                        {formatNewsTime(story.ts)}
                    </time>
                </div>
                <button type="button" onClick={() => onOpen(story)} title={story.title}>
                    {story.title}
                </button>
            </div>
        </li>
    );
}

function MoversPanel({ items, stories, watchlistView, active, onOpen }) {
    const storyBySymbol = useMemo(() => {
        const result = new Map();
        for (const story of stories) {
            for (const symbol of storySymbols(story)) {
                if (!result.has(symbol)) result.set(symbol, story);
            }
        }
        return result;
    }, [stories]);
    const explainedItems = useMemo(() => items.flatMap((item) => {
        const story = storyBySymbol.get(normalizedSymbol(item.symbol));
        return story ? [{ item, story }] : [];
    }), [items, storyBySymbol]);

    return (
        <section className={`market-digest__panel market-digest__panel--movers ${active ? "is-active" : ""}`}>
            <header className="market-digest__panel-heading">
                <div>
                    <h2>Nyhetsreaktioner</h2>
                    <span>{watchlistView ? "Nyhetskoppling i dina aktier" : "Trolig koppling först"}</span>
                </div>
                <Link href="/aktier">Alla aktier <FiArrowRight aria-hidden="true" /></Link>
            </header>
            {explainedItems.length ? (
                <ol className="market-digest__movers">
                    {explainedItems.slice(0, 8).map(({ item, story }) => (
                        <MoverItem
                            key={item.symbol}
                            item={item}
                            story={story}
                            onOpen={onOpen}
                        />
                    ))}
                </ol>
            ) : (
                <div className="market-empty-state">
                    {watchlistView
                        ? "Ingen av dina aktier har en tillräckligt stark nyhetskoppling just nu."
                        : "Inga rörelser med tillräckligt stark nyhetskoppling just nu."}
                </div>
            )}
        </section>
    );
}

export default function MarketOverviewPage({ overview = {}, articles = [], referenceTime = null }) {
    const { openModal } = useModal();
    const { user, isGuestUser, isPlusUser, refreshUser } = useAuthContext();
    const [view, setView] = useState("market");
    const [activePanel, setActivePanel] = useState("drivers");
    const [watchlistNews, setWatchlistNews] = useState([]);
    const [watchlistLoading, setWatchlistLoading] = useState(false);
    const [watchlistBusy, setWatchlistBusy] = useState(false);
    const [watchlistMessage, setWatchlistMessage] = useState("");

    const benchmarks = overview.benchmarks ?? [];
    const breadth = overview.breadth ?? {};
    const watchlist = user?.watchlist ?? [];
    const watchlistKey = watchlist.join("|");
    const watchlistSymbols = useMemo(
        () => watchlistKey ? watchlistKey.split("|") : [],
        [watchlistKey],
    );
    const watchlistSet = useMemo(
        () => new Set(watchlistSymbols.map(normalizedSymbol)),
        [watchlistSymbols],
    );
    const rawNews = Array.isArray(overview.news) ? overview.news : overview.news?.items ?? [];
    const marketNews = useMemo(
        () => curateMarketNews(
            rawNews.filter((story) => story?.id && story?.headline).map(storyToItem),
        ),
        [rawNews],
    );

    useEffect(() => {
        if (view !== "watchlist" || !isPlusUser || watchlistSymbols.length === 0) {
            setWatchlistLoading(false);
            setWatchlistNews([]);
            return undefined;
        }

        let active = true;
        setWatchlistLoading(true);
        fetchLiveFeed({ symbols: watchlistSymbols, limit: 60 })
            .then((response) => {
                if (!active) return;
                const items = Array.isArray(response?.items)
                    ? response.items.filter((story) => story?.id && story?.headline).map(storyToItem)
                    : [];
                setWatchlistNews(items);
            })
            .catch(() => { if (active) setWatchlistNews([]); })
            .finally(() => { if (active) setWatchlistLoading(false); });

        return () => { active = false; };
    }, [view, isPlusUser, watchlistSymbols]);

    const personalNews = useMemo(
        () => rankNews(
            uniqueNews([...watchlistNews, ...marketNews])
                .filter((item) => matchesWatchlist(item, watchlistSet)),
            { personalized: true },
        ),
        [watchlistNews, marketNews, watchlistSet],
    );
    const shownNews = view === "watchlist" ? personalNews : marketNews;
    const moverStories = useMemo(() => {
        const hasDedicatedMoverNews = Array.isArray(overview.moverNews);
        const rawMoverNews = hasDedicatedMoverNews ? overview.moverNews : [];
        const mappedMoverNews = rawMoverNews
            .filter((story) => story?.id && story?.headline)
            .map(storyToItem);
        return rankNews(uniqueNews(hasDedicatedMoverNews ? mappedMoverNews : marketNews));
    }, [overview.moverNews, marketNews]);

    const allMovers = useMemo(() => {
        const bySymbol = new Map();
        const candidates = Array.isArray(overview.movers?.items)
            ? overview.movers.items
            : [...(overview.movers?.gainers ?? []), ...(overview.movers?.losers ?? [])];
        for (const item of candidates) {
            const symbol = normalizedSymbol(item.symbol);
            const change = finite(item.changePct);
            if (symbol && change !== null && Math.abs(change) >= 1 && !bySymbol.has(symbol)) {
                bySymbol.set(symbol, item);
            }
        }
        return [...bySymbol.values()].sort((left, right) => {
            const confidence = (right.explanation?.confidence === "likely" ? 1 : 0)
                - (left.explanation?.confidence === "likely" ? 1 : 0);
            return confidence
                || Math.abs(finite(right.changePct) ?? 0) - Math.abs(finite(left.changePct) ?? 0);
        });
    }, [overview.movers]);
    const shownMovers = view === "watchlist"
        ? allMovers.filter((item) => watchlistSet.has(normalizedSymbol(item.symbol)))
        : allMovers;

    const marketReferenceTime = referenceTime ?? overview.generatedAt ?? overview.dataAsOf ?? null;
    const latestMorningArticle = articles.find((article) => !article?.isEveningLetter) ?? null;
    const stockholmToday = stockholmDateKey(marketReferenceTime);
    const eveningReleasePassed = (stockholmMinutes(marketReferenceTime) ?? -1) >= (17 * 60) + 30;
    const todaysEveningArticle = articles.find((article) =>
        article?.isEveningLetter
        && stockholmDateKey(article.createdAt) === stockholmToday) ?? null;
    const featuredLetter = eveningReleasePassed && todaysEveningArticle
        ? todaysEveningArticle
        : latestMorningArticle;
    const featuredLetterIsEvening = Boolean(featuredLetter?.isEveningLetter);
    const featuredLetterName = featuredLetterIsEvening ? "Kvällsbrevet" : "Morgonbrevet";
    const featuredLetterHref = featuredLetter
        ? featuredLetterIsEvening ? "/kvallsbrevet" : "/morgonbrevet"
        : "/nyhetsbrev";
    const featuredLetterExcerpt = letterExcerpt(featuredLetter);
    const featuredLetterDate = featuredLetter?.createdAt
        ? formatMarketDate(featuredLetter.createdAt)
        : null;
    const sessionDate = overview.sessionDate
        ?? benchmarks.flatMap((benchmark) => benchmark.bars ?? []).at(-1)?.date
        ?? null;
    const currentSession = sessionDate === stockholmToday;
    const toneNews = sessionDate
        ? marketNews.filter((item) => stockholmDateKey(item.ts) === sessionDate)
        : marketNews;
    const sessionLabel = sessionDate
        ? currentSession ? "Idag" : formatMarketDate(sessionDate)
        : "Senaste data";
    const asOf = formatTime(overview.dataAsOf);

    const changeView = (nextView) => {
        setView(nextView);
        setActivePanel("drivers");
        setWatchlistMessage("");
    };

    const handleWatchlistAdd = async (row) => {
        if (!user || isGuestUser) {
            openModal(<LogInModal redirectTo="/marknaden" />);
            return;
        }
        if (watchlistBusy) return;
        setWatchlistBusy(true);
        setWatchlistMessage("");
        try {
            const response = await toggleWatchlist(row.symbol);
            if (response?.error) setWatchlistMessage(response.error);
            else await refreshUser();
        } catch {
            setWatchlistMessage("Kunde inte lägga till aktien just nu.");
        } finally {
            setWatchlistBusy(false);
        }
    };

    const openStory = (item) => openModal(<NewsModal item={item} />);

    return (
        <main className="market-digest">
            <header className="market-digest__toolbar">
                <div className="market-digest__title">
                    <h1>Marknaden idag</h1>
                    <span>{sessionLabel}</span>
                </div>

                <div className="market-digest__view-switch" role="group" aria-label="Välj marknadsvy">
                    <button
                        type="button"
                        className={view === "market" ? "is-active" : ""}
                        aria-pressed={view === "market"}
                        onClick={() => changeView("market")}
                    >
                        Marknaden
                    </button>
                    <button
                        type="button"
                        className={view === "watchlist" ? "is-active" : ""}
                        aria-pressed={view === "watchlist"}
                        onClick={() => changeView("watchlist")}
                    >
                        <FiStar aria-hidden="true" /> Mina aktier
                    </button>
                </div>

                <div className="market-digest__toolbar-actions">
                    {asOf && (
                        <span className={overview.verifiedRealtime ? "is-live" : ""}>
                            <FiClock aria-hidden="true" />
                            {overview.verifiedRealtime ? `Live ${asOf}` : `Uppdaterad ${asOf}`}
                        </span>
                    )}
                    <Link href="/marknadsnyheter">Hela nyhetsflödet <FiArrowRight aria-hidden="true" /></Link>
                </div>
            </header>

            <section
                className="market-digest__summary"
                aria-label={`Marknadsöversikt och ${featuredLetterName.toLocaleLowerCase("sv-SE")}`}
            >
                <MarketPulse
                    benchmarks={benchmarks}
                    breadth={breadth}
                    news={toneNews}
                    referenceTime={marketReferenceTime ?? 0}
                />

                <aside className="market-digest__letter" aria-labelledby="market-letter-title">
                    <div className="market-digest__letter-copy">
                        <p className="market-digest__letter-kicker">
                            <span>{featuredLetterName}</span>
                            {featuredLetterDate && (
                                <time dateTime={featuredLetter.createdAt}>
                                    Senaste · {featuredLetterDate}
                                </time>
                            )}
                        </p>
                        <Link className="market-digest__letter-preview" href={featuredLetterHref}>
                            <h2 id="market-letter-title">
                                {featuredLetter?.title ?? "Morgonens viktigaste marknadshändelser"}
                            </h2>
                            <p>
                                {featuredLetterExcerpt || (featuredLetterIsEvening
                                    ? "Nyheterna, bolagen och rörelserna som summerar börsdagen."
                                    : "Nyheterna, bolagen och rörelserna som sätter tonen för börsdagen.")}
                            </p>
                        </Link>
                    </div>
                    <nav aria-label={featuredLetterName}>
                        <Link className="market-digest__letter-primary" href={featuredLetterHref}>
                            Läs {featuredLetterName.toLocaleLowerCase("sv-SE")} <FiArrowRight aria-hidden="true" />
                        </Link>
                        <Link href="/nyhetsbrev">Få det i mejlen</Link>
                    </nav>
                </aside>
            </section>

            <nav className="market-digest__mobile-tabs" aria-label="Innehåll" role="tablist">
                {MOBILE_PANELS.map((panel) => (
                    <button
                        key={panel.id}
                        type="button"
                        role="tab"
                        className={activePanel === panel.id ? "is-active" : ""}
                        aria-selected={activePanel === panel.id}
                        onClick={() => setActivePanel(panel.id)}
                    >
                        {panel.label}
                    </button>
                ))}
            </nav>

            <div className="market-digest__grid">
                <DriversPanel
                    items={shownNews}
                    view={view}
                    user={user}
                    isGuestUser={isGuestUser}
                    watchlist={watchlist}
                    loading={watchlistLoading}
                    busy={watchlistBusy}
                    message={watchlistMessage}
                    onAdd={handleWatchlistAdd}
                    onLogin={() => openModal(<LogInModal redirectTo="/marknaden" />)}
                    onOpen={openStory}
                    active={activePanel === "drivers"}
                />

                <MoversPanel
                    items={shownMovers}
                    stories={moverStories}
                    watchlistView={view === "watchlist"}
                    active={activePanel === "movers"}
                    onOpen={openStory}
                />
            </div>
        </main>
    );
}
