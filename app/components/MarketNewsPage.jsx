"use client";
import { Suspense } from "react";
import LiveNewsFeed from "./LiveNewsFeed";
import PublicNewsFeed from "./PublicNewsFeed";
import { useAuthContext } from "../providers/AuthProvider";
import { MarketWorkspaceNav } from "./WorkspaceNav";
import { Container, Heading, Stack, Text } from "./ui/layout";
import { Button } from "./ui/Button";
import { EmptyState } from "./ui/data";
import NewsListSkeleton from "./ui/NewsListSkeleton";
import styles from "./workspace.module.css";

export default function MarketNewsPage() {
  const { user, isPlusUser, accountError, refreshUser } = useAuthContext();
  return (
    <Container as="main" className={styles.workspace}>
      <MarketWorkspaceNav foundation />
      <header className={styles.heading}>
        <Stack gap={2}>
          <Heading as="h1" size="page">
            Nyhetsflödet
          </Heading>
          <Text size="sm" tone="secondary">
            Bolagsnyheter och marknadshändelser, med det senaste först.
          </Text>
        </Stack>
      </header>
      {accountError ? <EmptyState title="Kunde inte hämta ditt konto"
        description="Försök igen för att visa rätt nyhetsflöde för ditt konto."
        action={<Button onClick={refreshUser}>Försök igen</Button>} />
        : !user ? <NewsListSkeleton />
        : isPlusUser ?
        <Suspense fallback={<NewsListSkeleton />}>
          <LiveNewsFeed />
        </Suspense>
        : <PublicNewsFeed />}
    </Container>
  );
}
