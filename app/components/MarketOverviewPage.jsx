"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiArrowRight, FiClock, FiStar } from "react-icons/fi";
import NewsModal from "./NewsModal";
import StockSearch from "./StockSearch";
import LogInModal from "../modals/logInModal";
import { useModal } from "../providers/ModalProvider";
import { useAuthContext } from "../providers/AuthProvider";
import { fetchLiveFeed, toggleWatchlist } from "../utils/api";
import { tagColor, tagLabel } from "../utils/newsTags";
import { storyToItem } from "../utils/storyToItem";

const MOBILE_PANELS = [
    { id: "drivers", label: "Drivkrafter" },
    { id: "movers", label: "Rörelser" },
];

const stockholmDateKey = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Europe/Stockholm",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
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

const formatPrice = (value) => finite(value) === null
    ? null
    : Number(value).toLocaleString("sv-SE", { maximumFractionDigits: 2 });

const benchmarkChange = (benchmark) => {
    const closes = (benchmark?.bars ?? []).map((bar) => finite(bar.close)).filter((value) => value !== null);
    if (closes.length < 2 || closes.at(-2) === 0) return null;
    return ((closes.at(-1) - closes.at(-2)) / closes.at(-2)) * 100;
};

const storyReaction = (item) => finite(item?.reaction?.pct);

const normalizedSymbol = (value) => String(value ?? "").trim().toUpperCase();

const INSIDER_TAG = "INSIDER";
const MATERIAL_INSIDER_VALUE = 25_000_000;
const EXCEPTIONAL_INSIDER_VALUE = 100_000_000;
const MATERIAL_INSIDER_REACTION = 1.25;
const EXCEPTIONAL_INSIDER_REACTION = 2.5;
const DAY_MS = 24 * 60 * 60 * 1000;

const isInsiderStory = (item) => (item?.labels ?? []).includes(INSIDER_TAG);

const insiderMateriality = (item) => {
    if (!isInsiderStory(item)) return null;
    const grossValue = finite(item?.facts?.grossValue) ?? 0;
    const reaction = Math.abs(storyReaction(item) ?? 0);
    if (grossValue >= EXCEPTIONAL_INSIDER_VALUE || reaction >= EXCEPTIONAL_INSIDER_REACTION) {
        return "exceptional";
    }
    if (grossValue >= MATERIAL_INSIDER_VALUE || reaction >= MATERIAL_INSIDER_REACTION) {
        return "material";
    }
    return "routine";
};

const storySymbols = (item) => {
    const symbols = item?.symbols?.length ? item.symbols : [item?.symbol];
    return symbols.map(normalizedSymbol).filter(Boolean);
};

const matchesWatchlist = (item, watchlistSet) =>
    storySymbols(item).some((symbol) => watchlistSet.has(symbol));

const impactScore = (item, { personalized = false, referenceTs = null } = {}) => {
    const importance = finite(item.importance) ?? 0;
    const reaction = Math.abs(storyReaction(item) ?? 0);
    const reactionBoost = Math.min(reaction * 8, 40);
    const publishedAt = finite(item.ts);
    const ageDays = publishedAt !== null && referenceTs !== null
        ? Math.max(referenceTs - publishedAt, 0) / DAY_MS
        : 0;
    const freshnessPenalty = Math.min(ageDays * 10, 32);
    const insiderLevel = insiderMateriality(item);
    const insiderPenalty = insiderLevel === "exceptional"
        ? personalized ? 0 : 10
        : insiderLevel === "material"
            ? personalized ? 8 : 22
            : insiderLevel === "routine"
                ? personalized ? 18 : 45
                : 0;
    return importance + reactionBoost - insiderPenalty - freshnessPenalty;
};

const rankNews = (items, options = {}) => {
    const timestamps = items.map((item) => finite(item.ts)).filter((value) => value !== null);
    const referenceTs = finite(options.referenceTs)
        ?? (timestamps.length ? Math.max(...timestamps) : null);
    const scoringOptions = { ...options, referenceTs };
    return [...items].sort((left, right) =>
        impactScore(right, scoringOptions) - impactScore(left, scoringOptions)
        || (finite(right.ts) ?? 0) - (finite(left.ts) ?? 0));
};

