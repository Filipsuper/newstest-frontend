"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FiPlus, FiSearch, FiX } from "react-icons/fi";
import { useAuthContext } from "../providers/AuthProvider";
import { fetchTopics, saveKeywords, saveTopics, setCompanyFollowing } from "../utils/api";
import { getCompanies } from "../utils/companies";
import { TOPIC_LABELS } from "../utils/topicLabels";
import LogInModal from "../modals/logInModal";
import StockSearch from "./StockSearch";
import { Button, IconButton } from "./ui/Button";
import { TextField } from "./ui/TextField";
import { Tab, TabList, TabPanel, Tabs } from "./ui/Tabs";
import { Heading, Inline, Stack, Text } from "./ui/layout";
import { Skeleton } from "./ui/data";
import styles from "./watch-preferences.module.css";

const TOPIC_LIMIT = 10;
const KEYWORD_LIMIT = 10;
const TOPIC_PAGE_SIZE = 9;
const GROUPS = [
  ["events", "Händelser"],
  ["sectors", "Sektorer"],
  ["segments", "Börslistor"],
];
const normalize = (value) => String(value || "").toLocaleLowerCase("sv-SE").trim();

function SelectedChips({ label, values, itemLabel = (value) => value, removeLabel, busy, onRemove }) {
  return values.length ? (
    <Inline as="ul" className={styles.chips} aria-label={label}>
      {values.map((value) => (
        <li className={styles.chip} key={value}>
          <Text as="span" size="sm">{itemLabel(value)}</Text>
          <IconButton
            label={`${removeLabel} ${itemLabel(value)}`}
            disabled={Boolean(busy)}
            onClick={() => onRemove(value)}
          >
            <FiX aria-hidden="true" />
          </IconButton>
        </li>
      ))}
    </Inline>
  ) : (
    <Text size="sm" tone="secondary">Inga {label.toLocaleLowerCase("sv-SE").replace("valda ", "")} valda ännu.</Text>
  );
}

