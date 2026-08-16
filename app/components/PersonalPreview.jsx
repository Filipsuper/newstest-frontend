"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FaStar } from "react-icons/fa6";
import { useAuthContext } from "../providers/AuthProvider";
import { fetchPersonalPreview } from "../utils/api";
import { TOPIC_LABELS } from "../utils/topicLabels";

// Live preview of "Min sammanfattning": the personalized letter section with
// real stories, built by the same matching the letter composer runs. Free
// users see it in full — the preview is the upsell; the daily letter section
// is what Plus unlocks.
export default function PersonalPreview() {
    const { user, isGuestUser, isPlusUser } = useAuthContext();
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(true);

    const watchlist = user?.watchlist ?? [];
    const topics = user?.topics ?? [];
    const prefsKey = [...watchlist, ...topics].join("|");

    useEffect(() => {
        if (!user || isGuestUser || !prefsKey) return;
        let cancelled = false;
        setLoading(true);
        fetchPersonalPreview().then((data) => {
            if (!cancelled) {
                setPreview(data);
                setLoading(false);
            }
        });
        return () => { cancelled = true; };
    }, [prefsKey, user?.email, isGuestUser]);

    if (!user || isGuestUser || !prefsKey) return null;

    const stories = preview?.stories ?? [];

    return (
        <div className="bg-border/20 rounded-2xl p-5 font-sans">
            <p className="text-sm font-semibold text-text mb-1">Min sammanfattning</p>
            <p className="text-xs text-text-muted mb-4">
                {isPlusUser
                    ? "Så här ser din egen sektion ut i morgonbrevet, byggd på dina val just nu."
                    : "Förhandsvisning: så här ser sektionen ut som Plus lägger i ditt morgonbrev varje dag."}
            </p>

            {loading ? (
                <div className="flex flex-col gap-1.5 mb-1" aria-hidden="true">
                    {[92, 68, 84].map((width) => (
                        <div key={width} className="h-2.5 bg-border animate-pulse" style={{ width: `${width}%` }} />
                    ))}
                </div>
            ) : preview?.unavailable ? (
                <p className="text-xs text-text-muted">
                    Förhandsvisningen kunde inte hämtas just nu — dina val är sparade och sektionen byggs som vanligt till brevet.
                </p>
            ) : stories.length === 0 ? (
                <p className="text-xs text-text-muted">
                    Inga nyheter har matchat dina val det senaste dygnet. Sektionen dyker
                    upp i brevet de dagar det finns träffar — lägg till fler bolag eller
                    ämnen för fler matchningar.
                </p>
            ) : (
                <div className="flex flex-col gap-3">
                    {stories.map((story, index) => (
                        <div key={index} className="flex flex-row items-start gap-2.5">
                            {story.reactionPct != null ? (
                                <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 text-[11px] font-semibold rounded ${story.reactionPct >= 0 ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-red-500/15 text-red-600 dark:text-red-400"}`}>
                                    {story.reactionPct >= 0 ? "+" : ""}{story.reactionPct.toLocaleString("sv-SE", { maximumFractionDigits: 1 })}%
                                </span>
                            ) : (
                                <span className="shrink-0 mt-1 text-secondary text-[11px]"><FaStar /></span>
                            )}
                            <div className="min-w-0">
                                <p className="text-sm text-text leading-snug">
                                    {story.symbol ? (
                                        <Link href={`/aktie/${encodeURIComponent(story.symbol)}`} className="font-semibold hover:underline">
                                            {story.company ?? story.symbol}
                                        </Link>
                                    ) : story.company ? <span className="font-semibold">{story.company}</span> : null}
                                    {(story.company || story.symbol) ? " — " : ""}{story.headline}
                                </p>
                                <p className="text-[11px] text-text-muted mt-0.5">
                                    {story.viaWatchlist
                                        ? "Din aktie"
                                        : story.viaIndustry
                                            ? `Inom din bransch${story.industry ? `: ${TOPIC_LABELS[story.industry] ?? story.industry}` : ""}`
                                            : "Matchar dina ämnen"}
                                </p>
                            </div>
                        </div>
                    ))}
                    {preview.matchedCount > stories.length && (
                        <p className="text-[11px] text-text-muted">
                            + {preview.matchedCount - stories.length} fler matchningar senaste dygnet
                        </p>
                    )}
                </div>
            )}

            {!isPlusUser && !loading && (
                <div className="mt-4 pt-4 border-t border-border/60">
                    <p className="text-xs text-text-muted mb-2">
                        Med <span className="font-semibold text-text">Plus</span> ligger den här
                        sektionen i ditt morgonbrev varje dag — med AI-sammanfattning och kursreaktioner.
                    </p>
                    <Link href="/pro" className="primary-btn inline-block text-sm px-4 py-2">
                        Aktivera med Plus — 49 kr/mån
                    </Link>
                </div>
            )}
        </div>
    );
}