// The overview is an editorial digest, not the complete wire. Routine insider
// trades remain available in the full feed, but cannot crowd out reports,
// guidance and other market-moving events here. Repeated insider filings for
// the same company are represented by the strongest one.
const curateMarketNews = (items) => {
    const seenInsiderSymbols = new Set();
    let routineInsiders = 0;
    return rankNews(items).filter((item) => {
        const level = insiderMateriality(item);
        if (!level) return true;
        const symbol = storySymbols(item)[0];
        if (symbol && seenInsiderSymbols.has(symbol)) return false;
        if (level === "routine" && routineInsiders >= 2) return false;
        if (symbol) seenInsiderSymbols.add(symbol);
        if (level === "routine") routineInsiders += 1;
        return true;
    });
};

const uniqueNews = (items) => {
    const seen = new Set();
    return items.filter((item) => {
        if (!item?.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    });
};

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

function MarketPulse({ benchmarks, breadth, news }) {
    const tone = marketTone(breadth, news);
    const byId = new Map(benchmarks.map((benchmark) => [benchmark.id, benchmark]));
    const total = finite(breadth.total) ?? 0;
    const rising = finite(breadth.rising) ?? 0;
    const falling = finite(breadth.falling) ?? 0;

    return (
        <section className="market-pulse" aria-label="Dagens marknadston">
            <div className="market-pulse__item market-pulse__item--tone">
                <span>Marknadston</span>
                <strong className={tone.className}>{tone.label}</strong>
                <small>{tone.detail}</small>
            </div>
            {["omxspi", "omxs30"].map((id) => {
                const benchmark = byId.get(id);
                const change = benchmarkChange(benchmark);
                return (
                    <div className="market-pulse__item" key={id}>
                        <span>{id.toUpperCase()}</span>
                        <strong className={change === null ? "" : change >= 0 ? "market-positive" : "market-negative"}>
                            {change === null ? "Saknas" : formatPercent(change)}
                        </strong>
                        <small>idag</small>
                    </div>
                );
            })}
            <div className="market-pulse__item">
                <span>Marknadsbredd</span>
                <strong>{total ? `${rising} / ${falling}` : "Saknas"}</strong>
                <small>stiger / faller</small>
            </div>
        </section>
    );
}

function ImpactStory({ item, lead = false, onOpen }) {
    const reaction = storyReaction(item);
    const primaryTag = (item.labels ?? []).find((tag) => tag !== "REGULATORY")
        ?? ((item.labels ?? []).includes("REGULATORY") ? "REGULATORY" : null);
    const isoTime = Number.isFinite(item.ts) ? new Date(item.ts).toISOString() : undefined;

    return (
        <li className={`impact-story ${lead ? "impact-story--lead" : ""}`}>
            <div className="impact-story__meta">
                <time dateTime={isoTime}>{formatNewsTime(item.ts)}</time>
                {primaryTag && (
                    <span className={`impact-story__tag ${tagColor(primaryTag)}`}>
                        {tagLabel(primaryTag)}
                    </span>
                )}
                {item.symbol && (
                    <Link href={`/aktie/${encodeURIComponent(item.symbol)}`}>
                        {item.company ?? item.symbol}
                    </Link>
                )}
                {reaction !== null && (
                    <span className="impact-story__reaction" title="Kursreaktion sedan nyheten publicerades">
                        <b className={reaction >= 0 ? "market-positive" : "market-negative"}>
                            {formatPercent(reaction)}
                        </b>
                        <small>sedan publicering</small>
                    </span>
                )}
            </div>
            <button type="button" onClick={() => onOpen(item)}>
                {item.title}
            </button>
            {item.summary && <p>{item.summary}</p>}
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
                    {items.map((item, index) => (
                        <ImpactStory key={item.id} item={item} lead={index === 0} onOpen={onOpen} />
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
    return (
        <li className="explained-mover">
            <div className="explained-mover__quote">
                <Link href={`/aktie/${encodeURIComponent(item.symbol)}`}>
                    <strong>{item.name ?? item.nativeSymbol ?? item.symbol}</strong>
                    <small>{item.nativeSymbol ?? item.symbol}{price ? ` · ${price}` : ""}</small>
                </Link>
                <b className={change === null ? "" : change >= 0 ? "market-positive" : "market-negative"}>
                    {change === null ? "–" : formatPercent(change)}
                    <small>idag</small>
                </b>
            </div>
            {story ? (
                <button type="button" onClick={() => onOpen(story)} title={story.title}>
                    <span>Nyhet {formatNewsTime(story.ts)}</span>
                    <strong>{story.title}</strong>
                </button>
            ) : (
                <p>Ingen tydlig nyhet i dagens urval</p>
            )}
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

    return (
        <section className={`market-digest__panel market-digest__panel--movers ${active ? "is-active" : ""}`}>
            <header className="market-digest__panel-heading">
                <div>
                    <h2>Rörelser med förklaring</h2>
                    <span>{watchlistView ? "Bland dina aktier" : "Störst först"}</span>
                </div>
                <Link href="/aktier">Alla aktier <FiArrowRight aria-hidden="true" /></Link>
            </header>
            {items.length ? (
                <ol className="market-digest__movers">
                    {items.slice(0, 8).map((item) => (
                        <MoverItem
                            key={item.symbol}
                            item={item}
                            story={storyBySymbol.get(normalizedSymbol(item.symbol))}
                            onOpen={onOpen}
                        />
                    ))}
                </ol>
            ) : (
                <div className="market-empty-state">
                    {watchlistView
                        ? "Ingen av dina aktier finns bland dagens största rörelser."
                        : "Rörelsedata saknas just nu."}
                </div>
            )}
        </section>
    );
}

export default function MarketOverviewPage({ overview = {}, articles = [] }) {
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

    const allMovers = useMemo(() => {
        const bySymbol = new Map();
        for (const item of [...(overview.movers?.gainers ?? []), ...(overview.movers?.losers ?? [])]) {
            const symbol = normalizedSymbol(item.symbol);
            if (symbol && !bySymbol.has(symbol)) bySymbol.set(symbol, item);
        }
        return [...bySymbol.values()].sort((left, right) =>
            Math.abs(finite(right.changePct) ?? 0) - Math.abs(finite(left.changePct) ?? 0));
    }, [overview.movers]);
    const shownMovers = view === "watchlist"
        ? allMovers.filter((item) => watchlistSet.has(normalizedSymbol(item.symbol)))
        : allMovers;

    const latestArticle = articles[0] ?? null;
    const latestLetterHref = latestArticle?.isEveningLetter ? "/kvallsbrevet" : "/morgonbrevet";
    const sessionDate = overview.sessionDate
        ?? benchmarks.flatMap((benchmark) => benchmark.bars ?? []).at(-1)?.date
        ?? null;
    const currentSession = sessionDate === stockholmDateKey(new Date());
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

            <MarketPulse benchmarks={benchmarks} breadth={breadth} news={toneNews} />

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
                    stories={view === "watchlist" ? personalNews : marketNews}
                    watchlistView={view === "watchlist"}
                    active={activePanel === "movers"}
                    onOpen={openStory}
                />
            </div>

            <aside className="market-digest__letter">
                <div>
                    <span>Dagens sammanfattning</span>
                    <Link href={latestArticle ? latestLetterHref : "/nyhetsbrev"}>
                        {latestArticle?.title ?? "Morgon- och kvällsbrevet"}
                        <FiArrowRight aria-hidden="true" />
                    </Link>
                </div>
                <nav aria-label="Nyhetsbrev">
                    <Link href={latestArticle ? latestLetterHref : "/nyhetsbrev"}>Läs brevet</Link>
                    <Link href="/nyhetsbrev">Få det i mail</Link>
                </nav>
            </aside>
        </main>
    );
}
