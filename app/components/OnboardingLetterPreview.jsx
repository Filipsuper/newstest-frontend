"use client";

import { useEffect, useState } from "react";
import { fetchAllArticles } from "../utils/api";
import { landingLetter } from "../utils/landing";
import { letterDate } from "../utils/editorial";
import { letterExcerpt } from "../utils/letters";
import { Label } from "./ui/Label";
import { Skeleton } from "./ui/data";
import { Heading, Inline, Stack, Surface, Text } from "./ui/layout";
import styles from "./onboarding.module.css";

export default function OnboardingLetterPreview() {
  const [result, setResult] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    fetchAllArticles({ signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) })
      .then(articles => {
        if (!controller.signal.aborted) setResult(landingLetter(Array.isArray(articles)
          ? articles.filter(article => article && !article.isEveningLetter) : null, new Date()));
      }).catch(() => { if (!controller.signal.aborted) setResult({ status: "unavailable" }); });
    return () => controller.abort();
  }, []);
  if (!result) return <Stack gap={2} role="status" aria-label="Hämtar brevförhandsvisning"><Skeleton /><Text size="xs" tone="secondary">Hämtar senaste brevet…</Text></Stack>;
  if (result.status !== "ready") return <Text size="sm" tone="secondary">{result.status === "empty"
    ? "Första brevet visas här när det har publicerats."
    : "Förhandsvisningen kunde inte hämtas. Du kan fortfarande välja Morgonbrevet."}</Text>;
  const article = result.article;
  return <Surface as="article" className={styles.notice} aria-label="Senast publicerade Morgonbrevet">
    <Stack gap={3}>
      <Inline gap={2}><Label>Morgonbrevet</Label><Text as="time" size="xs" tone="secondary" dateTime={article.createdAt}>{letterDate(article.createdAt)}</Text></Inline>
      <Heading size="subsection">{article.title}</Heading>
      {letterExcerpt(article, 160) && <Text size="sm" tone="secondary">{letterExcerpt(article, 160)}</Text>}
      <Text size="xs" tone="secondary">Senast publicerade brevet</Text>
    </Stack>
  </Surface>;
}
