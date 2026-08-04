"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { FiSearch } from "react-icons/fi";
import { fetchLiveFeed } from "../utils/api";
import { storyToItem } from "../utils/storyToItem";
import { useAuthContext } from "../providers/AuthProvider";
import PlusPaywall from "./PlusPaywall";
import NewsFeedItem from "./NewsFeedItem";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const MAX_ITEMS = 100;

// Insert or replace by story id, newest first. Retracted stories drop out.
const upsertItem = (items, item) => {
    const without = items.filter((existing) => existing.id !== item.id);
    if (item.status && item.status !== "flash" && item.status !== "update") {
        return without;
    }
    return [...without, item].sort((a, b) => b.ts - a.ts).slice(0, MAX_ITEMS);
};

function LiveFeed() {
    const { user } = useAuthContext();
    const [items, setItems] = useState(null);
    const [searchItems, setSearchItems] = useState(null);
    const [query, setQuery] = useState("");
    const [activeQuery, setActiveQuery] = useState("");
    const [live, setLive] = useState(false);
    const [updatedAt, setUpdatedAt] = useState(null);
    const [error, setError] = useState("");
    const [onlyWatchlist, setOnlyWatchlist] = useState(false);
    const [sortByImpact, setSortByImpact] = useState(false);
    const sourceRef = useRef(null);

    const watchlist = user?.watchlist ?? [];

    // Initial backlog over REST, then live updates over SSE
    useEffect(() => {
        let active = true;

        fetchLiveFeed({})
            .then((res) => {
                if (!active) return;
                if (res.items) {
                    setItems(res.items.map(storyToItem));
                    setUpdatedAt(dayjs());
                } else {
                    setError(res.error || "Kunde inte hämta nyheterna");
                }
            })
            .catch(() => active && setError("Kunde inte hämta nyheterna"));

        const source = new EventSource(`${API_URL}/feed/stream`, { withCredentials: true });
        sourceRef.current = source;

        source.addEventListener("ready", () => {
            if (!active) return;
            setLive(true);
            setError("");
        });

        source.addEventListener("story", (event) => {
            if (!active) return;
            try {
                const item = storyToItem(JSON.parse(event.data));
                setItems((current) => upsertItem(current ?? [], item));
                setUpdatedAt(dayjs());
            } catch {
                // ignore malformed frames
            }
        });

        source.onerror = () => {
            if (!active) return;
            setLive(false); // EventSource reconnects on its own
        };

        return () => {
            active = false;
            source.close();
        };
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        const q = query.trim();
        setActiveQuery(q);

        if (!q) {
            setSearchItems(null);
            return;
        }

        setSearchItems(undefined); // loading
        try {
            const res = await fetchLiveFeed({ q });
            setSearchItems(res.items ? res.items.map(storyToItem) : []);
        } catch {
            setSearchItems([]);
        }
    };

    const clearSearch = () => {
        setQuery("");
        setActiveQuery("");
        setSearchItems(null);
    };

    const filtered = activeQuery
        ? searchItems
        : onlyWatchlist
            ? (items ?? []).filter((item) => item.symbol && watchlist.includes(item.symbol))
            : items;

    // "Dagens mest marknadspåverkande nyheter": biggest |reaction| first
    const shown = sortByImpact && Array.isArray(filtered)
        ? [...filtered].sort(
            (a, b) => Math.abs(b.reaction?.pct ?? 0) - Math.abs(a.reaction?.pct ?? 0)
        )
        : filtered;

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <form onSubmit={handleSearch} className="flex flex-row items-center gap-2 font-sans w-full md:w-96">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Sök bolag eller nyckelord…"
                        className="border border-border bg-foreground text-text outline-none w-full px-4 py-2 text-sm placeholder:text-text-muted focus:border-secondary"
                    />
                    <button type="submit" className="secondary-btn py-2 cursor-pointer" aria-label="Sök">
                        <FiSearch />
                    </button>
                </form>
                <div className="flex flex-row items-center gap-2 font-sans text-xs text-text-muted">
                    <span className={`w-2 h-2 rounded-full ${live ? "bg-primary animate-pulse" : "bg-border"}`}></span>
                    <span>{live ? "LIVE" : "ANSLUTER…"}</span>
                    {updatedAt && <span>• senaste händelse {updatedAt.format("HH:mm:ss")}</span>}
                </div>
            </div>

            {!activeQuery && (
                <div className="flex flex-row justify-between items-center mb-6 font-sans text-xs">
                    <div className="flex flex-row gap-1">
                        {watchlist.length > 0 && (
                            <>
                                <button
                                    onClick={() => setOnlyWatchlist(false)}
                                    className={`px-2 py-1 cursor-pointer transition-colors ${!onlyWatchlist ? "text-text border-b-2 border-secondary" : "text-text-muted hover:text-text"}`}
                                >
                                    Alla nyheter
                                </button>
                                <button
                                    onClick={() => setOnlyWatchlist(true)}
                                    className={`px-2 py-1 cursor-pointer transition-colors ${onlyWatchlist ? "text-text border-b-2 border-secondary" : "text-text-muted hover:text-text"}`}
                                >
                                    Mina aktier ({watchlist.length})
                                </button>
                            </>
                        )}
                    </div>
                    <div className="flex flex-row gap-1">
                        <button
                            onClick={() => setSortByImpact(false)}
                            className={`px-2 py-1 cursor-pointer transition-colors ${!sortByImpact ? "text-text border-b-2 border-secondary" : "text-text-muted hover:text-text"}`}
                        >
                            Senaste
                        </button>
                        <button
                            onClick={() => setSortByImpact(true)}
                            title="Dagens mest marknadspåverkande nyheter"
                            className={`px-2 py-1 cursor-pointer transition-colors ${sortByImpact ? "text-text border-b-2 border-secondary" : "text-text-muted hover:text-text"}`}
                        >
                            Störst reaktion
                        </button>
                    </div>
                </div>
            )}

            {activeQuery && (
                <div className="flex flex-row items-center gap-3 mb-4 font-sans text-sm">
                    <span className="text-text-muted">Sökresultat för "{activeQuery}"</span>
                    <button onClick={clearSearch} className="text-primary underline cursor-pointer">
                        Tillbaka till liveflödet
                    </button>
                </div>
            )}

            {error && <p className="text-red-500 font-sans text-sm mb-4">{error}</p>}

            {shown == null ? (
                <div className="flex flex-col gap-6 py-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse flex flex-col gap-2">
                            <div className="h-3 bg-border w-1/4"></div>
                            <div className="h-5 bg-border w-3/4"></div>
                            <div className="h-4 bg-border w-1/2"></div>
                        </div>
                    ))}
                </div>
            ) : shown.length === 0 ? (
                <p className="text-text-muted font-sans py-8">
                    {onlyWatchlist && !activeQuery
                        ? <>Inga nyheter om dina aktier ännu. <Link href="/mina-aktier" className="text-primary underline">Hantera din bevakningslista</Link> eller stjärnmärk fler bolag från deras aktiesidor.</>
                        : "Inga nyheter hittades."}
                </p>
            ) : (
                <div className="flex flex-col">
                    {shown.map((item) => (
                        <NewsFeedItem key={item.id} item={item} />
                    ))}
                </div>
            )}
        </>
    );
}

export default function MarketNewsPage() {
    return (
        <main className="min-h-[80vh] mx-auto max-w-3xl px-4 py-8">
            <div className="mb-8">
                <h1 className="text-4xl font-serif font-bold text-text mb-2">Marknadsnyheter</h1>
                <p className="text-text-muted font-sans">
                    Pressmeddelanden, insynshandel och marknadshändelser från Stockholmsbörsen – i realtid.
                </p>
            </div>
            <PlusPaywall redirectTo="/marknadsnyheter">
                <LiveFeed />
            </PlusPaywall>
        </main>
    );
}
