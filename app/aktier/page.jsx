import StocksDirectoryPage from "../components/StocksDirectoryPage";
import { fetchCompanyDirectory, fetchCompanyList, fetchMarketOverview } from "../utils/api";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Aktier – sök svenska börsbolag",
    description: "Sök och bläddra bland svenska börsbolag. Öppna kurs, verksamhet, finanser och senaste bolagsnyheter på OMXsum.",
    alternates: { canonical: "/aktier" },
};

export default async function Page() {
    const [companies, overview] = await Promise.all([
        fetchCompanyDirectory().then(async rows => rows ?? await fetchCompanyList() ?? []),
        fetchMarketOverview().catch(() => null),
    ]);
    return <StocksDirectoryPage companies={companies} overview={overview} />;
}
