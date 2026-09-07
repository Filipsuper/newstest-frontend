import { Suspense } from "react";
import ConfirmSubscriptionPage from "../components/ConfirmSubscriptionPage";
import { Container, Text } from "../components/ui/layout";
import styles from "../components/onboarding.module.css";

export const metadata = {
  title: "Bekräfta prenumeration",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <Container as="main" reading className={styles.page}>
          <Text role="status">Laddar…</Text>
        </Container>
      }
    >
      <ConfirmSubscriptionPage />
    </Suspense>
  );
}
