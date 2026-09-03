// On the server (SSR / metadata) we can talk to the backend directly via API_URL
// (e.g. http://localhost:8000/api on the VPS). In the browser we use the public URL.
const API_URL =
    typeof window === "undefined"
        ? process.env.API_URL || process.env.NEXT_PUBLIC_API_URL
        : process.env.NEXT_PUBLIC_API_URL;

export async function fetchAllArticles() {
    try {
        const response = await fetch(`${API_URL}/data`, { cache: "no-store" });
        return response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

// A deliberately small public snapshot for the everyday overview. The
// backend keeps the Market API credential private and limits this response to
// three reference indices, market breadth, five gainers/losers and selected headlines.
export async function fetchMarketOverview() {
    const response = await fetch(`${API_URL}/feed/market-overview`, {
        next: { revalidate: 30 },
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
        return res.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

export async function fetchLiveFeed({ symbol, symbols, q, limit = 60 } = {}) {
    const params = new URLSearchParams();
    if (symbol) params.set("symbol", symbol);
    if (symbols?.length) params.set("symbols", symbols.join(","));
    if (q) params.set("q", q);
    params.set("limit", limit);
    try {
        const res = await fetch(`${API_URL}/feed/news?${params}`, {
            credentials: "include",
        });
        return res.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
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

export async function fetchCompanyOverview(symbol, cookieHeader = "") {
    const response = await fetch(
        `${API_URL}/feed/company/${encodeURIComponent(symbol)}/overview`,
        {
            cache: "no-store",
            headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
            credentials: "include",
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
        { cache: "no-store", credentials: "include" },
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

// The story plus the release it was built from. Public, and immutable once
// published, so the browser may keep it.
export async function fetchStory(storyId) {
    const response = await fetch(
        `${API_URL}/feed/news/${encodeURIComponent(storyId)}`,
        { next: { revalidate: 3600 } },
    );
    if (!response.ok) throw new Error("Kunde inte hämta nyheten");
    return response.json();
}

// Valuation bands are Plus-only and move once a day, so the tab loads them on
// demand rather than weighing down every company page.
export async function fetchValuation(symbol) {
    const response = await fetch(
        `${API_URL}/feed/company/${encodeURIComponent(symbol)}/valuation`,
        { cache: "no-store", credentials: "include" },
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
export async function fetchShorts(symbol) {
    const response = await fetch(
        `${API_URL}/feed/company/${encodeURIComponent(symbol)}/shorts`,
        { cache: "no-store", credentials: "include" },
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
export async function fetchInsiders(symbol) {
    const response = await fetch(
        `${API_URL}/feed/company/${encodeURIComponent(symbol)}/insiders`,
        { cache: "no-store", credentials: "include" },
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

export async function fetchCompanyProfiles(symbols = []) {
    const requested = [...new Set(symbols)].filter(Boolean).slice(0, 12);
    if (requested.length === 0) return { items: [], missing: [] };
    try {
        const params = new URLSearchParams({ symbols: requested.join(",") });
        const response = await fetch(`${API_URL}/feed/company-profiles?${params}`);
        if (!response.ok) return { items: [], missing: requested };
        const body = await response.json();
        return {
            items: Array.isArray(body?.items) ? body.items : [],
            missing: Array.isArray(body?.missing) ? body.missing : [],
        };
    } catch {
        return { items: [], missing: requested };
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

export async function fetchPersonalFeed({ limit = 40 } = {}) {
    try {
        const params = new URLSearchParams({ limit: String(limit) });
        const res = await fetch(`${API_URL}/user/personal-feed?${params}`, {
            credentials: "include",
        });
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("Error fetching data:", error);
        return null;
    }
}

export async function fetchScreener(order = "absolute", limit = 20) {
    try {
        const res = await fetch(`${API_URL}/feed/screener?order=${order}&limit=${limit}`, {
            credentials: "include",
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
        const res = await fetch(`${API_URL}/mail/confirm?token=${encodeURIComponent(token)}`, {
            credentials: "include",
        });
        return res.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
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

export async function getUser(email) {
    try {
        const res = await fetch(`${API_URL}/user`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",

            },
            "credentials": "include",
            "mode": "cors",
        })
        return res.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

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
        return res.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}
