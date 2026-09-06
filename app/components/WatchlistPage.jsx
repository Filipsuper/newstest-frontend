"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FiPlus, FiX } from "react-icons/fi";
import { useAuthContext } from "../providers/AuthProvider";
import { fetchTopics, saveKeywords, saveTopics } from "../utils/api";
import { getCompanies } from "../utils/companies";
import { TOPIC_LABELS } from "../utils/topicLabels";
import StockSearch from "./StockSearch";
import FollowCompanyButton from "./FollowCompanyButton";
import { WatchWorkspaceNav } from "./WorkspaceNav";
import { Button, IconButton } from "./ui/Button";
import { TextField } from "./ui/TextField";
import { Checkbox } from "./ui/Choices";
import { Container, Heading, Inline, Stack, Text } from "./ui/layout";
import { EmptyState, Skeleton } from "./ui/data";
import styles from "./workspace.module.css";

export default function WatchlistPage() {
  const { user, isGuestUser, refreshUser } = useAuthContext();
  const [companies, setCompanies] = useState([]);
  const [selected, setSelected] = useState(null);
  const [vocabulary, setVocabulary] = useState(null);
  const [busy, setBusy] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    getCompanies().then((rows) => {
      if (active) setCompanies(rows);
    });
    fetchTopics()
      .then((value) => {
        if (active) setVocabulary(value);
      })
      .catch(() => {
        if (active) setVocabulary(null);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  const watchlist = user?.watchlist ?? [],
    topics = user?.topics ?? [],
    keywords = user?.keywords ?? [];
  async function update(kind, values) {
    if (busy) return false;
    setBusy(true);
    setError("");
    try {
      const response = await (kind === "topics"
        ? saveTopics(values)
        : saveKeywords(values));
      if (!response || response.error)
        throw new Error(response?.error || "Dina val kunde inte sparas.");
      await refreshUser();
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function addKeyword(event) {
    event.preventDefault();
    const value = keyword.replace(/\s+/g, " ").trim();
    if (value.length < 2 || value.length > 40) {
      setError("Skriv mellan 2 och 40 tecken.");
      return;
    }
    if (
      keywords.some(
        (item) =>
          item.toLocaleLowerCase("sv-SE") === value.toLocaleLowerCase("sv-SE"),
      )
    ) {
      setError("Du följer redan det nyckelordet.");
      return;
    }
    if (keywords.length >= 10) {
      setError("Du kan följa högst 10 nyckelord.");
      return;
    }
    if (await update("keywords", [...keywords, value])) setKeyword("");
  }
  return (
    <Container as="main" className={styles.workspace}>
      <WatchWorkspaceNav />
      <header className={styles.heading}>
        <Heading as="h1" size="page">
          Hantera bevakning
        </Heading>
        <Link className={styles.textLink} href="/bevakning">
          Till ditt flöde →
        </Link>
      </header>
      {!user ? (
        <Skeleton />
      ) : isGuestUser ? (
        <EmptyState
          title="Börja med ett bolag"
          description="Logga in för att spara dina bolag, ämnen och nyckelord."
          action={
            <Button nativeButton={false} render={<Link href="/bevakning" />}>
              Skapa din bevakning
            </Button>
          }
        />
      ) : (
        <>
          {error && (
            <Text role="alert" size="sm">
              {error}
            </Text>
          )}
          <div className={styles.preferences}>
            <section className={styles.section}>
              <Inline className={styles.between}>
                <Heading size="subsection">Bolag</Heading>
                <Text size="xs" tone="secondary">
                  {watchlist.length}/
                  {{ free: 5, plus: 10, premium: 100 }[user.plan] ?? 5} valda
                </Text>
              </Inline>
              <StockSearch
                placeholder="Sök ett bolag att följa"
                onSelect={setSelected}
                showSuggestions
              />
              {selected && !watchlist.includes(selected.symbol) && (
                <Inline className={styles.notice}>
                  <Text size="sm">{selected.name}</Text>
                  <FollowCompanyButton
                    symbol={selected.symbol}
                    name={selected.name}
                  />
                </Inline>
              )}
              <ul className={styles.preferenceRows}>
                {watchlist.map((symbol) => {
                  const company = companies.find(
                    (row) => row.symbol === symbol,
                  );
                  return (
                    <li className={styles.preferenceRow} key={symbol}>
                      <Link href={`/aktie/${encodeURIComponent(symbol)}`}>
                        {company?.name || symbol}
                      </Link>
                      <FollowCompanyButton
                        symbol={symbol}
                        name={company?.name}
                      />
                    </li>
                  );
                })}
              </ul>
              {!watchlist.length && (
                <Text size="sm" tone="secondary">
                  Inga bolag valda ännu.
                </Text>
              )}
            </section>
            <Stack gap={8}>
              <details
                className={styles.details}
                open={topics.length > 0 || undefined}
              >
                <summary>Ämnen · {topics.length}/10</summary>
                <Stack gap={4}>
                  {vocabulary ? (
                    [
                      ["Händelser", vocabulary.events],
                      ["Sektorer", vocabulary.sectors],
                      ["Börslistor", vocabulary.segments],
                    ].map(
                      ([title, values]) =>
                        values?.length > 0 && (
                          <Stack gap={2} key={title}>
                            <Heading as="h3" size="subsection">
                              {title}
                            </Heading>
                            {values.map((value) => (
                              <Checkbox
                                key={value}
                                label={TOPIC_LABELS[value] || value}
                                checked={topics.includes(value)}
                                disabled={
                                  busy ||
                                  (!topics.includes(value) &&
                                    topics.length >= 10)
                                }
                                onCheckedChange={(checked) =>
                                  update(
                                    "topics",
                                    checked
                                      ? [...topics, value]
                                      : topics.filter((item) => item !== value),
                                  )
                                }
                              />
                            ))}
                          </Stack>
                        ),
                    )
                  ) : (
                    <>
                      <Text size="sm">Ämnen kunde inte hämtas.</Text>
                      <Button
                        variant="secondary"
                        onClick={() => setRetry((value) => value + 1)}
                      >
                        Försök igen
                      </Button>
                    </>
                  )}
                </Stack>
              </details>
              <details
                className={styles.details}
                open={keywords.length > 0 || undefined}
              >
                <summary>Nyckelord · {keywords.length}/10</summary>
                <Stack gap={4}>
                  <Text size="sm" tone="secondary">
                    Matchas mot rubrik och sammanfattning. Välj till exempel
                    försvar eller vinstvarning.
                  </Text>
                  <form className={styles.keywordForm} onSubmit={addKeyword}>
                    <TextField
                      label="Nytt nyckelord"
                      value={keyword}
                      onValueChange={setKeyword}
                      maxLength={40}
                    />
                    <IconButton
                      label="Lägg till nyckelord"
                      type="submit"
                      loading={busy}
                    >
                      <FiPlus aria-hidden="true" />
                    </IconButton>
                  </form>
                  <Inline>
                    {keywords.map((value) => (
                      <Inline className={styles.notice} key={value}>
                        <Text as="span" size="sm">
                          {value}
                        </Text>
                        <IconButton
                          size="sm"
                          label={`Ta bort nyckelordet ${value}`}
                          disabled={busy}
                          onClick={() =>
                            update(
                              "keywords",
                              keywords.filter((item) => item !== value),
                            )
                          }
                        >
                          <FiX aria-hidden="true" />
                        </IconButton>
                      </Inline>
                    ))}
                  </Inline>
                </Stack>
              </details>
              <Text size="sm" tone="secondary">
                De här valen formar ditt nyhetsflöde. Inga aviseringar aktiveras
                när du följer ett bolag, ämne eller nyckelord.
              </Text>
            </Stack>
          </div>
        </>
      )}
    </Container>
  );
}
