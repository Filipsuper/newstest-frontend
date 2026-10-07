"use client";
import { Suspense } from "react";
import Link from 'next/link';
import PlusPaywall from "./PlusPaywall";
import LiveNewsFeed from "./LiveNewsFeed";
import { MarketWorkspaceNav } from "./WorkspaceNav";
import { Container, Heading, Stack, Text } from "./ui/layout";
import NewsListSkeleton from "./ui/NewsListSkeleton";
import styles from "./workspace.module.css";

export default function MarketNewsPage() {
  return (
    <Container as="main" className={styles.workspace}>
      <MarketWorkspaceNav foundation />
      <header className={styles.heading}>
        <Stack gap={2}>
          <Heading as="h1" size="page">
            Nyhetsflödet
          </Heading>
          <Text size="sm" tone="secondary">
            Nyheter i tidsordning. Mer bakgrund kommer i <Link href="/marknaden/stories">OMXsum Stories</Link>, som är under utveckling.
          </Text>
        </Stack>
      </header>
      <PlusPaywall redirectTo="/marknaden/nyheter">
        <Suspense fallback={<NewsListSkeleton />}>
          <LiveNewsFeed />
        </Suspense>
      </PlusPaywall>
    </Container>
  );
}
