"use client";

import Link from "next/link";
import { WatchWorkspaceNav } from "./WorkspaceNav";
import WatchPreferencesEditor from "./WatchPreferencesEditor";
import { Container, Heading } from "./ui/layout";
import styles from "./workspace.module.css";
import preferences from "./watch-preferences.module.css";

export default function WatchlistPage() {
  return (
    <Container as="main" className={styles.workspace}>
      <WatchWorkspaceNav />
      <header className={styles.heading}>
        <Heading as="h1" size="page">Hantera bevakning</Heading>
        <Link className={styles.textLink} href="/marknaden/bevakning">
          Till din bevakning →
        </Link>
      </header>
      <div className={preferences.pageEditor}>
        <WatchPreferencesEditor />
      </div>
    </Container>
  );
}
