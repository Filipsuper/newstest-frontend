"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import { useAuthContext } from "../providers/AuthProvider";
import { fetchPersonalFeed } from "../utils/api";
import { preferenceReason, storyHref } from "../utils/newsroom";
import { Heading, Inline, Text } from "./ui/layout";
import { Button } from "./ui/Button";
import { Skeleton } from "./ui/data";
import styles from "./workspace.module.css";

export default function WatchPreview() {
  const { user, isGuestUser } = useAuthContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
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
    let active = true;
    setData(null);
    if (!user || isGuestUser || !hasPreferences) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchPersonalFeed({ limit: 3 })
      .then((result) => {
        if (active) setData(result);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [key, hasPreferences, isGuestUser, retry]);
  return (
    <section className={styles.section} aria-label="Dina bevakningar">
      <Inline className={styles.between}>
        <Heading size="subsection">Dina bevakningar</Heading>
        <Link
          href="/bevakning"
          className={styles.textLink}
          aria-label="Öppna dina bevakningar"
        >
          <FiArrowRight aria-hidden="true" />
        </Link>
      </Inline>
      {!user || loading ? (
        <Skeleton />
      ) : isGuestUser || !hasPreferences ? (
        <>
          <Text size="sm" tone="secondary">
            Följ ett bolag från en nyhet. Nästa uppdatering samlas här.
          </Text>
          <Link className={styles.textLink} href="/bevakning">
            Lägg till ditt första bolag <FiArrowRight aria-hidden="true" />
          </Link>
        </>
      ) : !data || data.unavailable ? (
        <>
          <Text size="sm" role="status">
            Bevakningen kunde inte hämtas.
          </Text>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRetry((value) => value + 1)}
          >
            Försök igen
          </Button>
        </>
      ) : data.stories?.length ? (
        <div className={styles.watchRows}>
          {data.stories.slice(0, 3).map((story) => (
            <div key={story.id} className={styles.watchRow}>
              <Text size="xs" tone="secondary">
                {preferenceReason(story)}
              </Text>
              <Link href={storyHref(story.id)} scroll={false}>
                {story.headline}
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <Text size="sm" tone="secondary">
          Inga nya matchningar just nu. Dina bevakningar är sparade.
        </Text>
      )}
    </section>
  );
}
