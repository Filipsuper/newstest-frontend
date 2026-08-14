import { cache } from "react";
import CompanyPage from "../../components/CompanyPage";
import { fetchCompanyList, fetchCompanyMentions, fetchCompanyOverview } from "../../utils/api";
import { cookies } from "next/headers";

const SITE_URL = "https://omxsum.com";

const cleanSymbol = (value) => decodeURIComponent(value).toUpperCase();

const SHAREABLE_RANGES = new Set(["1d", "6m", "1y", "3y", "5y"]);
const SHARE_CARD_VERSION = "2";

const cleanMovingAverages = (value) => String(Array.isArray(value) ? value[0] : value ?? "")
    .split(",")
    .filter((item) => item === "50" || item === "200")
    .filter((item, index, values) => values.indexOf(item) === index)
    .join(",");

const requestCookieHeader = async () => (await cookies())
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

// generateMetadata and the page render in the same request, so the overview is
// fetched once and serves both the indexing decision and the page itself.
// `missing` separates "no such company" from a backend that was briefly down.
const loadOverview = cache(async (symbol, cookieHeader = "") => {
    try {
        return { data: await fetchCompanyOverview(symbol, cookieHeader), missing: false };
    } catch (error) {
        return { data: null, missing: error?.status === 404 };
    }
});

const companyTitle = (profile, symbol) => (profile?.name
    ? `${profile.name} (${profile.nativeSymbol ?? symbol.replace(".ST", "")})`
    : symbol.replace(".ST", "").replaceAll("-", " "));

// Describes the company itself, not the quote. Prices change by the minute and
// are never claimed as structured facts; identity, ticker, ISIN and profile are
// stable and source-attributed.
function companyStructuredData({ symbol, profile, title, description, generatedAt }) {
    const pageUrl = `${SITE_URL}/aktie/${encodeURIComponent(symbol)}`;
    const company = {
        "@type": "Corporation",
        "@id": `${pageUrl}#company`,
        name: profile.name ?? title,
        tickerSymbol: profile.nativeSymbol ?? symbol.replace(".ST", ""),
        ...(profile.description ? { description: profile.description } : {}),
        ...(profile.website ? { url: profile.website } : {}),
        ...(profile.isin
            ? { identifier: [{ "@type": "PropertyValue", propertyID: "ISIN", value: profile.isin }] }
            : {}),
        ...(Number.isFinite(Number(profile.employees))
            ? { numberOfEmployees: { "@type": "QuantitativeValue", value: Number(profile.employees) } }
            : {}),
    };

    return {
        "@context": "https://schema.org",
        "@graph": [
            company,
            {
                "@type": "BreadcrumbList",
                "@id": `${pageUrl}#breadcrumb`,
                itemListElement: [
                    { "@type": "ListItem", position: 1, name: "OMXsum", item: SITE_URL },
                    { "@type": "ListItem", position: 2, name: title, item: pageUrl },
                ],
            },
            {
                "@type": "WebPage",
                "@id": `${pageUrl}#webpage`,
                url: pageUrl,
                name: title,
                description,
                inLanguage: "sv-SE",
                isPartOf: { "@id": `${SITE_URL}/#website` },
                about: { "@id": `${pageUrl}#company` },
                breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
                ...(generatedAt ? { dateModified: generatedAt } : {}),
            },
        ],
    };
}

export async function generateMetadata({ params, searchParams }) {
    const { symbol } = await params;
    const query = await searchParams;
    const decoded = cleanSymbol(symbol);
    const [companies, overview] = await Promise.all([
        fetchCompanyList(),
        loadOverview(decoded, await requestCookieHeader()),
    ]);
    const listed = companies?.find((row) => row.symbol === decoded) ?? null;
    const profile = overview.data?.summary?.profile ?? null;
    // Indexing policy: a page enters the index only when it stands for a tracked
    // company we can actually describe. A symbol missing from the listing
    // (delisted, or a hand-typed URL) and a company the API reports as unknown
    // both stay out. loading.jsx makes this route stream, so the 200 status is
    // committed before render — notFound() could no longer change it — which
    // leaves noindex as the signal that still works. A listing or backend that
    // failed to answer is a transient error, not a missing company, so the page
    // stays indexable.
    const missing = (Boolean(companies) && !listed) || overview.missing;

    const title = companyTitle(profile ?? listed, decoded);
    const description = `Kurs, finansiell utveckling, rapportkalender och bolagsnyheter för ${title}.`;
    // The share card follows the period in the link, so a shared move unfurls as
    // the move that was shared. Same URL the share modal previews.
    const range = SHAREABLE_RANGES.has(query?.range) ? query.range : "1y";
    const movingAverages = cleanMovingAverages(query?.ma);
    const movingAverageQuery = movingAverages ? `&ma=${encodeURIComponent(movingAverages)}` : "";
    const image = {
        url: `/og/aktie?symbol=${encodeURIComponent(decoded)}&range=${range}${movingAverageQuery}&v=${SHARE_CARD_VERSION}`,
        width: 1200,
        height: 630,
        alt: `Kursutveckling för ${profile?.name ?? listed?.name ?? decoded}`,
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
    const [overview, mentions] = await Promise.all([
        loadOverview(decoded, await requestCookieHeader()),
        fetchCompanyMentions(decoded).catch(() => []),
    ]);
    const summary = overview.data?.summary ?? null;
    const title = companyTitle(summary?.profile, decoded);
    const structuredData = summary?.profile
        ? companyStructuredData({
            symbol: decoded,
            profile: summary.profile,
            title,
            description: `Kurs, finansiell utveckling, rapportkalender och bolagsnyheter för ${title}.`,
            generatedAt: overview.data?.generatedAt,
        })
        : null;

    return (
        <>
            {structuredData && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
                    }}
                />
            )}
            <CompanyPage
                symbol={decoded}
                initialData={overview.data}
                initialTab={query?.tab}
                initialRange={query?.range}
                initialMovingAverages={cleanMovingAverages(query?.ma)}
                mentions={mentions}
            />
        </>
    );
}
