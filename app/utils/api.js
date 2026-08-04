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
        const response = await fetch(`${API_URL}/data/graph`);
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
        return res.json();
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
