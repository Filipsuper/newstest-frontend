import WatchlistPage from "../../../components/WatchlistPage";

export const metadata = {
    title: "Hantera bevakning – Marknaden",
    alternates: { canonical: "/marknaden/bevakning/hantera" },
    robots: { index: false },
};

export default async function Page({ searchParams }) {
    const params = await searchParams;
    return <WatchlistPage initialSection={params?.section === "email" ? "email" : undefined} />;
}
