import WatchlistPage from "../../../components/WatchlistPage";

export const metadata = {
    title: "Hantera bevakning – Marknaden",
    alternates: { canonical: "/marknaden/bevakning/hantera" },
    robots: { index: false },
};

export default function Page() {
    return <WatchlistPage />;
}
