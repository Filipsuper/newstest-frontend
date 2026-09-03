"use client";

import { useEffect, useMemo, useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { fetchLiveFeed } from "../utils/api";
import { storyToItem } from "../utils/storyToItem";
import PlusPaywall from "./PlusPaywall";
import NewsFeedItem from "./NewsFeedItem";
import { MarketWorkspaceNav } from "./WorkspaceNav";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const MAX_ITEMS = 100;

const FEED_FILTERS = [
    { id: "all", label: "Alla", tags: null },
    { id: "reports", label: "Rapporter", tags: new Set(["EARNINGS", "GUIDANCE"]) },
    { id: "company", label: "Bolagsnytt", tags: new Set(["ORDER", "AGREEMENT", "PARTNERSHIP", "PRODUCT", "M&A", "MA", "M_AND_A", "ACQUISITION", "DISPOSAL", "DIVESTMENT", "MERGER", "CAPITAL_RAISE", "RIGHTS_ISSUE", "BUYBACK", "DIVIDEND", "MANAGEMENT", "PERSONNEL"]) },
    { id: "macro", label: "Makro", tags: new Set(["MACRO", "RATES", "MONETARY_POLICY"]) },
    { id: "insider", label: "Insyn", tags: new Set(["INSIDER"]) },
];

const upsertItem = (items, item) => {
    const without = items.filter((existing) => existing.id !== item.id);
    if (item.status && item.status !== "flash" && item.status !== "update") return without;
    return [...without, item].sort((a, b) => b.ts - a.ts).slice(0, MAX_ITEMS);
};

const matchesFilter = (item, filter) => {
    if (!filter?.tags) return true;
    return (item.labels ?? []).some((tag) => filter.tags.has(tag));
};

function LiveFeed() {
    const [items, setItems] = useState(null);
    const [searchItems, setSearchItems] = useState(null);
    const [query, setQuery] = useState("");
    const [activeQuery, setActiveQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState("all");
    const [error, setError] = useState("");
    const [sortByImpact, setSortByImpact] = useState(false);

    useEffect(() => {
        let active = true;
        fetchLiveFeed({ limit: MAX_ITEMS })
            .then((res) => {
                if (!active) return;
                if (res.items) {
                    setItems(res.items.map(storyToItem));
                } else {
                    setError(res.error || "Kunde inte hämta nyheterna");
                }
            })
            .catch(() => active && setError("Kunde inte hämta nyheterna"));

        const source = new EventSource(`${API_URL}/feed/stream`, { withCredentials: true });
        source.addEventListener("ready", () => {
            if (!active) return;
            setError("");
        });
        source.addEventListener("story", (event) => {
            if (!active) return;
            try {
                setItems((current) => upsertItem(current ?? [], storyToItem(JSON.parse(event.data))));
            } catch {
                // Ignore malformed stream frames and keep the last good feed.
            }
        });
        source.onerror = () => {};
        return () => {
            active = false;
            source.close();
        };
    }, []);

    const handleSearch = async (event) => {
        event.preventDefault();
        const nextQuery = query.trim();
        setActiveQuery(nextQuery);
        if (!nextQuery) {
            setSearchItems(null);
            return;
        }
        setSearchItems(undefined);
        try {
            const response = await fetchLiveFeed({ q: nextQuery, limit: MAX_ITEMS });
            setSearchItems(response.items ? response.items.map(storyToItem) : []);
        } catch {
            setSearchItems([]);
        }
    };

    const clearSearch = () => {
        setQuery("");
        setActiveQuery("");
        setSearchItems(null);
    };

    const filter = FEED_FILTERS.find((item) => item.id === activeFilter) ?? FEED_FILTERS[0];
    const sourceItems = activeQuery ? searchItems : items;
    const shown = useMemo(() => {
        if (!Array.isArray(sourceItems)) return sourceItems;
        const filtered = sourceItems.filter((item) => matchesFilter(item, filter));
        return sortByImpact
            ? [...filtered].sort((left, right) => Math.abs(right.reaction?.pct ?? 0) - Math.abs(left.reaction?.pct ?? 0))
            : filtered;
    }, [sourceItems, filter, sortByImpact]);

    return (
        <section className="market-news-feed" aria-label="Marknadsnyheter">
            <div className="market-news-controls">
                <form onSubmit={handleSearch} className="market-news-search">
                    <FiSearch aria-hidden="true" />
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Sök bolag eller nyckelord"
                        aria-label="Sök i nyhetsflödet"
                    />
                    {query && (
                        <button type="button" onClick={clearSearch} aria-label="Rensa sökning">
                            <FiX aria-hidden="true" />
                        </button>
                    )}
                </form>

                <div className="market-news-sort" role="group" aria-label="Sortera nyheter">
                    <button type="button" className={!sortByImpact ? "is-active" : ""} onClick={() => setSortByImpact(false)}>Senaste</button>
                    <button type="button" className={sortByImpact ? "is-active" : ""} onClick={() => setSortByImpact(true)}>Viktigast</button>
                </div>
            </div>

            <div className="market-news-filters" role="group" aria-label="Filtrera nyheter">
                {FEED_FILTERS.map((item) => (
                    <button
                        type="button"
                        key={item.id}
                        className={activeFilter === item.id ? "is-active" : ""}
                        onClick={() => setActiveFilter(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {activeQuery && (
                <div className="market-news-query">
                    <span>Träffar för “{activeQuery}”</span>
                    <button type="button" onClick={clearSearch}>Visa liveflödet</button>
                </div>
            )}

            {error && <p className="market-negative market-news-error">{error}</p>}

            {shown == null ? (
                <div className="market-news-loading" aria-hidden="true">
                    {[...Array(6)].map((_, index) => <div key={index} />)}
                </div>
            ) : shown.length === 0 ? (
                <div className="market-empty-state">Inga nyheter matchar det här urvalet.</div>
            ) : (
                <div className="market-news-list">
                    {shown.map((item) => <NewsFeedItem key={item.id} item={item} />)}
                </div>
            )}
        </section>
    );
}

export default function MarketNewsPage() {
    return (
        <main className="market-news-workspace">
            <MarketWorkspaceNav />
            <header className="market-news-heading">
                <div>
                    <h1>Nyhetsflöde</h1>
                    <span>Alla marknadshändelser på ett ställe</span>
                </div>
                <span className="market-news-live"><i /> Realtidsflöde</span>
            </header>
            <PlusPaywall redirectTo="/marknaden/nyheter">
                <LiveFeed />
            </PlusPaywall>
        </main>
    );
}
