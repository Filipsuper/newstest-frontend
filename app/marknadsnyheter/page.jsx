import MarketNewsPage from "../components/MarketNewsPage";

export const metadata = {
    title: "Marknadsnyheter",
    description:
        "Live-nyhetsflöde från Stockholmsbörsen – pressmeddelanden, insynshandel och marknadshändelser i realtid.",
};

export default function Page() {
    return <MarketNewsPage />;
}
