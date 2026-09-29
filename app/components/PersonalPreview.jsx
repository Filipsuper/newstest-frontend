"use client";

import { useEffect, useState } from "react";
import { useAuthContext } from "../providers/AuthProvider";
import { fetchPersonalFeed } from "../utils/api";
import { personalStoryToItem, preferenceReason } from "../utils/newsroom";
import { onboardingPreview } from "../utils/onboarding";
import NewsFeedItem from "./NewsFeedItem";
import { Button } from "./ui/Button";
import { Heading, Stack, Text } from "./ui/layout";
import { Skeleton } from "./ui/data";
import styles from "./onboarding.module.css";

export default function PersonalPreview({ companyOnly = false, limit = 3, compact = false }) {
  const { user } = useAuthContext();
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const key = JSON.stringify([
    user?.email,
    user?.watchlist,
    user?.topics,
    user?.keywords,
    user?.excludedKeywords,
  ]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const controller = new AbortController();
    fetchPersonalFeed({ limit, filter: companyOnly ? "companies" : "all", signal: controller.signal }).then((result) => {
      if (active) {
        setData(result);
        setLoading(false);
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [key, retry, companyOnly, limit]);
  const unavailable = !data || data.unavailable || !Array.isArray(data.stories);
  const preview = onboardingPreview(data, { companySymbols: companyOnly ? user?.watchlist || [] : undefined, limit });
  const stories = preview.stories;
  return (
    <section
      className={styles.section}
      aria-labelledby="personal-preview-heading"
    >
      <Stack gap={2}>
        <Heading id="personal-preview-heading" size="subsection">
          {compact ? "Det här får du i Mina bolag" : preview.important ? "Viktigt för dina bolag" : user?.topics?.length || user?.keywords?.length
            ? "Nyheter för dina bevakningar"
            : "Nyheter för dina bolag"}
        </Heading>
        <Text size="xs" tone="secondary">
          {loading ? "Hämtar senaste nyheterna…" : preview.period}
        </Text>
      </Stack>
      {loading ? (
        <Skeleton />
      ) : unavailable ? (
        <Stack gap={3} className={styles.notice}>
          <Text size="sm" role="status">
            Nyheterna kunde inte hämtas. Dina bevakningar är sparade.
          </Text>
          <Button
            variant="secondary"
            onClick={() => setRetry((value) => value + 1)}
          >
            Försök igen
          </Button>
        </Stack>
      ) : stories.length ? (
        <Stack gap={2}>
          {stories.map((story) => (
            <NewsFeedItem
              key={story.id}
              item={personalStoryToItem(story)}
              reason={preferenceReason(story)}
              summaryPreview={!compact && preview.important}
              showSummary={!compact}
              compact={compact}
            />
          ))}
          <Text size="xs" tone="secondary">Ett urval. {preview.complete ? "Se fler nyheter i Mina bolag." : "Underlaget täcker inte säkert hela perioden. Se Mina bolag för fler nyheter."}</Text>
        </Stack>
      ) : (
        <Text size="sm" tone="secondary">
          {preview.complete ? "Inga nyheter matchar dina val i den här perioden." : "Inga matchningar i det hämtade urvalet. Hela perioden kunde inte kontrolleras."} Dina bolag är sparade.
        </Text>
      )}
    </section>
  );
}
