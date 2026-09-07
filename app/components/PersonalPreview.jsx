"use client";

import { useEffect, useState } from "react";
import { useAuthContext } from "../providers/AuthProvider";
import { fetchPersonalFeed } from "../utils/api";
import { personalStoryToItem, preferenceReason } from "../utils/newsroom";
import NewsFeedItem from "./NewsFeedItem";
import { Button } from "./ui/Button";
import { Heading, Stack, Text } from "./ui/layout";
import { Skeleton } from "./ui/data";
import styles from "./onboarding.module.css";

export default function PersonalPreview() {
  const { user } = useAuthContext();
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const key = JSON.stringify([
    user?.email,
    user?.watchlist,
    user?.topics,
    user?.keywords,
  ]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPersonalFeed({ limit: 3 }).then((result) => {
      if (active) {
        setData(result);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [key, retry]);
  const unavailable = !data || data.unavailable || !Array.isArray(data.stories);
  return (
    <section
      className={styles.section}
      aria-labelledby="personal-preview-heading"
    >
      <Stack gap={2}>
        <Heading id="personal-preview-heading" size="subsection">
          {user?.topics?.length || user?.keywords?.length
            ? "Nyheter för dina bevakningar"
            : "Nyheter för dina bolag"}
        </Heading>
        <Text size="xs" tone="secondary">
          Senaste 48 timmarna
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
      ) : data.stories.length ? (
        <Stack gap={2}>
          {data.stories.slice(0, 3).map((story) => (
            <NewsFeedItem
              key={story.id}
              item={personalStoryToItem(story)}
              reason={preferenceReason(story)}
              summaryPreview
            />
          ))}
        </Stack>
      ) : (
        <Text size="sm" tone="secondary">
          Inga nyheter matchar dina val de senaste 48 timmarna. Dina bevakningar
          är sparade.
        </Text>
      )}
    </section>
  );
}
