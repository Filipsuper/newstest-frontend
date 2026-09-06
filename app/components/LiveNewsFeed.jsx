"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FiPause, FiPlay, FiSearch, FiX } from "react-icons/fi";
import { fetchLiveFeed } from "../utils/api";
import { storyToItem } from "../utils/storyToItem";
import { finiteNumber, mergeFeed, pendingChanges } from "../utils/newsroom";
import { useAuthContext } from "../providers/AuthProvider";
import { Button, IconButton } from "./ui/Button";
import { TextField } from "./ui/TextField";
import { SegmentedControl } from "./ui/SegmentedControl";
import { EmptyState, Skeleton } from "./ui/data";
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
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState("Ansluter");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const generation = useRef(0);
  const current = useRef([]);
  const isPaused = paused || parentPaused;

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
        setPending((previous) => pendingChanges(rows, previous));
        setCursor(data.nextCursor || null);
      })
      .catch((error) => {
        if (version === generation.current) setError(error.message);
      });
    return () => {
      generation.current++;
    };
  }, [activeQuery, category, retry, isPlusUser]);

  useEffect(() => {
    if (!isPlusUser || activeQuery || isPaused) {
      setStatus(isPaused ? "Pausat" : "Sökresultat");
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
      const changes = pendingChanges(
        current.current,
        incoming.filter(
          (item) =>
            !withdrawn.has(item.id) &&
            (category === "all" ||
              item.labels?.some((tag) =>
                FILTERS.find(
                  (filter) => filter.id === category,
                )?.tags?.includes(tag),
              )),
        ),
      );
      if (changes.length)
        setPending((previous) => mergeFeed(previous, changes));
    }
    function connect() {
      source?.close();
      if (!active || document.visibilityState === "hidden") return;
      setStatus("Ansluter");
      source = new EventSource(
        `${process.env.NEXT_PUBLIC_API_URL}/feed/stream`,
        { withCredentials: true },
      );
      source.onopen = () => {
        setStatus("Ansluten");
        // Catch up on reconnect; the stream alone cannot replay a missed interval.
        fetchLiveFeed({ category, limit: 100 })
          .then((data) => {
            if (Array.isArray(data?.items)) accept(data.items.map(storyToItem));
          })
          .catch(() => {});
      };
      source.addEventListener("story", (event) => {
        try {
          accept([storyToItem(JSON.parse(event.data))]);
        } catch {
          /* Malformed frames don't discard good stories. */
        }
      });
      source.onerror = () => {
        if (active) setStatus("Återansluter");
      };
    }
    connect();
    document.addEventListener("visibilitychange", connect);
    return () => {
      active = false;
      source?.close();
      document.removeEventListener("visibilitychange", connect);
    };
  }, [isPlusUser, activeQuery, category, isPaused, retry]);

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
      setCursor(
        data.nextCursor && data.nextCursor !== cursor ? data.nextCursor : null,
      );
    } catch (error) {
      if (version === generation.current) setError(error.message);
    } finally {
      if (version === generation.current) setLoadingMore(false);
    }
  }
  const shown = useMemo(() => {
    const filter = FILTERS.find((filter) => filter.id === category);
    const filtered = (items ?? []).filter(
      (item) =>
        (!filter.tags ||
          item.labels?.some((tag) => filter.tags.includes(tag))) &&
        (!reactions || finiteNumber(item.reaction?.pct) !== null),
    );
    return reactions
      ? [...filtered].sort(
          (a, b) => Math.abs(b.reaction.pct) - Math.abs(a.reaction.pct),
        )
      : filtered;
  }, [items, category, reactions]);

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
          {status}
          {reactions
            ? " · Störst förändring sedan publicering"
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
      {pending.length > 0 && (
        <Button
          variant="secondary"
          onClick={() => {
            const merged = mergeFeed(current.current, pending);
            current.current = merged;
            setItems(merged);
            setPending([]);
          }}
        >
          {pending.length} nya eller uppdaterade nyheter
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
      {!items && !error ? (
        <div aria-label="Hämtar nyheter" aria-busy="true">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} />
          ))}
        </div>
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
          {(compact ? shown.slice(0, 12) : shown).map((item) => (
            <NewsFeedItem key={item.id} item={item} />
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
