import StocksDirectoryPage from "../components/StocksDirectoryPage";
import { fetchCompanyDirectory, fetchCompanyList } from "../utils/api";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Aktier – sök svenska börsbolag",
    description: "Sök och bläddra bland svenska börsbolag. Öppna kurs, verksamhet, finanser och senaste bolagsnyheter på OMXsum.",
    alternates: { canonical: "/aktier" },
};

export default async function Page() {
    const companies = await fetchCompanyDirectory() ?? await fetchCompanyList() ?? [];
    return <StocksDirectoryPage companies={companies} />;
}
