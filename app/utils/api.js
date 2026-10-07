import { requestAccount } from "./accountRequest.js";
import { personalFeedCache } from './personalFeedCache.js';
import { mergePersonalPreviewObservations } from './personalPreview.js';
import { validOmxsumStoryId, qualifiedOmxsumStory } from './omxsumStories.js';

// On the server (SSR / metadata) we can talk to the backend directly via API_URL
// (e.g. http://localhost:8000/api on the VPS). In the browser we use the public URL.
const API_URL =
    typeof window === "undefined"
        ? process.env.API_URL || process.env.NEXT_PUBLIC_API_URL
        : process.env.NEXT_PUBLIC_API_URL;

export async function fetchOmxsumStories({ symbol, format, cursor, newsId, signal } = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ symbol, format, cursor, newsId })) if (value) params.set(key, value);
    const response = await fetch(`${API_URL}/feed/omxsum-stories?${params}`, { cache: 'no-store', credentials: 'omit',
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('OMXsum Stories kunde inte hämtas.');
    const body = await response.json();
    if (!Array.isArray(body.items) || body.items.length > 12) throw new Error('Ogiltigt stories-svar.');
    return { ...body, items: body.items.map(qualifiedOmxsumStory).filter(Boolean) };
}

export async function fetchOmxsumStory(id) {
    if (!validOmxsumStoryId(id)) throw Object.assign(new Error('Storyn hittades inte.'), { status: 404 });
    const response = await fetch(`${API_URL}/feed/omxsum-stories/${id}`, { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw Object.assign(new Error('Storyn kunde inte hämtas.'), { status: response.status });
    const article = qualifiedOmxsumStory((await response.json()).article);
    if (!article || article.id !== id) throw new Error('Storyn kunde inte verifieras.');
    return article;
}

// Public, server-redacted samples only. Never request the paid resource and
// conceal it with a CSS blur. Native HTTP caching follows the public contract.
export async function fetchResearchPreview(resource, { signal } = {}) {
    if (resource !== 'screener-preview' && !/^company\/[A-Z0-9.\-]{1,20}\/financial-preview$/.test(resource))
        throw new Error('Ogiltig förhandsvisning');
    const response = await fetch(`${API_URL}/feed/${resource}`, {
        credentials: 'omit', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
        ...(typeof window === 'undefined' ? { next: { revalidate: 30 } } : {}),
    });
    if (!response.ok) throw new Error('Förhandsvisningen kunde inte hämtas');
    const body = await response.json();
    const valid = resource === 'screener-preview'
        ? body?.meta?.preview === true && Array.isArray(body.items) && body.items.length <= 6
        : body?.preview === true && body.symbol === resource.split('/')[1]
            && Array.isArray(body.annual) && body.annual.length <= 4;
    if (!valid) throw new Error('Förhandsvisningen kunde inte bekräftas');
    return body;
}

export async function fetchAllArticles({ signal } = {}) {
    try {
        const response = await fetch(`${API_URL}/data`, { cache: "no-store", signal });
        if (!response.ok) throw new Error("Kunde inte hämta breven");
        return response.json();
    } catch (error) {
        if (error.name !== "AbortError") console.error('Error fetching data:', error);
        throw error;
    }
}

// A deliberately small public snapshot for the everyday overview. The
// backend keeps the Market API credential private and limits this response to
// three reference indices, market breadth, five gainers/losers and selected headlines.
export async function fetchMarketOverview({ signal } = {}) {
    const response = await fetch(`${API_URL}/feed/market-overview`, {
        signal,
        ...(typeof window === "undefined"
            ? { next: { revalidate: 30 } }
            : { cache: "no-store" }),
    });
    const body = await response.json();
    if (!response.ok || body?.error) {
        throw new Error(body?.error || "Kunde inte hämta marknadsöversikten");
    }
    return body;
}


export async function fetchArticle() {
    try {
        const response = await fetch(`${API_URL}/data/morning-letter`, { cache: "no-store" });
        return response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export async function fetchEveningArticles() {
    try {
        const response = await fetch(`${API_URL}/data/evening-letter`, { cache: "no-store" });
        return response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export async function getArticle(id) {
    try {
        const response = await fetch(`${API_URL}/data/${id}`, { cache: "no-store" });
        return response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export async function addEmail(mail, website) {
    try {
        const res = await fetch(`${API_URL}/mail`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ mail, website })
        })
        const body = await res.json();
        return { ...body, status: res.status, ...(!res.ok ? { error: true } : {}),
            retryAfter: Number(res.headers.get("Retry-After")) || body.retryAfter || 0 };
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export async function fetchLiveFeed({ symbol, symbols, q, cursor, category, market, selection, scope, limit = 20, signal } = {}) {
    const params = new URLSearchParams();
    if (symbol) params.set("symbol", symbol);
    if (symbols?.length) params.set("symbols", symbols.join(","));
    if (q) params.set("q", q);
    if (cursor) params.set("cursor", cursor);
    if (category && category !== "all") params.set("category", category);
    if (market === "se") params.set("market", "se");
    if (selection) params.set('selection', selection);
    if (scope) params.set('scope', scope);
    params.set("limit", limit);
    params.set("reactions", "deferred");
    try {
        const res = await fetch(`${API_URL}/feed/news?${params}`, {
            credentials: "include",
            cache: "no-store",
            signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Nyheterna kunde inte hämtas.");
        return body;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export async function fetchFeedObservations({ stories, known = new Map(), signal }) {
    const refs = stories.slice(0, 20);
    const params = new URLSearchParams({ stories: refs.map(item => `${item.id}:${item.version ?? 1}`).join(",") });
    const fingerprints = refs.filter(item => known.has(item.id)).map(item => `${item.id}:${known.get(item.id)}`);
    if (fingerprints.length) params.set("known", fingerprints.join(","));
    const response = await fetch(`${API_URL}/feed/news/observations?${params}`, {
        credentials: "include", cache: "no-store",
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12_000)]) : AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error("Kursdata kunde inte uppdateras");
    const body = await response.json();
    if (!Array.isArray(body.items)) throw new Error("Ogiltiga kursdata");
    return body;
}

export async function fetchStock(symbol, range = "intraday") {
    try {
        const res = await fetch(`${API_URL}/feed/stock/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}`, {
            credentials: "include",
        });
        return res.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export async function fetchCompanyOverview(symbol, cookieHeader = "", { signal } = {}) {
    const response = await fetch(
        `${API_URL}/feed/company/${encodeURIComponent(symbol)}/overview`,
        {
            cache: "no-store",
            headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
            credentials: "include",
            signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000),
        }
    );
    const body = await response.json();
    if (!response.ok) {
        const error = new Error(body.error || "Kunde inte hämta bolagsöversikten");
        // Lets the route tell "no such company" apart from a transient failure.
        error.status = response.status;
        throw error;
    }
    return body;
}

export async function fetchCompanyIntraday(symbol) {
    const response = await fetch(
        `${API_URL}/feed/company/${encodeURIComponent(symbol)}/intraday`,
        { cache: "no-store", credentials: "include", signal: AbortSignal.timeout(15_000) },
    );
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Kunde inte hämta intradagsdata");
    return body;
}

export async function fetchStockSpark(symbol) {
    const response = await fetch(
        `${API_URL}/feed/spark/${encodeURIComponent(symbol)}`,
        { cache: "force-cache" },
    );
    const body = await response.json();
    if (!response.ok || body?.error) throw new Error("Kunde inte hämta kurshistorik");
    return body;
}

// Text is stable, but the attached price/volume observations keep developing.
export async function fetchStory(storyId) {
    const response = await fetch(
        `${API_URL}/feed/news/${encodeURIComponent(storyId)}`,
        { cache: "no-store", signal: AbortSignal.timeout(10_000) },
    );
    if (!response.ok) {
        const error = new Error(response.status === 404 ? "Nyheten hittades inte" : "Kunde inte hämta nyheten");
        error.status = response.status;
        throw error;
    }
    return response.json();
}

// Display-only stock history. The server validates the company against the
// canonical public story; this never changes saved reaction measurements.
export async function fetchStoryStockChart(storyId, symbol, { signal } = {}) {
    const params = new URLSearchParams({ symbol });
    const response = await fetch(`${API_URL}/feed/news/${encodeURIComponent(storyId)}/chart?${params}`, {
        cache: "no-store", signal: signal ?? AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error("Kunde inte hämta aktiekurvan");
    const body = await response.json();
    if (body?.error || !body?.data) throw new Error("Kunde inte hämta aktiekurvan");
    return body.data;
}

export async function fetchRelatedStories(storyId) {
    const response = await fetch(`${API_URL}/feed/news/${encodeURIComponent(storyId)}/related`, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.items) ? data.items : [];
}

// Valuation bands are Plus-only and move once a day, so the tab loads them on
// demand rather than weighing down every company page.
export async function fetchValuation(symbol, { signal } = {}) {
    const response = await fetch(
        `${API_URL}/feed/company/${encodeURIComponent(symbol)}/valuation`,
        { cache: "no-store", credentials: "include", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12_000)]) : AbortSignal.timeout(12_000) },
    );
    const body = await response.json();
    // A Plus route answers a missing or expired session with 200 and an error
    // body, so the status alone does not say whether this succeeded.
    if (!response.ok || body?.error) {
        const expiredSession = body?.upgrade || /token/i.test(body?.error ?? "");
        throw new Error(expiredSession
            ? "Logga in igen för att se värderingshistoriken"
            : body?.error || "Kunde inte hämta värderingen");
    }
    return body;
}

// The short register is Plus-only and updates on FI's twice-daily cadence,
// so the tab loads it on demand.
export async function fetchShorts(symbol, { signal } = {}) {
    const response = await fetch(
        `${API_URL}/feed/company/${encodeURIComponent(symbol)}/shorts`,
        { cache: "no-store", credentials: "include", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12_000)]) : AbortSignal.timeout(12_000) },
    );
    const body = await response.json();
    if (!response.ok || body?.error) {
        const expiredSession = body?.upgrade || /token/i.test(body?.error ?? "");
        throw new Error(expiredSession
            ? "Logga in igen för att se blankningsdata"
            : body?.error || "Kunde inte hämta blankningsdata");
    }
    return body;
}

// Insider transactions are Plus-only and update on FI's daily cadence, so the
// tab loads them on demand.
export async function fetchInsiders(symbol, { signal } = {}) {
    const response = await fetch(
        `${API_URL}/feed/company/${encodeURIComponent(symbol)}/insiders`,
        { cache: "no-store", credentials: "include", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12_000)]) : AbortSignal.timeout(12_000) },
    );
    const body = await response.json();
    if (!response.ok || body?.error) {
        const expiredSession = body?.upgrade || /token/i.test(body?.error ?? "");
        throw new Error(expiredSession
            ? "Logga in igen för att se insynshandeln"
            : body?.error || "Kunde inte hämta insynsdata");
    }
    return body;
}

export async function fetchCompanyMentions(symbol) {
    const response = await fetch(
        `${API_URL}/feed/company/${encodeURIComponent(symbol)}/mentions`,
        { next: { revalidate: 900 } },
    );
    if (!response.ok) return [];
    const body = await response.json();
    return Array.isArray(body?.items) ? body.items : [];
}

// Returns null when the list could not be loaded, so callers can tell an
// unknown company apart from an unavailable API.
export async function fetchCompanyList() {
    try {
        const response = await fetch(`${API_URL}/feed/companies`, { next: { revalidate: 3600 } });
        if (!response.ok) return null;
        const rows = await response.json();
        return Array.isArray(rows) ? rows : null;
    } catch {
        return null;
    }
}

export async function fetchCompanyDirectory() {
    try {
        const response = await fetch(`${API_URL}/feed/company-directory`, {
            next: { revalidate: 60 },
        });
        if (!response.ok) return null;
        const rows = await response.json();
        return Array.isArray(rows) ? rows : null;
    } catch {
        return null;
    }
}

export async function fetchCompanyNews() {
    try {
        const response = await fetch(`${API_URL}/feed/company-news`, {
            // The backend owns the shared 60s cache. A second SSR cache would
            // silently serve a stale selection through upstream failures.
            cache: "no-store",
            signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) return null;
        const body = await response.json();
        return Array.isArray(body?.news) && Array.isArray(body?.reports) && body?.coverage ? body : null;
    } catch { return null; }
}

export async function fetchCompanyProfiles(symbols = []) {
    const requested = [...new Set(symbols)].filter(Boolean).slice(0, 12);
    if (requested.length === 0) return { items: [], missing: [] };
    try {
        const params = new URLSearchParams({ symbols: requested.join(",") });
        const response = await fetch(`${API_URL}/feed/company-profiles?${params}`, { signal: AbortSignal.timeout(8000) });
        if (!response.ok) return { items: [], missing: requested, unavailable: true };
        const body = await response.json();
        if (!Array.isArray(body?.items) || !Array.isArray(body?.missing)) return { items: [], missing: requested, unavailable: true };
        return {
            items: Array.isArray(body?.items) ? body.items : [],
            missing: Array.isArray(body?.missing) ? body.missing : [],
        };
    } catch {
        return { items: [], missing: requested, unavailable: true };
    }
}

export async function fetchCompanyIdentity(symbol) {
    const rows = await fetchCompanyList();
    return rows?.find((row) => row.symbol === symbol) ?? null;
}

export async function fetchFinancials(symbol) {
    try {
        const res = await fetch(`${API_URL}/feed/financials/${encodeURIComponent(symbol)}`, {
            credentials: "include",
        });
        return res.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export async function fetchMovers(order = "gainers", limit = 5) {
    try {
        const res = await fetch(`${API_URL}/feed/movers?order=${order}&limit=${limit}`, {
            credentials: "include",
        });
        return res.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export async function toggleWatchlist(symbol) {
    try {
        const res = await fetch(`${API_URL}/user/watchlist/toggle`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ symbol }),
        });
        return res.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

// Live preview of "Min sammanfattning": real matched stories for the
// logged-in user, same matching as the letter composer.
export async function setCompanyFollowing(symbol, followed) {
    const response = await fetch(`${API_URL}/user/watchlist/${encodeURIComponent(symbol)}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ followed }),
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(typeof data.error === "string" ? data.error : "Valet kunde inte sparas. Försök igen.");
    return data;
}

export async function fetchPersonalPreview({ limit = 5 } = {}) {
    try {
        const params = new URLSearchParams({ limit: String(limit) });
        const res = await fetch(`${API_URL}/user/personal-preview?${params}`, {
            credentials: "include",
        });
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

export async function markPersonalNewsRead(receipts) {
    const requestScope = typeof window !== 'undefined' ? personalFeedCache.getScope() : null;
    const response = await fetch(`${API_URL}/user/personal-feed/read`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipts }), signal: AbortSignal.timeout(12_000),
    });
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.acknowledged)) throw new Error('Lässtatus kunde inte sparas. Försök igen.');
    if (typeof window !== 'undefined') personalFeedCache.markRead(data.acknowledged, requestScope);
    return data;
}

export async function fetchPersonalFeed({ user, force = false, ...options } = {}) {
    if (!user || typeof window === 'undefined') return requestPersonalFeed(options);
    try { return await personalFeedCache.load(user, { ...options, force }, requestPersonalFeed); }
    catch (error) { if (!options.signal?.aborted) console.error('Personal feed unavailable:', error); return null; }
}

export async function fetchPersonalPreviewObservations({ user, snapshot, ...options }) {
    return personalFeedCache.loadObservations(user, options, snapshot, async (stories, signal) => {
        const params = new URLSearchParams({ stories: stories.slice(0, 2).map(story => `${story.id}:${story.version ?? 1}`).join(',') });
        const response = await fetch(`${API_URL}/user/personal-feed/observations?${params}`, {
            credentials: 'include', cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(12_000)]),
        });
        if (!response.ok) throw new Error('Kursdata kunde inte uppdateras');
        return response.json();
    });
}

// Same account-authorized observation endpoint as the two-row overview, with
// at most one displayed page. News and curated selection render before this.
export async function fetchPersonalFeedObservations({ user, snapshot, ...options }) {
    const fetchObservations = async (stories, signal) => {
        const params = new URLSearchParams({ stories: stories.slice(0, 20)
            .map(story => `${story.id}:${story.version ?? 1}`).join(',') });
        const response = await fetch(`${API_URL}/user/personal-feed/observations?${params}`, {
            credentials: 'include', cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(12_000)]),
        });
        if (!response.ok) throw new Error('Kursdata kunde inte uppdateras');
        return response.json();
    };
    if (options.cursor || options.after) {
        if (!snapshot.stories.length) return snapshot;
        const result = await fetchObservations(snapshot.stories, options.signal ?? new AbortController().signal);
        return { ...snapshot, stories: mergePersonalPreviewObservations(snapshot.stories, result.items ?? []) };
    }
    return personalFeedCache.loadObservations(user, options, snapshot, fetchObservations);
}

async function requestPersonalFeed({ limit = 40, filter = "all", view, cursor, after, signal } = {}) {
    try {
        const params = new URLSearchParams({ limit: String(limit), filter });
        if (view) params.set('view', view);
        if (cursor) params.set("cursor", cursor);
        if (after) params.set("after", after);
        const res = await fetch(`${API_URL}/user/personal-feed?${params}`, {
            credentials: "include",
            cache: 'no-store',
            signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(25_000)]) : AbortSignal.timeout(25_000),
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (error) {
        // Effect cleanup and changing filters intentionally cancel requests.
        // Keep timeouts and genuine failures visible, but not those cancellations.
        if (signal?.aborted) return null;
        console.error("Error fetching data:", error);
        return null;
    }
}

export async function fetchScreener(order = "absolute", limit = 20) {
    try {
        const res = await fetch(`${API_URL}/feed/screener?order=${order}&limit=${limit}`, {
            credentials: "include",
            cache: "no-store",
            signal: AbortSignal.timeout(15_000),
        });
        return res.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export async function fetchTopics() {
    try {
        const res = await fetch(`${API_URL}/feed/topics`);
        return res.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export async function saveTopics(topics) {
    try {
        const res = await fetch(`${API_URL}/user/topics`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ topics }),
        });
        return res.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export async function saveKeywords(keywords) {
    try {
        const res = await fetch(`${API_URL}/user/keywords`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ keywords }),
        });
        return res.json();
    } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
    }
}

export async function fetchCalendar(symbol) {
    try {
        const res = await fetch(`${API_URL}/feed/calendar/${encodeURIComponent(symbol)}`, {
            credentials: "include",
        });
        return res.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export async function fetchHistory(symbol) {
    try {
        const res = await fetch(`${API_URL}/feed/history/${encodeURIComponent(symbol)}`, {
            credentials: "include",
        });
        return res.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export async function confirmSubscription(token) {
    try {
        // credentials so the confirm response can set the session cookie
        const res = await fetch(`${API_URL}/mail/confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
            credentials: "include",
            cache: "no-store",
        });
        const body = await res.json();
        return { ...body, status: res.status, ...(!res.ok ? { error: true } : {}) };
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export async function fetchSubscriptionStatus() {
    const response = await fetch(`${API_URL}/mail/status`, { credentials: "include", cache: "no-store" });
    if (response.status === 401 || response.status === 403) return { signedOut: true };
    if (!response.ok) throw new Error("Prenumerationen kunde inte hämtas.");
    return response.json();
}

export async function generateSummary(onProgress) {
    return new Promise((resolve, reject) => {
        const eventSource = new EventSource(`${API_URL}/tool/generate-summary`, {
            withCredentials: true,
        }
        );

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("Received:", event.data);

            if (data.type === 'progress') {
                onProgress(data.message);
            } else if (data.type === 'complete') {
                eventSource.close();
                resolve(data.summary);
            }
        };

        eventSource.onerror = (error) => {
            eventSource.close();
            reject(new Error('SSE Error: ' + JSON.stringify(error)));
        };
    });

}

export async function getGraphData() {
    try {
        const response = await fetch(`${API_URL}/data/graph`, { next: { revalidate: 300 } });
        return response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

//auth

export async function signUp(email, redirectTo = "/") {
    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            signal: AbortSignal.timeout(15_000),
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, redirectTo })
        })
        const body = await res.json();
        return res.ok ? body : { ...body, error: true };
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export async function createCheckoutSession(tier) {
    try {
        const res = await fetch(`${API_URL}/stripe/create-checkout-session`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ tier })
        })
        return res.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export async function createPortalSession() {
    try {
        const res = await fetch(`${API_URL}/stripe/create-portal-session`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        })
        return res.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export const getUser = requestAccount;

export async function saveActiveNewsletters(newsletters) {
    try {
        const res = await fetch(`${API_URL}/user/newsletters`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            "credentials": "include",
            body: JSON.stringify({ newsletters })
        })
        const body = await res.json();
        if (!res.ok || body?.error) throw new Error("Brevvalen kunde inte sparas");
        return body;
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}
