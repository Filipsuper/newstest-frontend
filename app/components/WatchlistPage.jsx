"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiArrowLeft, FiPlus, FiX } from "react-icons/fi";
import { FaStar } from "react-icons/fa6";
import { useAuthContext } from "../providers/AuthProvider";
import { useModal } from "../providers/ModalProvider";
import LogInModal from "../modals/logInModal";
import { fetchTopics, saveKeywords, saveTopics, toggleWatchlist } from "../utils/api";
import { getCompanies } from "../utils/companies";
import { TOPIC_LABELS } from "../utils/topicLabels";
import StockSearch from "./StockSearch";
import { WatchWorkspaceNav } from "./WorkspaceNav";

const WATCHLIST_CAPS = { free: 5, plus: 10, premium: 100 };
const TOPICS_CAP = 10;
const KEYWORDS_CAP = 10;

export default function WatchlistPage() {
    const { user, isGuestUser, refreshUser } = useAuthContext();
    const { openModal } = useModal();
    const [companies, setCompanies] = useState([]);
    const [vocabulary, setVocabulary] = useState(null);
    const [busySymbol, setBusySymbol] = useState(null);
    const [topicsBusy, setTopicsBusy] = useState(false);
    const [keywordsBusy, setKeywordsBusy] = useState(false);
    const [keywordInput, setKeywordInput] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        getCompanies().then(setCompanies);
        fetchTopics().then(setVocabulary).catch(() => setVocabulary(null));
    }, []);

    const companyBySymbol = useMemo(
        () => new Map(companies.map((row) => [row.symbol, row])),
        [companies],
    );

    if (!user) return null;

    if (isGuestUser) {
        return (
            <main className="watch-workspace watch-manage">
                <WatchWorkspaceNav />
                <section className="watch-empty">
                    <FaStar aria-hidden="true" />
                    <h1>Hantera bevakning</h1>
                    <p>Logga in för att välja bolag, ämnen och nyckelord.</p>
                    <button type="button" className="primary-btn" onClick={() => openModal(<LogInModal redirectTo="/bevakning/hantera" />)}>Logga in</button>
                </section>
            </main>
        );
    }

    const watchlist = user.watchlist ?? [];
    const topics = user.topics ?? [];
    const keywords = user.keywords ?? [];

    const updateWatchlist = async (symbol) => {
        if (busySymbol) return;
        setBusySymbol(symbol);
        setError("");
        try {
            const response = await toggleWatchlist(symbol);
            if (response?.error) setError(response.error);
            else await refreshUser();
        } catch {
            setError("Bevakningen kunde inte uppdateras.");
        } finally {
            setBusySymbol(null);
        }
    };

    const addCompany = async (row) => {
        if (watchlist.includes(row.symbol)) {
            setError(`${row.name} bevakas redan.`);
            return;
        }
        await updateWatchlist(row.symbol);
    };

    const toggleTopic = async (topic) => {
        if (topicsBusy) return;
        const next = topics.includes(topic)
            ? topics.filter((item) => item !== topic)
            : [...topics, topic];
        if (next.length > TOPICS_CAP) {
            setError(`Du kan följa högst ${TOPICS_CAP} ämnen.`);
            return;
        }
        setTopicsBusy(true);
        setError("");
        try {
            const response = await saveTopics(next);
            if (response?.error) setError(response.error);
            else await refreshUser();
        } catch {
            setError("Ämnena kunde inte uppdateras.");
        } finally {
            setTopicsBusy(false);
        }
    };

    const updateKeywords = async (next) => {
        setKeywordsBusy(true);
        setError("");
        try {
            const response = await saveKeywords(next);
            if (response?.error) setError(response.error);
            else await refreshUser();
        } catch {
            setError("Nyckelorden kunde inte uppdateras.");
        } finally {
            setKeywordsBusy(false);
        }
    };

    const addKeyword = async (event) => {
        event.preventDefault();
        const keyword = keywordInput.replace(/\s+/g, " ").trim();
        if (keyword.length < 2) {
            setError("Skriv minst två tecken.");
            return;
        }
        if (keywords.some((item) => item.toLocaleLowerCase("sv-SE") === keyword.toLocaleLowerCase("sv-SE"))) {
            setError(`Du följer redan “${keyword}”.`);
            return;
        }
        if (keywords.length >= KEYWORDS_CAP) {
            setError(`Du kan följa högst ${KEYWORDS_CAP} nyckelord.`);
            return;
        }
        await updateKeywords([...keywords, keyword]);
        setKeywordInput("");
    };

    const topicGroup = (title, items) => Array.isArray(items) && items.length > 0 && (
        <div className="watch-topic-group">
            <h3>{title}</h3>
            <div>
                {items.map((topic) => (
                    <button
                        type="button"
                        key={topic}
                        className={topics.includes(topic) ? "is-active" : ""}
                        disabled={topicsBusy}
                        onClick={() => toggleTopic(topic)}
                    >
                        {TOPIC_LABELS[topic] ?? topic}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <main className="watch-workspace watch-manage">
            <WatchWorkspaceNav />
            <header className="watch-heading">
                <div>
                    <h1>Hantera bevakning</h1>
                    <span>Välj vad som ska forma ditt personliga nyhetsflöde</span>
                </div>
                <Link href="/bevakning"><FiArrowLeft aria-hidden="true" /> Till flödet</Link>
            </header>

            {error && <p className="watch-error market-negative" role="alert">{error}</p>}

            <div className="watch-preferences-grid">
                <section className="watch-preference-section watch-preference-section--companies">
                    <header>
                        <div><span>1</span><h2>Bolag</h2></div>
                        <small>{user.plan === "premium" ? `${watchlist.length}` : `${watchlist.length}/${WATCHLIST_CAPS[user.plan] ?? WATCHLIST_CAPS.free}`}</small>
                    </header>
                    <StockSearch placeholder="Sök bolag att bevaka" onSelect={addCompany} showSuggestions />
                    {watchlist.length ? (
                        <div className="watch-company-list">
                            {watchlist.map((symbol) => {
                                const company = companyBySymbol.get(symbol);
                                return (
                                    <div key={symbol}>
                                        <Link href={`/aktie/${encodeURIComponent(symbol)}`}>
                                            <strong>{company?.name ?? symbol}</strong>
                                            <span>{company?.nativeSymbol ?? symbol.replace(".ST", "")}</span>
                                        </Link>
                                        <button type="button" onClick={() => updateWatchlist(symbol)} disabled={busySymbol === symbol} aria-label={`Sluta bevaka ${company?.name ?? symbol}`}>
                                            <FaStar aria-hidden="true" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <p className="watch-preference-empty">Inga bolag valda ännu.</p>}
                </section>

                <section className="watch-preference-section">
                    <header>
                        <div><span>2</span><h2>Ämnen</h2></div>
                        <small>{topics.length}/{TOPICS_CAP}</small>
                    </header>
                    <div className="watch-topic-groups">
                        {topicGroup("Händelser", vocabulary?.events)}
                        {topicGroup("Sektorer", vocabulary?.sectors)}
                        {topicGroup("Börslistor", vocabulary?.segments)}
                    </div>
                </section>

                <section className="watch-preference-section watch-preference-section--keywords">
                    <header>
                        <div><span>3</span><h2>Nyckelord</h2></div>
                        <small>{keywords.length}/{KEYWORDS_CAP}</small>
                    </header>
                    <form className="watch-keyword-form" onSubmit={addKeyword}>
                        <input
                            value={keywordInput}
                            onChange={(event) => setKeywordInput(event.target.value)}
                            maxLength={40}
                            placeholder="Exempel: försvar eller vinstvarning"
                            aria-label="Nytt nyckelord"
                        />
                        <button type="submit" disabled={keywordsBusy || !keywordInput.trim()}><FiPlus aria-hidden="true" /> Lägg till</button>
                    </form>
                    {keywords.length ? (
                        <div className="watch-keywords">
                            {keywords.map((keyword) => (
                                <span key={keyword}>
                                    {keyword}
                                    <button type="button" onClick={() => updateKeywords(keywords.filter((item) => item !== keyword))} disabled={keywordsBusy} aria-label={`Ta bort nyckelordet ${keyword}`}><FiX aria-hidden="true" /></button>
                                </span>
                            ))}
                        </div>
                    ) : <p className="watch-preference-empty">Nyckelord matchas mot rubrik och sammanfattning.</p>}
                </section>
            </div>
        </main>
    );
}
