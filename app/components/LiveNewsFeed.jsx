"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FiPause, FiPlay, FiSearch, FiX } from "react-icons/fi";
import { fetchLiveFeed } from "../utils/api";
import { storyToItem } from "../utils/storyToItem";
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
  const { captureAnchor, listRef } = useLiveScrollAnchor();
  const isPaused = paused || parentPaused;
  const requestKey = JSON.stringify([activeQuery, category, retry, isPlusUser]);
  const ready = items !== null && loadedFor === requestKey;

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
    setItems(null);
    current.current = [];
    latest.current = new Map();
    observations.current = new Map();
    setReactionOrder([]);
    setError("");
    setCursor(null);
    setLoadingMore(false);
    fetchLiveFeed({ q: activeQuery, category, limit: 100 })
      .then((data) => {
        if (version !== generation.current) return;
        if (!Array.isArray(data?.items))
          throw new Error(data?.error || "Nyheterna kunde inte hämtas");
        const rows = mergeFeed([], acceptVersions(data.items.map(storyToItem), latest.current));
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
    return () => {
      generation.current++;
    };
  }, [activeQuery, category, retry, isPlusUser]);

  useEffect(() => {
    if (reactions) {
      captureAnchor();
      setReactionOrder(reactionRanking(refreshMarketObservations(current.current, [...observations.current.values()])));
    }
  }, [reactions]);

  useEffect(() => {
    if (!isPlusUser || !ready || activeQuery || isPaused) {
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
          currentById.has(item.id) || category === "all" ||
            item.labels?.some((tag) =>
              FILTERS.find((filter) => filter.id === category)?.tags?.includes(tag),
            ),
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
    let refreshing = false;
    async function refresh() {
      if (!active || refreshing || document.visibilityState === "hidden") return;
      refreshing = true;
      try {
        const data = await fetchLiveFeed({ category, limit: 100 });
        if (active && document.visibilityState !== "hidden" && Array.isArray(data?.items)) accept(data.items.map(storyToItem));
      } catch { /* Retain observed data and its original timestamp on failure. */ }
      finally { refreshing = false; }
    }
    function connect() {
      source?.close();
      if (!active || document.visibilityState === "hidden") return;
      setStatus("Ansluter");
      source = new EventSource(
        `${process.env.NEXT_PUBLIC_API_URL}/feed/stream`,
        { withCredentials: true },
      );
      const connection = source;
      source.onopen = () => {
        if (!active || source !== connection) return;
        setStatus("Ansluten");
        // Catch up on reconnect; the stream alone cannot replay a missed interval.
        refresh();
      };
      source.addEventListener("story", (event) => {
        if (!active || source !== connection || document.visibilityState === "hidden")
          return;
        try {
          accept([storyToItem(JSON.parse(event.data))]);
        } catch {
          /* Malformed frames don't discard good stories. */
        }
      });
      source.onerror = () => {
        if (active && source === connection) setStatus("Återansluter");
      };
    }
    connect();
    // The upstream story stream does not emit optional v2 measurement updates.
    const timer = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", connect);
    return () => {
      active = false;
      clearInterval(timer);
      source?.close();
      document.removeEventListener("visibilitychange", connect);
    };
  }, [isPlusUser, ready, activeQuery, category, isPaused, retry]);

  async function loadOlder() {
    if (!cursor || loadingMore) return;
    const version = generation.current;
    setLoadingMore(true);
    setError("");
    try {
      const data = await fetchLiveFeed({
        q: activeQuery,
        category,
        cursor,
        limit: 100,
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
  const shown = selectRows(ready ? items : []);
  const observed = refreshMarketObservations(ready ? items : [], [...observations.current.values()]);
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
                items?.length ? loadOlder() : setRetry((value) => value + 1)
              }
            >
              Försök igen
            </Button>
          }
        />
      )}
      {!ready && !error ? (
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
        <div className={styles.rows} ref={listRef}>
          {shown.map((item) => (
            <div key={item.id} data-live-news-id={item.id}>
              <NewsFeedItem item={observedById.get(item.id) ?? item} />
            </div>
          ))}
        </div>
      )}
      {!compact && cursor && (
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
