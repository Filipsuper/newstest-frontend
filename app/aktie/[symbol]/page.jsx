import CompanyPage from "../../components/CompanyPage";
import PlusPaywall from "../../components/PlusPaywall";
import { fetchCompanyIdentity, fetchCompanyOverview } from "../../utils/api";
import { cookies } from "next/headers";

const cleanSymbol = (value) => decodeURIComponent(value).toUpperCase();

async function loadOverview(symbol, cookieHeader = "") {
    try {
        return await fetchCompanyOverview(symbol, cookieHeader);
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }) {
    const { symbol } = await params;
    const decoded = cleanSymbol(symbol);
    const identity = await fetchCompanyIdentity(decoded).catch(() => null);
    const title = identity?.name
        ? `${identity.name} (${identity.nativeSymbol ?? decoded.replace(".ST", "")})`
        : decoded.replace(".ST", "").replaceAll("-", " ");
    const description = `Kurs, finansiell utveckling, rapportkalender och bolagsnyheter för ${title}.`;
    return {
        title,
        description,
        alternates: { canonical: `/aktie/${encodeURIComponent(decoded)}` },
        robots: { index: false, follow: true },
        openGraph: { title, description, type: "website" },
    };
}

export default async function Page({ params, searchParams }) {
    const { symbol } = await params;
    const query = await searchParams;
    const decoded = cleanSymbol(symbol);
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join("; ");
    const overview = await loadOverview(decoded, cookieHeader);
    return (
        <PlusPaywall redirectTo={`/aktie/${encodeURIComponent(decoded)}`}>
            <CompanyPage symbol={decoded} initialData={overview} initialTab={query?.tab} />
        </PlusPaywall>
    );
}
