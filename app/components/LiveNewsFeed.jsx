"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FiPause, FiPlay, FiSearch, FiX } from "react-icons/fi";
import { fetchLiveFeed } from "../utils/api";
import { storyToItem } from "../utils/storyToItem";
import {
  changedFeedItems,
  mergeFeed,
  pendingChanges,
  refreshMarketObservations,
} from "../utils/newsroom";
import { rowReaction } from "../utils/reactionV2";
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
  const [pending, setPending] = useState([]);
  const [observations, setObservations] = useState(new Map());
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState("Ansluter");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedFor, setLoadedFor] = useState(null);
  const generation = useRef(0);
  const current = useRef([]);
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
    setPending([]);
    setObservations(new Map());
    setError("");
    setCursor(null);
    setLoadingMore(false);
    fetchLiveFeed({ q: activeQuery, category, limit: 100 })
      .then((data) => {
        if (version !== generation.current) return;
        if (!Array.isArray(data?.items))
          throw new Error(data?.error || "Nyheterna kunde inte hämtas");
        const rows = mergeFeed([], data.items.map(storyToItem));
        current.current = rows;
        setItems(rows);
        setLoadedFor(requestKey);
        setPending((previous) => pendingChanges(rows, previous));
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
      const withdrawn = new Set(
        incoming
          .filter(
            (item) => item.status && !["flash", "update"].includes(item.status),
          )
          .map((item) => item.id),
      );
      if (withdrawn.size) {
        current.current = current.current.filter(
          (item) => !withdrawn.has(item.id),
        );
        setItems(current.current);
        setPending((previous) =>
          previous.filter((item) => !withdrawn.has(item.id)),
        );
      }
      // Price-only updates stay out of the reading queue. New versions remain explicit.
      const eligible = incoming.filter(
        (item) =>
          !withdrawn.has(item.id) &&
          (category === "all" ||
            item.labels?.some((tag) =>
              FILTERS.find((filter) => filter.id === category)?.tags?.includes(tag),
            )),
      );
      setObservations(previous => {
        const next = new Map(previous);
        for (const item of eligible) {
          const old = next.get(item.id);
          if (old && (old.version ?? 1) > (item.version ?? 1)) continue;
          next.set(item.id, old && (old.version ?? 1) === (item.version ?? 1)
            ? refreshMarketObservations([old], [item])[0] : item);
        }
        return new Map([...next].slice(-500));
      });
      // Deduplicate before counting; also clear queued copy that has reverted
      // to the displayed version. A replay must not resurrect the same banner.
      setPending((previous) =>
        pendingChanges(current.current, mergeFeed(previous, eligible)),
      );
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
      const merged = mergeFeed(current.current, data.items.map(storyToItem));
      current.current = merged;
      setItems(merged);
      setPending((previous) => pendingChanges(merged, previous));
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
    const filtered = rows.filter(
      (item) =>
        (!filter.tags ||
          item.labels?.some((tag) => filter.tags.includes(tag))) &&
        (!reactions || rowReaction(item).pct !== null),
    );
    const sorted = reactions
      ? [...filtered].sort(
          (a, b) => Math.abs(rowReaction(b).pct) - Math.abs(rowReaction(a).pct),
        )
      : filtered;
    return compact ? sorted.slice(0, 12) : sorted;
  };
  const shown = selectRows(ready ? items : []);
  const observed = refreshMarketObservations(ready ? items : [], [...observations.values()]);
  const observedById = new Map(observed.map(item => [item.id, item]));
  const selectionChanged = reactions && shown.map(item => item.id).join(",") !== selectRows(observed).map(item => item.id).join(",");
  const pendingCount = ready
    ? changedFeedItems(shown, selectRows(mergeFeed(items, pending))).length
    : 0;

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
      {pendingCount > 0 && (
        <Button
          variant="secondary"
          onClick={() => {
            const merged = mergeFeed(current.current, pending);
            current.current = merged;
            setItems(merged);
            setPending([]);
          }}
        >
          {pendingCount} nya eller uppdaterade nyheter
        </Button>
      )}
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
      {selectionChanged && <Button variant="secondary" onClick={() => { current.current = observed; setItems(observed); }}>Uppdatera urval</Button>}
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
        <div className={styles.rows}>
          {shown.map((item) => (
            <NewsFeedItem key={item.id} item={observedById.get(item.id) ?? item} />
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
