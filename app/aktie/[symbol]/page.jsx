import CompanyPage from "../../components/CompanyPage";
import { fetchCompanyList, fetchCompanyMentions, fetchCompanyOverview } from "../../utils/api";
import { cookies } from "next/headers";

const cleanSymbol = (value) => decodeURIComponent(value).toUpperCase();

const SHAREABLE_RANGES = new Set(["6m", "1y", "3y", "5y"]);

const cleanMovingAverages = (value) => String(Array.isArray(value) ? value[0] : value ?? "")
    .split(",")
    .filter((item) => item === "50" || item === "200")
    .filter((item, index, values) => values.indexOf(item) === index)
    .join(",");

async function loadOverview(symbol, cookieHeader = "") {
    try {
        return await fetchCompanyOverview(symbol, cookieHeader);
    } catch {
        return null;
    }
}

export async function generateMetadata({ params, searchParams }) {
    const { symbol } = await params;
    const query = await searchParams;
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
    // The share card follows the period in the link, so a shared move unfurls as
    // the move that was shared. Same URL the share modal previews.
    const range = SHAREABLE_RANGES.has(query?.range) ? query.range : "1y";
    const movingAverages = cleanMovingAverages(query?.ma);
    const movingAverageQuery = movingAverages ? `&ma=${encodeURIComponent(movingAverages)}` : "";
    const image = {
        url: `/og/aktie?symbol=${encodeURIComponent(decoded)}&range=${range}${movingAverageQuery}`,
        width: 1200,
        height: 630,
        alt: `Kursutveckling för ${identity?.name ?? decoded}`,
    };

    return {
        title,
        description,
        alternates: { canonical: `/aktie/${encodeURIComponent(decoded)}` },
        openGraph: { title, description, type: "website", images: [image] },
        twitter: { card: "summary_large_image", title, description, images: [image] },
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
    return (
        <CompanyPage
            symbol={decoded}
            initialData={overview}
            initialTab={query?.tab}
            initialRange={query?.range}
            initialMovingAverages={cleanMovingAverages(query?.ma)}
            mentions={mentions}
        />
    );
}
