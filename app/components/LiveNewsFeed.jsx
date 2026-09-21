"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FiPause, FiPlay, FiSearch, FiX } from "react-icons/fi";
import { fetchLiveFeed, fetchFeedObservations } from "../utils/api";
import { feedStoryToItem as storyToItem, matchingObservations } from "../utils/feedObservations";
import { isSwedishNews } from "../utils/swedishNews";
import {
  changedFeedItems,
  mergeFeed,
  refreshMarketObservations,
} from "../utils/newsroom";
import { rowReaction } from "../utils/reactionV2";
import { useLiveScrollAnchor } from "../hooks/useLiveScrollAnchor";
import { useAuthContext } from "../providers/AuthProvider";
import { Button, IconButton } from "./ui/Button";
import { TextField } from "./ui/TextField";
import { SegmentedControl } from "./ui/SegmentedControl";
import { EmptyState } from "./ui/data";
import NewsListSkeleton from "./ui/NewsListSkeleton";
import { Inline, Text } from "./ui/layout";
import NewsFeedItem from "./NewsFeedItem";
import styles from "./market-news.module.css";

const FILTERS = [
  { id: "all", label: "Alla" },
  {
    id: "reports",
    label: "Rapporter",
    tags: ["EARNINGS", "GUIDANCE", "PROFIT_WARNING"],
  },
  {
    id: "company",
    label: "Bolagsnytt",
    tags: [
      "ORDER",
      "AGREEMENT",
      "PARTNERSHIP",
      "PRODUCT",
      "M_AND_A",
      "M&A",
      "CAPITAL_RAISE",
      "FINANCING",
      "DIVIDEND",
      "MANAGEMENT",
    ],
  },
  { id: "macro", label: "Makro", tags: ["MACRO", "RATES", "MONETARY_POLICY"] },
  { id: "insider", label: "Insyn", tags: ["INSIDER"] },
];

// Keep withdrawals as versioned tombstones so a delayed poll or replay cannot
// restore an older story, including one no longer present in the rendered rows.
function acceptVersions(incoming, latest) {
  return incoming.filter((item) => {
    if (!item?.id) return false;
    const previous = latest.get(item.id);
    if (previous && ((previous.version ?? 1) > (item.version ?? 1)
      || ((previous.version ?? 1) === (item.version ?? 1)
        && previous.status && !["flash", "update"].includes(previous.status)
        && (!item.status || ["flash", "update"].includes(item.status))))) return false;
    latest.set(item.id, item);
    return true;
  });
}

const reactionRanking = (rows) => rows
  .filter((item) => rowReaction(item).pct !== null)
  .sort((a, b) => Math.abs(rowReaction(b).pct) - Math.abs(rowReaction(a).pct))
  .map((item) => item.id);

