import { Suspense } from "react";
import ConfirmSubscriptionPage from "../components/ConfirmSubscriptionPage";

export const metadata = {
    title: "Bekräfta prenumeration",
    robots: { index: false },
};

export default function Page() {
    return (
        <Suspense fallback={<main className="min-h-[60vh] flex items-center justify-center text-text-muted">Laddar…</main>}>
            <ConfirmSubscriptionPage />
        </Suspense>
    );
}
