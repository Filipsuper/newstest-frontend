"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FiArrowRight, FiPlus } from "react-icons/fi";
import { useAuthContext } from "../providers/AuthProvider";
import { fetchPersonalFeed, toggleWatchlist } from "../utils/api";
import {
  personalStoryToItem,
  preferenceReason,
  pendingChanges,
  mergeFeed,
} from "../utils/newsroom";
import { WatchWorkspaceNav } from "./WorkspaceNav";
import NewsFeedItem from "./NewsFeedItem";
import StockSearch from "./StockSearch";
import LogInModal from "../modals/logInModal";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/overlays";
import { SegmentedControl } from "./ui/SegmentedControl";
import { Container, Heading, Inline, Stack, Text } from "./ui/layout";
import { EmptyState, Skeleton } from "./ui/data";
import styles from "./workspace.module.css";

export default function WatchFeedPage() {
  const { user, isGuestUser, refreshUser } = useAuthContext();
  const [items, setItems] = useState(null);
  const [pending, setPending] = useState([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [login, setLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [lastVisit, setLastVisit] = useState(null);
  const [paused, setPaused] = useState(false);
  const rows = useRef(null);
  const key = JSON.stringify([
    user?.email,
    user?.watchlist,
    user?.topics,
    user?.keywords,
  ]);
  const hasPreferences = Boolean(
    user?.watchlist?.length || user?.topics?.length || user?.keywords?.length,
  );
  useEffect(() => {
    if (!user?.email) return;
    // Local, account-scoped catch-up marker, not a claim of per-story read receipts.
    const storageKey = `omxsum:watch-visited:${user.email}`;
    try {
      const last = Number(localStorage.getItem(storageKey));
      setLastVisit(last > 0 && last <= Date.now() ? last : null);
      localStorage.setItem(storageKey, String(Date.now()));
    } catch {
      setLastVisit(null);
    }
  }, [user?.email]);
  useEffect(() => {
    if (paused) return;
    let active = true,
      busy = false;
    rows.current = null;
    setItems(null);
    setPending([]);
    setError("");
    if (!user || isGuestUser || !hasPreferences) return;
    async function refresh() {
      if (!active || busy || document.visibilityState === "hidden") return;
      busy = true;
      try {
        const data = await fetchPersonalFeed({ limit: 50 });
        if (!active) return;
        if (!data || data.unavailable || !Array.isArray(data.stories))
          throw new Error(
            "Bevakningsflödet kunde inte hämtas. Dina val är fortfarande sparade.",
          );
        const incoming = data.stories.map((story) => ({
          ...personalStoryToItem(story),
          reason: preferenceReason(story),
          match: story.viaWatchlist
            ? "companies"
            : story.matchedKeyword
              ? "keywords"
              : "topics",
        }));
        if (rows.current === null) {
          rows.current = incoming;
          setItems(incoming);
        } else setPending(pendingChanges(rows.current, incoming));
        setError("");
      } catch (error) {
        if (active) setError(error.message);
      } finally {
        busy = false;
      }
    }
    refresh();
    const timer = setInterval(refresh, 60_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [key, hasPreferences, isGuestUser, retry, paused]);
  const shown = useMemo(
    () =>
      (items ?? []).filter((item) =>
        filter === "all" || filter === "new"
          ? filter !== "new" || (lastVisit && item.ts > lastVisit)
          : item.match === filter,
      ),
    [items, filter, lastVisit],
  );
  async function follow(company) {
    if (!user || isGuestUser) {
      setLogin(true);
      return;
    }
    if (busy || user.watchlist?.includes(company.symbol)) return;
    setBusy(true);
    setError("");
    try {
      const result = await toggleWatchlist(company.symbol);
      if (!result || result.error)
        throw new Error(result?.error || "Kunde inte spara bolaget.");
      await refreshUser();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Container as="main" className={styles.workspace}>
      <WatchWorkspaceNav />
      <header className={styles.heading}>
        <Stack gap={2}>
          <Heading as="h1" size="page">
            Dina bevakningar
          </Heading>
          <Text size="sm" tone="secondary">
            Nyheterna som berör det du följer.
          </Text>
        </Stack>
        <Button
          variant="secondary"
          nativeButton={false}
          render={<Link href="/bevakning/hantera" />}
        >
          <FiPlus aria-hidden="true" /> Lägg till bevakning
        </Button>
      </header>
      <div className={styles.grid}>
        <section className={styles.section}>
          {error && (
            <EmptyState
              role="alert"
              title={error}
              action={
                <Button
                  variant="secondary"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  Försök igen
                </Button>
              }
            />
          )}
          {!user ? (
            <Skeleton />
          ) : isGuestUser || !hasPreferences ? (
            <Stack gap={4}>
              <Heading size="subsection">Börja med ett bolag</Heading>
              <Text size="sm" tone="secondary">
                Välj ett bolag för att samla dess nyheter här. Du väljer själv
                om du senare vill ha aviseringar.
              </Text>
              <StockSearch
                placeholder="Sök ett bolag att följa"
                onSelect={follow}
                showSuggestions
              />
              <Text size="xs" tone="secondary">
                {busy
                  ? "Sparar bevakningen…"
                  : "Du kan även följa ett bolag direkt från en nyhet."}
              </Text>
            </Stack>
          ) : (
            <>
              <SegmentedControl
                label="Filtrera bevakning"
                value={filter}
                onValueChange={setFilter}
                options={[
                  { value: "all", label: "Alla" },
                  ...(lastVisit ? [{ value: "new", label: "Sedan sist" }] : []),
                  { value: "companies", label: "Bolag" },
                  { value: "topics", label: "Ämnen" },
                  { value: "keywords", label: "Nyckelord" },
                ]}
              />
              <Inline className={styles.between}>
                <Text size="xs" tone="secondary">
                  Matchningar från de senaste 48 timmarna
                  {filter === "new"
                    ? " · sedan ditt senaste besök på den här enheten"
                    : ""}
                </Text>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPaused((value) => !value)}
                >
                  {paused ? "Återuppta" : "Pausa uppdateringar"}
                </Button>
              </Inline>
              {pending.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const merged = mergeFeed(items ?? [], pending);
                    rows.current = merged;
                    setItems(merged);
                    setPending([]);
                  }}
                >
                  {pending.length} nya eller uppdaterade nyheter
                </Button>
              )}
              {!items && !error ? (
                <Stack gap={2}>
                  {[0, 1, 2].map((key) => (
                    <Skeleton key={key} />
                  ))}
                </Stack>
              ) : shown.length ? (
                <div className={styles.news}>
                  {shown.map((item) => (
                    <NewsFeedItem
                      key={item.id}
                      item={item}
                      reason={item.reason}
                    />
                  ))}
                </div>
              ) : (
                !error && (
                  <EmptyState
                    title={
                      filter === "new"
                        ? "Du är ikapp"
                        : "Inga matchningar just nu"
                    }
                    description="Dina bevakningar är sparade. Prova Alla för att se fler matchningar."
                  />
                )
              )}
            </>
          )}
        </section>
        <aside className={styles.section}>
          <Heading size="subsection">Det du följer</Heading>
          <Text size="sm" tone="secondary">
            {user?.watchlist?.length ?? 0} bolag · {user?.topics?.length ?? 0}{" "}
            ämnen · {user?.keywords?.length ?? 0} nyckelord
          </Text>
          <Link className={styles.textLink} href="/bevakning/hantera">
            Hantera bevakning <FiArrowRight aria-hidden="true" />
          </Link>
          <Link className={styles.textLink} href="/marknaden">
            Se hela marknaden <FiArrowRight aria-hidden="true" />
          </Link>
          <Text size="xs" tone="secondary">
            Att följa något ändrar ditt flöde. Det aktiverar inte mejl eller
            andra aviseringar.
          </Text>
        </aside>
      </div>
      <Dialog open={login} onOpenChange={setLogin} title="Spara din bevakning">
        <LogInModal redirectTo="/bevakning" />
      </Dialog>
    </Container>
  );
}
