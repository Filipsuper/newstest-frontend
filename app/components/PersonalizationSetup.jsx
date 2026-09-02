"use client";

import React, { useEffect, useState } from 'react';
import Link from "next/link";
import { FaStar } from "react-icons/fa6";
import { useAuthContext } from "../providers/AuthProvider";
import { toggleWatchlist, fetchTopics, saveTopics } from '../utils/api';
import { getCompanies } from '../utils/companies';
import { TOPIC_LABELS } from '../utils/topicLabels';
import StockSearch from './StockSearch';
import PersonalPreview from './PersonalPreview';

// Compact stock + topics picker used in onboarding (/bekrafta). The full
// management UI lives on /mina-aktier.
export default function PersonalizationSetup() {
    const { user, isGuestUser, isPlusUser, refreshUser } = useAuthContext();
    const [companies, setCompanies] = useState([]);
    const [vocabulary, setVocabulary] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        getCompanies().then(setCompanies);
        fetchTopics().then(setVocabulary).catch(() => setVocabulary(null));
    }, []);

    if (!user || isGuestUser) return null;

    const watchlist = user.watchlist ?? [];
    const topics = user.topics ?? [];
    const companyBySymbol = new Map(companies.map((row) => [row.symbol, row]));

    const run = async (action) => {
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
            const res = await action();
            if (res?.error) setError(res.error);
            else await refreshUser();
        } catch {
            setError("Något gick fel, försök igen.");
        } finally {
            setBusy(false);
        }
    };

    const handleStockSelect = (row) => {
        if (watchlist.includes(row.symbol)) return;
        run(() => toggleWatchlist(row.symbol));
    };

    const handleStockRemove = (symbol) => run(() => toggleWatchlist(symbol));

    const handleTopicToggle = (topic) => {
        const next = topics.includes(topic)
            ? topics.filter((item) => item !== topic)
            : [...topics, topic];
        run(() => saveTopics(next));
    };

    const hasPrefs = watchlist.length > 0 || topics.length > 0;

    return (
        <div className="personalization-setup flex flex-col gap-6">
            {error && <p className="market-negative text-sm">{error}</p>}

            <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-text">Bevaka bolag</span>
                <StockSearch placeholder="Sök bolag, t.ex. Volvo…" onSelect={handleStockSelect} />
                {watchlist.length > 0 && (
                    <div className="flex flex-row flex-wrap gap-2 mt-1">
                        {watchlist.map((symbol) => (
                            <button
                                key={symbol}
                                onClick={() => handleStockRemove(symbol)}
                                title="Ta bort"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-border/40 text-text cursor-pointer hover:bg-border/60 transition-colors"
                            >
                                <FaStar className="text-secondary" />
                                {companyBySymbol.get(symbol)?.name ?? symbol.replace(".ST", "")}
                                <span className="text-text-muted">×</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {vocabulary && (
                <div className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-text">Följ ämnen</span>
                    <div className="flex flex-row flex-wrap gap-2">
                        {[...(vocabulary.segments ?? []), ...(vocabulary.sectors ?? [])].map((topic) => (
                            <button
                                key={topic}
                                onClick={() => handleTopicToggle(topic)}
                                className={`px-2.5 py-1 text-xs rounded-full cursor-pointer transition-colors ${topics.includes(topic)
                                    ? "bg-secondary text-background font-semibold"
                                    : "bg-border/40 text-text-muted hover:text-text"} ${busy ? "opacity-50" : ""}`}
                            >
                                {TOPIC_LABELS[topic] ?? topic}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {hasPrefs && <PersonalPreview />}

            <p className="text-xs text-text-muted">
                Du kan alltid ändra dina val på{" "}
                <Link href="/mina-aktier" className="text-primary underline">Mina aktier</Link>.
            </p>
        </div>
    );
}
