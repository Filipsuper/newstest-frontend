"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FiChevronDown, FiPlus, FiX } from "react-icons/fi";
import { useAuthContext } from "../providers/AuthProvider";
import { TOPIC_LABELS } from "../utils/topicLabels";
import { onboardingTopicOptions, ONBOARDING_TOPIC_LIMIT, requestOnboardingTopics } from "../utils/onboardingTopics";
import { Button, IconButton } from "./ui/Button";
import { TextField } from "./ui/TextField";
import { Inline, Stack, Text } from "./ui/layout";
import { Skeleton } from "./ui/data";
import styles from "./onboarding.module.css";

const PAGE_SIZE = 6;

export default function OnboardingTopics({ onBusyChange, disabled = false }) {
  const { user, refreshUser } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [vocabulary, setVocabulary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  const regionId = useId();
  const topics = user?.topics || [];
  const results = onboardingTopicOptions(vocabulary, topics, query);
  const lastPage = Math.max(0, Math.ceil(results.length / PAGE_SIZE) - 1);
  const currentPage = Math.min(page, lastPage);

  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  useEffect(() => {
    if (!open || vocabulary) return;
    const controller = new AbortController();
    setLoading(true); setLoadError("");
    requestOnboardingTopics({ signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) setVocabulary(value);
    }).catch(() => {
      if (!controller.signal.aborted) setLoadError("Ämnena kunde inte hämtas.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, vocabulary, retry]);

  async function toggle(value, followed) {
    if (disabled || pending.current || (followed && (topics.includes(value) || topics.length >= ONBOARDING_TOPIC_LIMIT))) return;
    pending.current = true; setBusy(true); setError(""); setMessage("");
    try {
      // Preserve selected IDs missing from today's vocabulary on unrelated edits.
      await requestOnboardingTopics({ topics: followed ? [...topics, value] : topics.filter(topic => topic !== value) });
      if (!(await refreshUser())?.email) throw new Error("Ämnet är sparat, men kontot kunde inte uppdateras. Hämta kontot igen.");
      if (followed) { setQuery(""); setPage(0); }
      setMessage(followed ? "Ämnet är sparat." : "Ämnet har tagits bort.");
    } catch (failure) { setError(failure.message || "Ämnet kunde inte sparas. Försök igen."); }
    finally { pending.current = false; setBusy(false); }
  }

  return <Stack gap={3}>
    <Inline><Button variant="ghost" aria-expanded={open} aria-controls={regionId}
      onClick={() => setOpen(value => !value)}>
      <FiChevronDown aria-hidden="true" className={open ? styles.expanded : undefined} />
      Följ även ämnen{topics.length ? ` · ${topics.length} valda` : " · valfritt"}
    </Button></Inline>
    <Stack id={regionId} className={styles.topicsPanel} hidden={!open} gap={3}>
      <Text size="xs" tone="secondary">Bredda ditt nyhetsurval. Bolagsmejl gäller bara dina följda bolag.</Text>
      {topics.length > 0 && <Inline as="ul" className={styles.topicChips} aria-label="Valda ämnen">
        {topics.map(value => <li className={styles.topicChip} key={value}>
          <Text as="span" size="sm">{TOPIC_LABELS[value] || value}</Text>
          <IconButton label={`Ta bort ämnet ${TOPIC_LABELS[value] || value}`} disabled={disabled || busy} onClick={() => toggle(value, false)}><FiX aria-hidden="true" /></IconButton>
        </li>)}
      </Inline>}
      {loading ? <Stack role="status" gap={2}><Text size="sm">Hämtar ämnen…</Text><Skeleton /></Stack>
        : loadError ? <Stack gap={2}><Text role="alert" size="sm">{loadError}</Text><Inline><Button variant="secondary" onClick={() => setRetry(value => value + 1)}>Hämta ämnen igen</Button></Inline></Stack>
          : vocabulary && <Stack gap={3}>
            <TextField label="Sök ämnen" placeholder="Till exempel teknik eller rapporter" value={query}
              disabled={disabled || busy} onValueChange={value => { setQuery(value); setPage(0); }} />
            {topics.length >= ONBOARDING_TOPIC_LIMIT ? <Text size="sm" tone="secondary">Du har valt 10 ämnen. Ta bort ett för att byta.</Text>
              : <Inline gap={2}>
                {results.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map(value =>
                  <Button key={value} variant="secondary" disabled={disabled || busy} onClick={() => toggle(value, true)}
                    aria-label={`Följ ämnet ${TOPIC_LABELS[value] || value}`}><FiPlus aria-hidden="true" />{TOPIC_LABELS[value] || value}</Button>)}
                {!results.length && <Text size="sm" tone="secondary">Inga fler ämnen matchar.</Text>}
              </Inline>}
            {lastPage > 0 && topics.length < ONBOARDING_TOPIC_LIMIT && <Inline gap={2}>
              <Button variant="ghost" disabled={busy || currentPage === 0} onClick={() => setPage(currentPage - 1)}>Föregående ämnen</Button>
              <Text size="xs" tone="secondary">{currentPage + 1}/{lastPage + 1}</Text>
              <Button variant="ghost" disabled={busy || currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Fler ämnen</Button>
            </Inline>}
          </Stack>}
      {busy && <Text size="xs" role="status">Sparar ämne…</Text>}
      {error && <Text size="sm" role="alert">{error}</Text>}
      {message && <Text size="xs" role="status">{message}</Text>}
    </Stack>
  </Stack>;
}
