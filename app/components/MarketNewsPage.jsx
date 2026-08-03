"use client";

import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { FiSearch } from "react-icons/fi";
import { fetchLiveFeed } from "../utils/api";
import PlusPaywall from "./PlusPaywall";
import NewsFeedItem from "./NewsFeedItem";

const POLL_MS = 30_000;

function LiveFeed() {
    const [items, setItems] = useState(null);
    const [query, setQuery] = useState("");
    const [updatedAt, setUpdatedAt] = useState(null);
    const [error, setError] = useState("");
    const queryRef = useRef("");

    const load = async () => {
        try {
            const res = await fetchLiveFeed({ q: queryRef.current || undefined });
            if (res.items) {
                setItems(res.items);
                setUpdatedAt(dayjs());
                setError("");
            } else {
                setError(res.error || "Kunde inte hämta nyheterna");
            }
        } catch {
            setError("Kunde inte hämta nyheterna");
        }
    };

    useEffect(() => {
        load();
        const timer = setInterval(load, POLL_MS);
        return () => clearInterval(timer);
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        queryRef.current = query;
        setItems(null);
        load();
    };

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
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                    <span>LIVE</span>
                    {updatedAt && <span>• uppdaterad {updatedAt.format("HH:mm:ss")}</span>}
                </div>
            </div>

            {error && <p className="text-red-500 font-sans text-sm mb-4">{error}</p>}

            {items === null ? (
                <div className="flex flex-col gap-6 py-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse flex flex-col gap-2">
                            <div className="h-3 bg-border w-1/4"></div>
                            <div className="h-5 bg-border w-3/4"></div>
                            <div className="h-4 bg-border w-1/2"></div>
                        </div>
                    ))}
                </div>
            ) : items.length === 0 ? (
                <p className="text-text-muted font-sans py-8">Inga nyheter hittades.</p>
            ) : (
                <div className="flex flex-col">
                    {items.map((item) => (
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
