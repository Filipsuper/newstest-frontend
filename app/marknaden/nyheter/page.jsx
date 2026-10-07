import MarketNewsPage from "../../components/MarketNewsPage";

export const metadata = {
    title: "Nyhetsflöde – Marknaden",
    description:
        "Läs ett öppet urval av börsens senaste bolagsnyheter. Med Plus får du hela nyhetsflödet, sökning och filter.",
    alternates: { canonical: "/marknaden/nyheter" },
};

export default function Page() {
    return <MarketNewsPage />;
}