/** Shared editor body, used both in the preference dialog and its direct route. */
export default function WatchPreferencesEditor({ initialTab = "companies" }) {
  const { user, isGuestUser, refreshUser } = useAuthContext();
  const pathname = usePathname();
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companyRetry, setCompanyRetry] = useState(0);
  const [selected, setSelected] = useState(null);
  const [vocabulary, setVocabulary] = useState(null);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicRetry, setTopicRetry] = useState(0);
  const [topicQuery, setTopicQuery] = useState("");
  const [topicPage, setTopicPage] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [keywordError, setKeywordError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  const hasAccount = Boolean(user?.email);

  useEffect(() => {
    if (!hasAccount) return;
    let active = true;
    setCompaniesLoading(true);
    getCompanies().then((rows) => {
      if (!active) return;
      setCompanies(rows);
      setCompaniesLoading(false);
    });
    return () => { active = false; };
  }, [hasAccount, companyRetry]);

  useEffect(() => {
    if (!hasAccount) return;
    let active = true;
    setTopicsLoading(true);
    fetchTopics()
      .then((value) => {
        if (!active) return;
        setVocabulary(
          value && !value.error && GROUPS.some(([key]) => Array.isArray(value[key]))
            ? value
            : null,
        );
      })
      .catch(() => { if (active) setVocabulary(null); })
      .finally(() => { if (active) setTopicsLoading(false); });
    return () => { active = false; };
  }, [hasAccount, topicRetry]);

  const watchlist = user?.watchlist ?? [];
  const topics = user?.topics ?? [];
  const keywords = user?.keywords ?? [];
  const companyLimit = { free: 5, plus: 10, premium: 100 }[user?.plan] ?? 5;
  const companyNames = useMemo(
    () => new Map(companies.map((company) => [company.symbol, company.name || company.symbol])),
    [companies],
  );
  const topicResults = useMemo(() => {
    const query = normalize(topicQuery);
    const seen = new Set();
    const grouped = GROUPS.map(([key, group]) =>
      (Array.isArray(vocabulary?.[key]) ? vocabulary[key] : [])
        .filter((value) => {
          if (typeof value !== "string" || seen.has(value)) return false;
          seen.add(value);
          return !topics.includes(value) && normalize(`${TOPIC_LABELS[value] || value} ${value} ${group}`).includes(query);
        })
        .map((value) => ({ value, group })),
    );
    // Keep each vocabulary group discoverable in the first bounded result page.
    return Array.from({ length: Math.max(0, ...grouped.map((entries) => entries.length)) }, (_, index) =>
      grouped.map((entries) => entries[index]).filter(Boolean),
    ).flat();
  }, [vocabulary, topicQuery, topics]);
  const lastTopicPage = Math.max(0, Math.ceil(topicResults.length / TOPIC_PAGE_SIZE) - 1);
  const currentTopicPage = Math.min(topicPage, lastTopicPage);
  const resultStart = currentTopicPage * TOPIC_PAGE_SIZE;
  const visibleTopics = topicResults.slice(resultStart, resultStart + TOPIC_PAGE_SIZE);

  async function save(action, savedMessage) {
    if (pending.current || !hasAccount) return false;
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await action();
      if (!result || result.error)
        throw new Error(typeof result?.error === "string" ? result.error : "Dina val kunde inte sparas. Försök igen.");
      const account = await refreshUser();
      if (!account?.email)
        throw new Error("Valet är sparat, men kontot kunde inte hämtas. Logga in igen för att se dina val.");
      setMessage(savedMessage);
      return true;
    } catch (failure) {
      setError(failure.message || "Dina val kunde inte sparas. Försök igen.");
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function followCompany(company, followed) {
    if (followed && (watchlist.includes(company.symbol) || watchlist.length >= companyLimit)) return;
    const name = company.name || company.symbol;
    if (await save(
      () => setCompanyFollowing(company.symbol, followed),
      followed ? `${name} är sparat.` : `${name} har tagits bort.`,
    )) setSelected(null);
  }

  function updateTopics(value, followed) {
    if (followed && (topics.includes(value) || topics.length >= TOPIC_LIMIT)) return;
    // Retain saved values absent from today's vocabulary in every unrelated edit.
    return save(
      () => saveTopics(followed ? [...topics, value] : topics.filter((topic) => topic !== value)),
      followed ? "Ämnet är sparat." : "Ämnet har tagits bort.",
    );
  }

  async function addKeyword(event) {
    event.preventDefault();
    if (pending.current) return;
    const value = keyword.replace(/\s+/g, " ").trim();
    if (value.length < 2 || value.length > 40) {
      setKeywordError("Skriv mellan 2 och 40 tecken.");
      return;
    }
    if (keywords.some((item) => normalize(item) === normalize(value))) {
      setKeywordError("Du följer redan det nyckelordet.");
      return;
    }
    if (keywords.length >= KEYWORD_LIMIT) {
      setKeywordError("Du kan följa högst 10 nyckelord. Ta bort ett för att lägga till ett nytt.");
      return;
    }
    setKeywordError("");
    if (await save(() => saveKeywords([...keywords, value]), "Nyckelordet är sparat.")) setKeyword("");
  }

  if (!user) return <Skeleton label="Hämtar din bevakning" />;
  if (isGuestUser) return (
    <Stack gap={4}>
      <Text size="sm" tone="secondary">Logga in för att spara dina bolag, ämnen och nyckelord.</Text>
      {error && <Text size="sm" role="alert" className={styles.error}>{error}</Text>}
      <LogInModal redirectTo={pathname || "/marknaden/bevakning"} />
    </Stack>
  );

  return (
    <Stack gap={4} className={styles.editor}>
      <Text size="xs" tone="secondary" role="status" className={styles.status}>
        {busy ? "Sparar…" : message || "Dina val sparas direkt."}
      </Text>
      {error && <Text size="sm" role="alert" className={styles.error}>{error}</Text>}
      <Tabs defaultValue={initialTab}>
        <TabList label="Anpassa bevakning" className={styles.tabs}>
          <Tab value="companies" className={styles.tab}>Bolag <span className={styles.count}>{watchlist.length}</span></Tab>
          <Tab value="topics" className={styles.tab}>Ämnen <span className={styles.count}>{topics.length}</span></Tab>
          <Tab value="keywords" className={styles.tab}>Nyckelord <span className={styles.count}>{keywords.length}</span></Tab>
        </TabList>
        <TabPanel value="companies">
          <Stack gap={4}>
            <SelectedChips
              label="Valda bolag" values={watchlist} busy={busy}
              itemLabel={(symbol) => companyNames.get(symbol) || symbol}
              removeLabel="Sluta följa"
              onRemove={(symbol) => followCompany({ symbol, name: companyNames.get(symbol) }, false)}
            />
            <Text size="xs" tone="secondary" numeric>{watchlist.length}/{companyLimit} bolag i din plan</Text>
            {watchlist.length >= companyLimit && <Text size="sm" tone="secondary">Du har valt så många bolag som ingår i din plan. Ta bort ett för att välja ett annat.</Text>}
            {companiesLoading ? <Skeleton label="Hämtar bolag" /> : companies.length ? (
              <fieldset className={styles.search} disabled={busy}>
                <StockSearch
                  label="Sök ett bolag att följa" placeholder="Sök bolag eller ticker"
                  initialCompanies={companies} onSelect={setSelected} showSuggestions
                />
              </fieldset>
            ) : (
              <Stack gap={2}>
                <Text size="sm">Bolagslistan kunde inte hämtas. Dina sparade bolag finns kvar.</Text>
                <Button variant="secondary" onClick={() => setCompanyRetry((value) => value + 1)}>Hämta bolag igen</Button>
              </Stack>
            )}
            {selected && <Inline className={styles.candidate}>
              <Text size="sm">{selected.name || selected.symbol}</Text>
              <Button
                variant="secondary" loading={busy}
                disabled={watchlist.includes(selected.symbol) || watchlist.length >= companyLimit}
                onClick={() => followCompany(selected, true)}
                aria-label={`${watchlist.includes(selected.symbol) ? "Följer" : "Följ"} ${selected.name || selected.symbol}`}
              >{watchlist.includes(selected.symbol) ? "Följer" : "Följ bolag"}</Button>
            </Inline>}
          </Stack>
        </TabPanel>
        <TabPanel value="topics">
          <Stack gap={4}>
            <SelectedChips
              label="Valda ämnen" values={topics} busy={busy}
              itemLabel={(value) => TOPIC_LABELS[value] || value} removeLabel="Ta bort ämnet"
              onRemove={(value) => updateTopics(value, false)}
            />
            <Text size="xs" tone="secondary" numeric>{topics.length}/{TOPIC_LIMIT} ämnen valda</Text>
            {topics.length >= TOPIC_LIMIT && <Text size="sm" tone="secondary">Du följer 10 ämnen. Ta bort ett för att välja ett nytt.</Text>}
            <TextField
              label="Sök ämnen" placeholder="Sök händelser, sektorer eller börslistor"
              leading={<FiSearch />} value={topicQuery}
              onValueChange={(value) => { setTopicQuery(value); setTopicPage(0); }}
            />
            {topicsLoading ? <Skeleton label="Hämtar ämnen" /> : !vocabulary ? (
              <Stack gap={2}>
                <Text size="sm">Ämnen kunde inte hämtas. Dina sparade ämnen finns kvar.</Text>
                <Button variant="secondary" onClick={() => setTopicRetry((value) => value + 1)}>Hämta ämnen igen</Button>
              </Stack>
            ) : visibleTopics.length ? (
              <Stack gap={4}>
                {GROUPS.map(([, group]) => {
                  const entries = visibleTopics.filter((topic) => topic.group === group);
                  return entries.length ? <Stack gap={2} key={group}>
                    <Heading as="h3" size="subsection" className={styles.groupTitle}>{group}</Heading>
                    <ul className={styles.results} aria-label={group}>
                      {entries.map(({ value }) => <li key={value}>
                        <Button
                          variant="ghost" className={styles.topicOption}
                          disabled={busy || topics.length >= TOPIC_LIMIT}
                          onClick={() => updateTopics(value, true)}
                          aria-label={`Följ ämnet ${TOPIC_LABELS[value] || value}`}
                        >
                          <span>{TOPIC_LABELS[value] || value}</span><FiPlus aria-hidden="true" />
                        </Button>
                      </li>)}
                    </ul>
                  </Stack> : null;
                })}
                {topicResults.length > TOPIC_PAGE_SIZE && <Stack gap={2}>
                  <Text size="xs" tone="secondary" numeric>Visar {resultStart + 1}–{Math.min(resultStart + TOPIC_PAGE_SIZE, topicResults.length)} av {topicResults.length} ämnen</Text>
                  <Inline>
                    <Button variant="secondary" disabled={currentTopicPage === 0} onClick={() => setTopicPage(currentTopicPage - 1)}>Föregående</Button>
                    <Button variant="secondary" disabled={currentTopicPage === lastTopicPage} onClick={() => setTopicPage(currentTopicPage + 1)}>Nästa ämnen</Button>
                  </Inline>
                </Stack>}
              </Stack>
            ) : <Text size="sm" tone="secondary">{topicQuery ? "Inga nya ämnen matchar sökningen. Prova ett annat sökord." : "Du följer alla tillgängliga ämnen."}</Text>}
          </Stack>
        </TabPanel>
        <TabPanel value="keywords">
          <Stack gap={4}>
            <SelectedChips
              label="Valda nyckelord" values={keywords} busy={busy} removeLabel="Ta bort nyckelordet"
              onRemove={(value) => {
                setKeywordError("");
                save(() => saveKeywords(keywords.filter((keyword) => keyword !== value)), "Nyckelordet har tagits bort.");
              }}
            />
            <Text size="xs" tone="secondary" numeric>{keywords.length}/{KEYWORD_LIMIT} nyckelord valda</Text>
            <Text size="sm" tone="secondary">Matchas mot rubrik och sammanfattning. Välj till exempel försvar eller vinstvarning.</Text>
            <form className={styles.keywordForm} onSubmit={addKeyword}>
              <TextField
                label="Nytt nyckelord" value={keyword} maxLength={40} error={keywordError}
                onValueChange={(value) => { setKeyword(value); setKeywordError(""); }}
                disabled={busy}
              />
              <Button type="submit" loading={busy}><FiPlus aria-hidden="true" />Lägg till</Button>
            </form>
          </Stack>
        </TabPanel>
      </Tabs>
      <Text size="xs" tone="secondary">Valen formar ditt nyhetsflöde. De aktiverar inga aviseringar.</Text>
    </Stack>
  );
}