export default function LiveNewsFeed({
  compact = false,
  market,
  paused: parentPaused = false,
}) {
  const params = useSearchParams();
  const { isPlusUser } = useAuthContext();
  const activeQuery = compact ? "" : params.get("q") || "";
  const category = compact
    ? "all"
    : FILTERS.some((filter) => filter.id === params.get("category"))
      ? params.get("category")
      : "all";
  const reactions = !compact && params.get("view") === "reactions";
  const [query, setQuery] = useState(activeQuery);
  const [items, setItems] = useState(null);
  const observations = useRef(new Map());
  const [reactionOrder, setReactionOrder] = useState([]);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState("Ansluter");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedFor, setLoadedFor] = useState(null);
  const generation = useRef(0);
  const current = useRef([]);
  const latest = useRef(new Map());
  const fingerprints = useRef(new Map());
  const lastMetricBatch = useRef({ key: "", at: 0 });
  const streamSince = useRef(Date.now());
  const streamCursor = useRef(null);
  const applyLive = useRef(null);
  const previousShown = useRef([]);
  const { captureAnchor, listRef } = useLiveScrollAnchor();
  const isPaused = paused || parentPaused;
  const requestKey = JSON.stringify([activeQuery, category, retry, isPlusUser, market]);
  const ready = items !== null && loadedFor === requestKey;
  const measurementKey = (items ?? []).map(item => `${item.id}:${item.version ?? 1}`).join(",");

  function navigate(next) {
    const search = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(next))
      value && value !== "all" ? search.set(key, value) : search.delete(key);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search.size ? `?${search}` : ""}`,
    );
  }
  useEffect(() => setQuery(activeQuery), [activeQuery]);
  useEffect(() => {
    if (!isPlusUser) return;
    const version = ++generation.current;
    setError("");
    setCursor(null);
    setLoadingMore(false);
    const controller = new AbortController();
    streamSince.current = Date.now();
    streamCursor.current = null;
    // Deferring until the committed mount avoids issuing a second bootstrap
    // during React's development setup/cleanup check.
    const bootstrap = setTimeout(() => {
      fetchLiveFeed({ q: activeQuery, category, market, limit: 20, signal: controller.signal })
        .then((data) => {
          if (version !== generation.current) return;
          if (!Array.isArray(data?.items))
            throw new Error(data?.error || "Nyheterna kunde inte hämtas");
          if (Number.isFinite(data.streamSince)) streamSince.current = data.streamSince;
          latest.current = new Map();
          observations.current = new Map();
          fingerprints.current = new Map();
          lastMetricBatch.current = { key: "", at: 0 };
          const rows = mergeFeed([], acceptVersions(data.items.map(storyToItem), latest.current)
            .filter(item => market !== "se" || isSwedishNews(item)));
          current.current = rows;
          setItems(rows);
          setReactionOrder(reactionRanking(rows));
          setLoadedFor(requestKey);
          setCursor(data.nextCursor || null);
        })
        .catch(() => {
          if (version === generation.current)
            setError("Nyheterna kunde inte hämtas. Försök igen.");
        });
    }, 0);
    return () => {
      generation.current++;
      clearTimeout(bootstrap);
      controller.abort();
    };
  }, [activeQuery, category, retry, isPlusUser, market]);

  useEffect(() => {
    if (reactions) {
      captureAnchor();
      setReactionOrder(reactionRanking(refreshMarketObservations(current.current, [...observations.current.values()])));
    }
  }, [reactions]);

  useEffect(() => {
    if (!isPlusUser || !ready || isPaused) {
      setStatus(
        !ready ? "Hämtar nyheter" : isPaused ? "Pausat" : "Sökresultat",
      );
      return;
    }
    let source,
      active = true;
    function accept(incoming) {
      if (!active) return;
      const admitted = acceptVersions(incoming, latest.current);
      const currentById = new Map(current.current.map((item) => [item.id, item]));
      const eligible = admitted.filter(
        (item) =>
          (currentById.has(item.id) || market !== "se" || isSwedishNews(item)) &&
          (currentById.has(item.id) || category === "all" ||
            item.labels?.some((tag) =>
              FILTERS.find((filter) => filter.id === category)?.tags?.includes(tag),
            )),
      );
      if (!eligible.length) return;
      const rows = mergeFeed(current.current, eligible);
      const contentChanged = rows.length !== current.current.length
        || rows.some((item) => !currentById.has(item.id))
        || changedFeedItems(current.current, rows).length > 0;
      const next = new Map(observations.current);
      for (const item of eligible) {
        if (item.status && !["flash", "update"].includes(item.status)) {
          next.delete(item.id);
          continue;
        }
        const old = next.get(item.id) ?? currentById.get(item.id);
        next.set(item.id, old && (old.version ?? 1) === (item.version ?? 1)
          ? refreshMarketObservations([old], [item])[0] : item);
      }
      const observedRows = refreshMarketObservations(rows, [...next.values()]);
      // News and AI copy appear immediately. Quote-only changes update metrics
      // in place; actual news changes or a view switch refresh reaction order.
      captureAnchor();
      observations.current = new Map([...next].slice(-500));
      current.current = observedRows;
      setItems(observedRows);
      if (contentChanged) setReactionOrder(reactionRanking(observedRows));
    }
    applyLive.current = accept;
    if (activeQuery) {
      setStatus("Sökresultat");
      return () => { active = false; applyLive.current = null; };
    }
    let refreshing = false;
    const controller = new AbortController();
    let connected = false;
    async function refresh() {
      if (!active || refreshing || document.visibilityState === "hidden") return;
      refreshing = true;
      try {
        const data = await fetchLiveFeed({ category, market, limit: 20, signal: controller.signal });
        if (active && document.visibilityState !== "hidden" && Array.isArray(data?.items)) accept(data.items.map(storyToItem));
      } catch { /* Retain observed data and its original timestamp on failure. */ }
      finally { refreshing = false; }
    }
    function connect() {
      source?.close();
      connected = false;
      if (!active || document.visibilityState === "hidden") return;
      setStatus("Ansluter");
      const streamParams = new URLSearchParams({ since: String(streamSince.current) });
      if (streamCursor.current) streamParams.set("lastEventId", streamCursor.current);
      source = new EventSource(
        `${process.env.NEXT_PUBLIC_API_URL}/feed/stream?${streamParams}`,
        { withCredentials: true },
      );
      const connection = source;
      source.onopen = () => {
        if (!active || source !== connection) return;
        setStatus("Ansluten");
        connected = true;
        // Replay starts before the initial snapshot. No duplicate snapshot on
        // open; the outbox cursor also covers reconnect/pause/visibility gaps.
      };
      const receive = (event) => {
        if (!active || source !== connection || document.visibilityState === "hidden")
          return;
        try {
          if (event.lastEventId) streamCursor.current = event.lastEventId;
          accept([storyToItem(JSON.parse(event.data))]);
        } catch {
          /* Malformed frames don't discard good stories. */
        }
      };
      for (const kind of ["story", "context", "pulse"]) source.addEventListener(kind, receive);
      source.onerror = () => {
        if (active && source === connection) { connected = false; setStatus("Återansluter"); }
      };
    }
    connect();
    // Only fall back to small news snapshots while the stream is disconnected.
    // The independent observation request below handles price/volume updates.
    const timer = setInterval(() => { if (!connected) refresh(); }, 60_000);
    document.addEventListener("visibilitychange", connect);
    return () => {
      active = false;
      clearInterval(timer);
      source?.close();
      controller.abort();
      applyLive.current = null;
      document.removeEventListener("visibilitychange", connect);
    };
  }, [isPlusUser, ready, activeQuery, category, isPaused, retry, market]);

  useEffect(() => {
    if (!isPlusUser || !ready || isPaused) return;
    let active = true, busy = false, scrollTimer;
    const controller = new AbortController();
    async function refreshObservations() {
      if (!active || busy || document.visibilityState === "hidden") return;
      const visibleIds = [...(listRef.current?.querySelectorAll("[data-live-news-id]") ?? [])]
        .filter(node => { const box = node.getBoundingClientRect(); return box.bottom > 0 && box.top < window.innerHeight; })
        .map(node => node.dataset.liveNewsId);
      const byId = new Map(current.current.map(item => [item.id, item]));
      // If the reader is above the list (or in reaction view awaiting its first
      // metrics), warm only the first batch, not the entire loaded archive.
      const prioritized = [...visibleIds, ...current.current.map(item => item.id)];
      const targets = [...new Set(prioritized)].map(id => byId.get(id)).filter(Boolean).slice(0, 20);
      if (!targets.length) return;
      const batchKey = targets.map(item => `${item.id}:${item.version ?? 1}`).sort().join(",");
      if (lastMetricBatch.current.key === batchKey && Date.now() - lastMetricBatch.current.at < 15_000) return;
      lastMetricBatch.current = { key: batchKey, at: Date.now() };
      busy = true;
      try {
        const data = await fetchFeedObservations({ stories: targets, known: fingerprints.current, signal: controller.signal });
        if (!active || document.visibilityState === "hidden") return;
        const matching = matchingObservations(current.current, data.items);
        for (const row of matching) fingerprints.current.set(row.id, row.fingerprint);
        // Metrics never replace copy or reorder existing rows.
        if (matching.length) {
          captureAnchor();
          const next = matching.map(storyToItem);
          current.current = refreshMarketObservations(current.current, next);
          for (const row of current.current) observations.current.set(row.id, row);
          observations.current = new Map([...observations.current].slice(-500));
          fingerprints.current = new Map([...fingerprints.current].slice(-500));
          setItems(current.current);
          // Admit newly measured stories without reshuffling existing rankings.
          setReactionOrder(previous => [...previous, ...reactionRanking(current.current).filter(id => !previous.includes(id))]);
          const summaryUpdates = matching.flatMap(row => {
            const item = current.current.find(item => item.id === row.id);
            return row.aiSummary && JSON.stringify(item.aiSummary) !== JSON.stringify(row.aiSummary)
              ? [{ ...item, aiSummary: row.aiSummary }] : [];
          });
          if (summaryUpdates.length) applyLive.current?.(summaryUpdates);
        }
        if (data.updates?.length) applyLive.current?.(data.updates.map(storyToItem));
        for (const removed of data.removed ?? []) {
          const item = current.current.find(item => item.id === removed.id);
          if (item && (item.version ?? 1) === removed.version)
            applyLive.current?.([{ ...item, status: "withdrawn" }]);
        }
      } catch { /* Optional metrics must never hide the news or reset a measurement timestamp. */ }
      finally {
        busy = false;
        if (controller.signal.aborted && lastMetricBatch.current.key === batchKey) lastMetricBatch.current = { key: "", at: 0 };
        // Revalidate field freshness even when the server returns an empty
        // delta (or is unavailable), without changing any observation time.
        if (active && document.visibilityState !== "hidden") setItems([...current.current]);
      }
    }
    const schedule = () => { clearTimeout(scrollTimer); scrollTimer = setTimeout(refreshObservations, 250); };
    const first = setTimeout(refreshObservations, 0);
    const timer = setInterval(refreshObservations, 30_000);
    window.addEventListener("scroll", schedule, { passive: true });
    document.addEventListener("visibilitychange", schedule);
    return () => {
      active = false; controller.abort(); clearTimeout(first); clearTimeout(scrollTimer); clearInterval(timer);
      window.removeEventListener("scroll", schedule); document.removeEventListener("visibilitychange", schedule);
    };
  }, [isPlusUser, ready, isPaused, requestKey, measurementKey, captureAnchor, listRef]);

  async function loadOlder() {
    if (!cursor || loadingMore) return;
    const version = generation.current;
    setLoadingMore(true);
    setError("");
    try {
      const data = await fetchLiveFeed({
        q: activeQuery,
        category,
        market,
        cursor,
        limit: 20,
      });
      if (version !== generation.current) return;
      if (!Array.isArray(data?.items))
        throw new Error("Äldre nyheter kunde inte hämtas.");
      const merged = mergeFeed(current.current, acceptVersions(data.items.map(storyToItem), latest.current));
      captureAnchor();
      current.current = merged;
      setItems(merged);
      setReactionOrder(reactionRanking(refreshMarketObservations(merged, [...observations.current.values()])));
      setCursor(
        data.nextCursor && data.nextCursor !== cursor ? data.nextCursor : null,
      );
    } catch (error) {
      if (version === generation.current) setError(error.message);
    } finally {
      if (version === generation.current) setLoadingMore(false);
    }
  }
  const selectRows = (rows) => {
    const filter = FILTERS.find((filter) => filter.id === category);
    const order = new Map(reactionOrder.map((id, index) => [id, index]));
    const filtered = rows.filter(
      (item) =>
        (market !== "se" || isSwedishNews(item)) &&
        (!filter.tags ||
          item.labels?.some((tag) => filter.tags.includes(tag))) &&
        (!reactions || order.has(item.id)),
    );
    const sorted = reactions
      ? [...filtered].sort(
          (a, b) => order.get(a.id) - order.get(b.id),
        )
      : filtered;
    return compact ? sorted.slice(0, 12) : sorted;
  };
  const shown = ready ? selectRows(items) : previousShown.current;
  if (ready) previousShown.current = shown;
  const observed = refreshMarketObservations(items ?? [], [...observations.current.values()]);
  const observedById = new Map(observed.map(item => [item.id, item]));

  return (
    <section className={styles.feed} aria-label="Nyhetsflöde">
      {!compact && (
        <>
          <div className={styles.controls}>
            <form
              className={styles.search}
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                navigate({ q: query.trim() });
              }}
            >
              <TextField
                label="Sök i nyhetsflödet"
                hideLabel
                value={query}
                onValueChange={setQuery}
                placeholder="Sök nyhet, bolag eller nyckelord"
                leading={<FiSearch aria-hidden="true" />}
              />
              {query && (
                <IconButton
                  label="Rensa sökning"
                  onClick={() => {
                    setQuery("");
                    navigate({ q: "" });
                  }}
                >
                  <FiX aria-hidden="true" />
                </IconButton>
              )}
              <Button variant="secondary" type="submit">
                Sök
              </Button>
            </form>
            <SegmentedControl
              label="Sortera nyheter"
              value={reactions ? "reactions" : "latest"}
              onValueChange={(value) =>
                navigate({ view: value === "latest" ? "" : value })
              }
              options={[
                { value: "latest", label: "Senaste" },
                { value: "reactions", label: "Kursreaktion" },
              ]}
            />
          </div>
          <SegmentedControl
            label="Nyhetskategori"
            value={category}
            onValueChange={(value) => navigate({ category: value })}
            options={FILTERS.map((filter) => ({
              value: filter.id,
              label: filter.label,
            }))}
          />
        </>
      )}
      <Inline>
        <Text as="span" size="xs" tone="secondary" role="status">
          {error && !ready ? "Inte ansluten" : status}
          {reactions
            ? " · Störst uppmätt förändring"
            : " · Senast publicerat först"}
        </Text>
        {!compact && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPaused((value) => !value)}
            aria-pressed={isPaused}
          >
            {isPaused ? (
              <FiPlay aria-hidden="true" />
            ) : (
              <FiPause aria-hidden="true" />
            )}
            {isPaused ? "Återuppta" : "Pausa uppdateringar"}
          </Button>
        )}
      </Inline>
      {error && (
        <EmptyState
          role="alert"
          title={error}
          action={
            <Button
              variant="secondary"
              onClick={() =>
                ready && items?.length ? loadOlder() : setRetry((value) => value + 1)
              }
            >
              Försök igen
            </Button>
          }
        />
      )}
      {!ready && !shown.length && !error ? (
        <NewsListSkeleton />
      ) : !shown.length && !error ? (
        <EmptyState
          title="Inga nyheter i urvalet"
          description="Prova ett annat sökord eller en annan kategori."
          action={
            !compact && (
              <Button
                variant="secondary"
                onClick={() => navigate({ q: "", category: "", view: "" })}
              >
                Visa alla nyheter
              </Button>
            )
          }
        />
      ) : (
        <div className={styles.rows} ref={listRef} aria-busy={!ready}>
          {shown.map((item) => (
            <div key={item.id} data-live-news-id={item.id}>
              <NewsFeedItem item={observedById.get(item.id) ?? item} />
            </div>
          ))}
        </div>
      )}
      {!compact && ready && cursor && (
        <Button variant="secondary" loading={loadingMore} onClick={loadOlder}>
          Visa äldre nyheter
        </Button>
      )}
      {!compact && items?.length >= 100 && !cursor && (
        <Text size="xs" tone="secondary">
          Visar de hämtade nyheterna. Sök för att hitta fler; datakällan
          erbjuder ingen ytterligare arkivsida i det här urvalet.
        </Text>
      )}
    </section>
  );
}
