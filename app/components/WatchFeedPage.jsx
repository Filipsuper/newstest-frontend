"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiArrowRight, FiSettings, FiStar } from "react-icons/fi";
import { useAuthContext } from "../providers/AuthProvider";
import { useModal } from "../providers/ModalProvider";
import LogInModal from "../modals/logInModal";
import { fetchPersonalFeed } from "../utils/api";
import { TOPIC_LABELS } from "../utils/topicLabels";
import { WatchWorkspaceNav } from "./WorkspaceNav";
import NewsFeedItem from "./NewsFeedItem";

const reasonFor = (story) => {
    if (story.matchedKeyword) return `Nyckelord: ${story.matchedKeyword}`;
    if (story.viaWatchlist) return "Bolag du bevakar";
    if (story.viaIndustry) {
        return `Din bransch${story.industry ? `: ${TOPIC_LABELS[story.industry] ?? story.industry}` : ""}`;
    }
    if (story.matchedTopic) return `Ämne: ${TOPIC_LABELS[story.matchedTopic] ?? story.matchedTopic}`;
    return "Ämne du följer";
};

export default function WatchFeedPage() {
    const { user, isGuestUser } = useAuthContext();
    const { openModal } = useModal();
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("all");

    const watchlist = user?.watchlist ?? [];
    const topics = user?.topics ?? [];
    const keywords = user?.keywords ?? [];
    const preferenceKey = [...watchlist, ...topics, ...keywords].join("|");

    useEffect(() => {
        if (!user || isGuestUser || !preferenceKey) {
            setPreview(null);
            setLoading(false);
            return undefined;
        }
        let active = true;
        setLoading(true);
        fetchPersonalFeed({ limit: 40 }).then((data) => {
            if (active) setPreview(data);
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [user?.email, isGuestUser, preferenceKey]);

    const stories = useMemo(() => (preview?.stories ?? []).filter((story) => {
        if (filter === "companies") return story.viaWatchlist;
        if (filter === "keywords") return Boolean(story.matchedKeyword);
        if (filter === "topics") return !story.viaWatchlist && !story.matchedKeyword;
        return true;
    }), [preview, filter]);

    const newsItems = useMemo(() => stories.map((story) => ({
        id: story.id,
        ts: Date.parse(story.publishedAt),
        title: story.headline,
        summary: story.summary,
        company: story.company,
        symbol: story.symbol,
        companies: story.symbol ? [{ symbol: story.symbol, name: story.company }] : [],
        labels: story.tags ?? [],
        importance: story.importance,
        reaction: story.reaction ?? (story.reactionPct == null ? null : { pct: story.reactionPct }),
        source: story.primarySource?.name ?? story.sources?.[0]?.name ?? null,
        url: story.primarySource?.url ?? story.sources?.[0]?.url ?? null,
        sourceCount: story.sources?.length ?? 0,
        reason: reasonFor(story),
    })), [stories]);

    if (!user) return null;

    return (
        <main className="watch-workspace">
            <WatchWorkspaceNav />
            <header className="watch-heading">
                <div>
                    <h1>Bevakning</h1>
                    {!isGuestUser && (
                        <span>{watchlist.length} bolag · {topics.length} ämnen · {keywords.length} nyckelord</span>
                    )}
                </div>
                {!isGuestUser && (
                    <Link href="/bevakning/hantera"><FiSettings aria-hidden="true" /> Hantera</Link>
                )}
            </header>

            {isGuestUser ? (
                <section className="watch-empty">
                    <FiStar aria-hidden="true" />
                    <h2>Följ det som är viktigt för dig</h2>
                    <p>Samla nyheter om dina bolag, ämnen och nyckelord i ett eget flöde.</p>
                    <button type="button" className="primary-btn" onClick={() => openModal(<LogInModal redirectTo="/bevakning" />)}>Logga in</button>
                </section>
            ) : !preferenceKey ? (
                <section className="watch-empty">
                    <FiStar aria-hidden="true" />
                    <h2>Skapa din bevakning</h2>
                    <p>Börja med ett bolag eller ett ämne. Flödet fylls när relevanta händelser publiceras.</p>
                    <Link href="/bevakning/hantera" className="primary-btn">Välj vad du vill följa</Link>
                </section>
            ) : (
                <section className="watch-feed" aria-labelledby="watch-feed-heading">
                    <header className="watch-feed__heading">
                        <div>
                            <h2 id="watch-feed-heading">Viktigast för dig</h2>
                            <span>Matchningar från de senaste {preview?.sinceHours ?? 48} timmarna</span>
                        </div>
                        <Link href="/marknaden/nyheter">Alla nyheter <FiArrowRight aria-hidden="true" /></Link>
                    </header>
                    <div className="watch-feed__filters" role="group" aria-label="Filtrera bevakning">
                        {[
                            ["all", "Alla"],
                            ["companies", "Bolag"],
                            ["topics", "Ämnen"],
                            ["keywords", "Nyckelord"],
                        ].map(([id, label]) => (
                            <button type="button" key={id} className={filter === id ? "is-active" : ""} onClick={() => setFilter(id)}>{label}</button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="market-news-loading" aria-hidden="true">
                            {[...Array(5)].map((_, index) => <div key={index} />)}
                        </div>
                    ) : preview?.unavailable ? (
                        <div className="market-empty-state">Bevakningsflödet kunde inte hämtas just nu. Dina val är fortfarande sparade.</div>
                    ) : newsItems.length === 0 ? (
                        <div className="market-empty-state">
                            Inga nyheter matchar det här urvalet just nu.
                        </div>
                    ) : (
                        <div className="watch-feed__list">
                            {newsItems.map((item) => (
                                <NewsFeedItem key={item.id} item={item} reason={item.reason} />
                            ))}
                        </div>
                    )}
                </section>
            )}
        </main>
    );
}
