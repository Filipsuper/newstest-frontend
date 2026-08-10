import CompanyPage from "../../components/CompanyPage";
import { fetchCompanyList, fetchCompanyMentions, fetchCompanyOverview } from "../../utils/api";
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
    const companies = await fetchCompanyList();
    const identity = companies?.find((row) => row.symbol === decoded) ?? null;
    // A symbol missing from the listing (delisted, or a hand-typed URL) must not
    // enter the index. loading.jsx makes this route stream, so the 200 status is
    // committed before render — notFound() could no longer change it — which
    // leaves noindex as the signal that still works. A listing that failed to
    // load is a transient error, not a missing company, so it stays indexable.
    const missing = Boolean(companies) && !identity;

    const title = identity?.name
        ? `${identity.name} (${identity.nativeSymbol ?? decoded.replace(".ST", "")})`
        : decoded.replace(".ST", "").replaceAll("-", " ");
    const description = `Kurs, finansiell utveckling, rapportkalender och bolagsnyheter för ${title}.`;
    return {
        title,
        description,
        alternates: { canonical: `/aktie/${encodeURIComponent(decoded)}` },
        openGraph: { title, description, type: "website" },
        ...(missing ? { robots: { index: false, follow: false } } : {}),
    };
}

export default async function Page({ params, searchParams }) {
    const { symbol } = await params;
    const query = await searchParams;
    const decoded = cleanSymbol(symbol);
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join("; ");
    const [overview, mentions] = await Promise.all([
        loadOverview(decoded, cookieHeader),
        fetchCompanyMentions(decoded).catch(() => []),
    ]);
    return <CompanyPage symbol={decoded} initialData={overview} initialTab={query?.tab} mentions={mentions} />;
}
