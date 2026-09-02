"use client";

import React, { useEffect, useState } from 'react';
import Link from "next/link";
import { FaStar } from "react-icons/fa6";
import { useAuthContext } from "../providers/AuthProvider";
import { useModal } from "../providers/ModalProvider";
import LogInModal from "../modals/logInModal";
import { toggleWatchlist, fetchTopics, saveTopics } from '../utils/api';
import { getCompanies } from '../utils/companies';
import StockSearch from './StockSearch';
import PersonalPreview from './PersonalPreview';
import { TOPIC_LABELS } from '../utils/topicLabels';

const WATCHLIST_CAPS = { free: 5, plus: 10, premium: 100 }; // keep in sync with backend routes/user.js
const TOPICS_CAP = 10;

function WatchlistPage() {
    const { user, isGuestUser, refreshUser } = useAuthContext();
    const [companies, setCompanies] = useState([]);
    const [busySymbol, setBusySymbol] = useState(null);
    const [error, setError] = useState(null);
    const [vocabulary, setVocabulary] = useState(null);
    const [topicsBusy, setTopicsBusy] = useState(false);
    const [topicsError, setTopicsError] = useState(null);
    const { openModal } = useModal();

    useEffect(() => {
        getCompanies().then(setCompanies);
        fetchTopics().then(setVocabulary).catch(() => setVocabulary(null));
    }, []);

    if (!user) return null

    // Logged out (e.g. arriving from the welcome email in another browser):
    // pitch the feature and offer login that returns here
    if (isGuestUser) {
        return (
            <main className="public-page public-page--account min-h-[80vh] mx-auto max-w-4xl px-4 py-10">
                <h1 className="text-4xl font-serif font-bold text-text mb-4">Mina aktier</h1>
                <p className="body-text text-text-muted mb-8 max-w-2xl">
                    Stjärnmärk bolag och välj ämnen du vill följa – så får ditt
                    morgonbrev en egen sektion, <span className="text-text font-semibold">Min
                    sammanfattning</span>, med nyheterna som matchar dina val och hur
                    aktierna reagerade. Dina val styr också fliken "Mina aktier" i{" "}
                    <Link href="/marknadsnyheter" className="text-primary underline">Marknadsnyheter</Link>.
                </p>
                <section className="max-w-4xl mx-auto mb-16">
                    <h2 className="text-xl font-serif font-bold text-text mb-4">Logga in för att välja</h2>
                    <p className="body-text text-text-muted mb-6">
                        Logga in med din mailadress – samma som du prenumererar med – så
                        kan du välja dina aktier och ämnen direkt.
                    </p>
                    <button
                        className="primary-btn extra-padding cursor-pointer"
                        onClick={() => openModal(<LogInModal redirectTo="/mina-aktier" />)}
                    >
                        Logga in
                    </button>
                    <p className="body-text text-text-muted mt-6">
                        Prenumererar du inte på morgonbrevet ännu?{" "}
                        <Link href="/" className="text-primary underline">Börja här – det är gratis</Link>.
                    </p>
                </section>
            </main>
        );
    }

    const watchlist = user.watchlist ?? [];
    const companyBySymbol = new Map(companies.map((row) => [row.symbol, row]));

    const handleRemove = async (symbol) => {
        if (busySymbol) return;
        setBusySymbol(symbol);
        setError(null);
        try {
            const res = await toggleWatchlist(symbol);
            if (res?.error) setError(res.error);
            else await refreshUser();
        } catch {
            setError("Något gick fel, försök igen.");
        } finally {
            setBusySymbol(null);
        }
    };

    const handleAdd = async (row) => {
        if (watchlist.includes(row.symbol)) {
            setError(`${row.name} finns redan i din bevakningslista.`);
            return;
        }
        await handleRemove(row.symbol); // toggle = add when not present
    };

    const topics = user.topics ?? [];

    const handleTopicToggle = async (topic) => {
        if (topicsBusy) return;
        const next = topics.includes(topic)
            ? topics.filter((item) => item !== topic)
            : [...topics, topic];
        if (next.length > TOPICS_CAP) {
            setTopicsError(`Max ${TOPICS_CAP} ämnen.`);
            return;
        }
        setTopicsBusy(true);
        setTopicsError(null);
        try {
            const res = await saveTopics(next);
            if (res?.error) setTopicsError(res.error);
            else await refreshUser();
        } catch {
            setTopicsError("Något gick fel, försök igen.");
        } finally {
            setTopicsBusy(false);
        }
    };

    const topicChip = (topic) => (
        <button
            key={topic}
            onClick={() => handleTopicToggle(topic)}
            className={`px-3 py-1 font-sans text-sm rounded-full cursor-pointer transition-colors ${topics.includes(topic)
                ? "bg-secondary text-background font-semibold"
                : "bg-border/40 text-text-muted hover:text-text"} ${topicsBusy ? "opacity-50" : ""}`}
        >
            {TOPIC_LABELS[topic] ?? topic}
        </button>
    );

    return (
        <main className="public-page public-page--account min-h-[80vh] mx-auto max-w-4xl px-4 py-10">
            <h1 className="text-4xl font-serif font-bold text-text mb-4">Mina aktier</h1>
            <p className="body-text text-text-muted mb-12 max-w-2xl">
                Här samlas bolagen du stjärnmärkt och ämnena du följer. De styr fliken
                "Mina aktier" i <Link href="/marknadsnyheter" className="text-primary underline">Marknadsnyheter</Link>{" "}
                och den personliga sektionen i morgonbrevet.
            </p>

            <section className="max-w-4xl mx-auto mb-16">
                <h2 className="text-xl font-serif font-bold text-text mb-4">Lägg till bolag</h2>
                <p className="body-text text-text-muted mb-4">
                    Sök nedan, eller stjärnmärk direkt på en aktiesida.
                </p>
                <StockSearch placeholder="Sök bolag att bevaka…" onSelect={handleAdd} />
            </section>

            <section className="max-w-4xl mx-auto mb-16">
                <div className="flex flex-row justify-between items-baseline mb-4">
                    <h2 className="text-xl font-serif font-bold text-text">Bevakade bolag</h2>
                    <span className="font-sans text-xs text-text-muted">
                        {user.plan === "premium"
                            ? `${watchlist.length} bolag`
                            : `${watchlist.length} av ${WATCHLIST_CAPS[user.plan] ?? WATCHLIST_CAPS.free}`}
                    </span>
                </div>
                {error && <p className="market-negative font-sans text-sm mb-4">{error}</p>}
                {watchlist.length === 0 ? (
                    <p className="body-text text-text-muted">
                        Du bevakar inga bolag ännu. Sök ovan eller stjärnmärk bolag på deras aktiesidor.
                    </p>
                ) : (
                    <div className="flex flex-col">
                        {watchlist.map((symbol) => {
                            const row = companyBySymbol.get(symbol);
                            return (
                                <div key={symbol} className="flex flex-row items-center justify-between py-3">
                                    <Link href={`/aktie/${encodeURIComponent(symbol)}`} className="flex flex-col hover:underline">
                                        <span className="text-sm font-sans font-semibold text-text">{row?.name ?? symbol}</span>
                                        <span className="text-xs font-sans text-text-muted">{row?.nativeSymbol ?? symbol}</span>
                                    </Link>
                                    <button
                                        onClick={() => handleRemove(symbol)}
                                        aria-label="Ta bort från bevakningslistan"
                                        title="Ta bort från Mina aktier"
                                        className={`text-xl cursor-pointer text-secondary hover:text-text-muted transition-colors ${busySymbol === symbol ? "opacity-50" : ""}`}
                                    >
                                        <FaStar />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {(watchlist.length > 0 || topics.length > 0) && (
                <section className="max-w-4xl mx-auto mb-16">
                    <h2 className="text-xl font-serif font-bold text-text mb-4">Din sektion i morgonbrevet</h2>
                    <PersonalPreview />
                </section>
            )}

            {vocabulary && (
                <section className="max-w-4xl mx-auto mb-16">
                    <div className="flex flex-row justify-between items-baseline mb-4">
                        <h2 className="text-xl font-serif font-bold text-text">Ämnen</h2>
                        <span className="font-sans text-xs text-text-muted">{topics.length} av {TOPICS_CAP}</span>
                    </div>
                    <p className="body-text text-text-muted mb-6">
                        Välj ämnen du är intresserad av, så matchar vi nyheter mot dem —
                        utöver dina bevakade bolag.
                    </p>
                    {topicsError && <p className="market-negative font-sans text-sm mb-4">{topicsError}</p>}
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-3">
                            <span className="text-base font-bold font-serif">Börslista</span>
                            <div className="flex flex-row flex-wrap gap-2">
                                {vocabulary.segments?.map(topicChip)}
                            </div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <span className="text-base font-bold font-serif">Sektorer</span>
                            <div className="flex flex-row flex-wrap gap-2">
                                {vocabulary.sectors?.map(topicChip)}
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </main>
    )
}

export default WatchlistPage;
