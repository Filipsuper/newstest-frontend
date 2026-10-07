import { fetchAllArticles, fetchMarketOverview } from "../utils/api";
import LandingScreenerPreview from './LandingScreenerPreview';
import { landingLetter, landingNews } from "../utils/landing";
import NewsFeedItem from "./NewsFeedItem";
import LetterCard from "./LetterCard";
import { LandingRetry } from "./LandingActions";
import { EmptyState, Skeleton } from "./ui/data";
import { Stack, Text } from "./ui/layout";
import styles from "./landing.module.css";

export function LandingScreenerSample() {
  return <LandingScreenerPreview />;
}

export function LandingPreviewLoading({ type }) {
  return (
    <Stack gap={3} aria-busy="true" role="status" aria-label={`Hämtar ${type}`}>
      <Skeleton className={styles.previewSkeleton} />
      <Text size="xs" tone="secondary">
        Hämtar {type}…
      </Text>
    </Stack>
  );
}

export async function LandingNewsPreview() {
  let result;
  try {
    result = landingNews(
      await fetchMarketOverview({ signal: AbortSignal.timeout(8000) }),
      new Date(),
    );
  } catch {
    result = { status: "unavailable", stories: [] };
  }
  if (result.status !== "ready")
    return (
      <EmptyState
        title={
          result.status === "empty"
            ? "Inga aktuella nyheter i urvalet"
            : "Nyhetsurvalet kunde inte hämtas"
        }
        description="Du kan fortfarande utforska sajten och läsa breven."
        action={result.status === "unavailable" ? <LandingRetry /> : null}
      />
    );
  return (
    <div className={styles.newsGrid}>
      {result.stories.map((item) => (
        <NewsFeedItem key={item.id} item={item} summaryPreview variant="editorial" />
      ))}
      <Text size="xs" tone="secondary" className={styles.newsNote}>
        {result.stale
          ? "Senaste tillgängliga urval · tillfälligt fördröjt. "
          : "Ur Marknadens nyhetsurval. "}
        Källor och mätperiod finns i nyheten.
      </Text>
    </div>
  );
}

export async function LandingLetterPreview() {
  let result;
  try {
    result = landingLetter(
      await fetchAllArticles({ signal: AbortSignal.timeout(8000) }),
      new Date(),
    );
  } catch {
    result = { status: "unavailable" };
  }
  if (result.status !== "ready")
    return (
      <EmptyState
        title={
          result.status === "empty"
            ? "Inget publicerat brev att visa ännu"
            : "Brevet kunde inte hämtas"
        }
        description="Du kan fortfarande anmäla dig till Morgonbrevet."
        action={result.status === "unavailable" ? <LandingRetry /> : null}
      />
    );
  return <LetterCard article={result.article} />;
}
