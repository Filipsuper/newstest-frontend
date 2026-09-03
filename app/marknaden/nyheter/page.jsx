import MarketNewsPage from "../../components/MarketNewsPage";

export const metadata = {
    title: "Nyhetsflöde – Marknaden",
    description:
        "Det kompletta nyhetsflödet från Stockholmsbörsen med bolagsnyheter, rapporter, insynshandel och marknadshändelser.",
    alternates: { canonical: "/marknaden/nyheter" },
};

export default function Page() {
    return <MarketNewsPage />;
}
