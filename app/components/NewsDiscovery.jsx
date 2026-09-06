import Link from "next/link";
import { Heading, Stack, Text, Inline } from "./ui/layout";
import { Button } from "./ui/Button";
import NewsFeedItem from "./NewsFeedItem";
import { featuredNews } from "../utils/newsroom";
import { storyToItem } from "../utils/storyToItem";
import styles from "./workspace.module.css";

export default function NewsDiscovery({ overview }) {
  const raw = Array.isArray(overview?.news)
    ? overview.news
    : (overview?.news?.items ?? []);
  const items = featuredNews(
    raw.filter((story) => story?.id && story?.headline).map(storyToItem),
    new Date(overview?.generatedAt || 0).getTime(),
    3,
  );
  return (
    <Stack gap={4} className={styles.section}>
      <Inline className={styles.between}>
        <Heading size="subsection">Bolag i nyhetsurvalet</Heading>
        <Button
          variant="secondary"
          nativeButton={false}
          render={<Link href="/aktier/screener" />}
        >
          Öppna screenern ↗
        </Button>
      </Inline>
      {items.length ? (
        <div className={styles.news}>
          {items.map((item) => (
            <NewsFeedItem key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <Text size="sm" tone="secondary">
          Inga större bolagshändelser i urvalet just nu.
        </Text>
      )}
      <Inline>
        <Link
          className={styles.textLink}
          href="/marknaden/nyheter?view=reactions"
        >
          Utforska kursreaktioner →
        </Link>
        <Link
          className={styles.textLink}
          href="/marknaden/nyheter?category=reports"
        >
          Senaste rapportnyheterna →
        </Link>
      </Inline>
    </Stack>
  );
}
