import { Suspense } from "react";
import WatchFeedPage from "../../components/WatchFeedPage";
import NewsListSkeleton from "../../components/ui/NewsListSkeleton";
import { Container } from "../../components/ui/layout";
import { MarketWorkspaceNav } from "../../components/WorkspaceNav";
import styles from "../../components/workspace.module.css";

export const metadata = {
    title: "Bevakning – Marknaden",
    description: "Nyheter och marknadsreaktioner från bolagen och ämnena du följer.",
    alternates: { canonical: "/marknaden/bevakning" },
    robots: { index: false },
};

export default function Page() {
    return (
        <Suspense fallback={
            <Container as="main" className={styles.workspace}>
                <MarketWorkspaceNav foundation />
                <NewsListSkeleton />
            </Container>
        }>
            <WatchFeedPage />
        </Suspense>
    );
}
