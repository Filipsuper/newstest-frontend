import { Suspense } from "react";
import AccountOnboarding from "../components/AccountOnboarding";
import { Container, Text } from "../components/ui/layout";

export const metadata = {
  title: "Kom igång med OMXsum", robots: { index: false, follow: false }, referrer: "no-referrer",
};

export default function Page() {
  return <Suspense fallback={<Container as="main" reading><Text role="status">Laddar…</Text></Container>}>
    <AccountOnboarding />
  </Suspense>;
}
