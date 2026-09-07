import { Container, Stack } from "../../components/ui/layout";
import { Skeleton } from "../../components/ui/data";
import styles from "../../components/company-report.module.css";

// Match the continuous report while the server resolves its data/access.
export default function Loading() {
    return <Container as="main" className={styles.report} aria-busy="true" aria-label="Laddar bolagssidan">
        <aside className={styles.sidebar} aria-hidden="true">
            <Stack gap={4}>{Array.from({ length: 9 }, (_, index) => <Skeleton key={index} style={{ height: 36 }} />)}</Stack>
        </aside>
        <div className={styles.document}>
            <Stack gap={6}>
                <Skeleton style={{ height: 40, width: "65%" }} />
                <Skeleton style={{ height: 72, width: "40%" }} />
                <Skeleton style={{ height: 44 }} />
                <Skeleton className={styles.loadingChart} />
                <Skeleton style={{ height: 32, width: "50%" }} />
                <Skeleton style={{ height: 160 }} />
            </Stack>
        </div>
    </Container>;
}
