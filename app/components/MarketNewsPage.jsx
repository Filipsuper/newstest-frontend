"use client";
import { Suspense } from "react";
import PlusPaywall from "./PlusPaywall";
import LiveNewsFeed from "./LiveNewsFeed";
import { MarketWorkspaceNav } from "./WorkspaceNav";
import { Container, Heading, Stack, Text } from "./ui/layout";
import { Skeleton } from "./ui/data";
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
            Nyheterna, källorna och kursreaktionerna.
          </Text>
        </Stack>
      </header>
      <PlusPaywall redirectTo="/marknaden/nyheter">
        <Suspense fallback={<Skeleton />}>
          <LiveNewsFeed />
        </Suspense>
      </PlusPaywall>
    </Container>
  );
}
