export const SNAPSHOT_POLL_MS = 5 * 60 * 1000;

// One request at a time, visible pages only. Retain the displayed snapshot on
// failure, and never turn a successful poll into a live-trade claim.
export function pollCompanySnapshots({ load, onData, onError, document: doc = document,
    schedule = setTimeout, cancel = clearTimeout, now = Date.now }) {
    let stopped = false, pending = false, timer, lastAttempt = -Infinity;
    const refresh = async () => {
        cancel(timer);
        if (stopped || pending) return;
        if (doc.visibilityState !== "hidden") {
            pending = true;
            lastAttempt = now();
            try {
                const data = await load();
                if (!stopped) onData(data);
            } catch (error) {
                if (!stopped) onError(error);
            } finally { pending = false; }
        }
        if (!stopped) timer = schedule(refresh, SNAPSHOT_POLL_MS);
    };
    const visible = () => {
        if (doc.visibilityState !== "hidden" && now() - lastAttempt >= SNAPSHOT_POLL_MS) void refresh();
    };
    doc.addEventListener("visibilitychange", visible);
    void refresh();
    return () => { stopped = true; cancel(timer); doc.removeEventListener("visibilitychange", visible); };
}

export function companyPriceCurrency(profile, quote) {
    return profile?.tradingCurrency ?? quote?.currency ?? profile?.currency ?? "SEK";
}
