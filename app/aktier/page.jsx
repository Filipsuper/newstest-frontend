import StocksDirectoryPage from "../components/StocksDirectoryPage";
import { fetchCompanyDirectory, fetchCompanyList, fetchCompanyNews } from "../utils/api";
import { stockFilters } from "../utils/stockDiscovery";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Aktier – sök svenska börsbolag",
    description: "Sök och bläddra bland svenska börsbolag. Öppna kurs, verksamhet, finanser och senaste bolagsnyheter på OMXsum.",
    alternates: { canonical: "/aktier" },
};

export default async function Page({ searchParams }) {
    const [directory, news, params] = await Promise.all([
        fetchCompanyDirectory(), fetchCompanyNews(), searchParams,
    ]);
    const companies = directory ?? await fetchCompanyList();
    const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, value]) => typeof value === "string"));
    return <StocksDirectoryPage companies={companies} news={news} quotesAvailable={directory !== null} initialFilters={stockFilters(query)} asOf={Date.now()} />;
}
