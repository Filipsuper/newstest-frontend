import { fetchAllArticles, fetchMarketOverview } from "../utils/api";
import MarketOverviewPage from "../components/MarketOverviewPage";
import { SITE_OG_IMAGE } from "../utils/brand";

export const dynamic = "force-dynamic";

const title = "Marknaden idag";
const description =
  "Se nyheterna som driver Stockholmsbörsen, vilka aktier som rör sig och hur marknaden reagerar idag.";

export const metadata = {
  title,
  description,
  alternates: { canonical: "/marknaden" },
  openGraph: {
    title: `${title} | OMXsum`,
    description,
    url: "https://omxsum.com/marknaden",
    siteName: "OMXsum",
    locale: "sv_SE",
    type: "website",
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | OMXsum`,
    description,
    images: [SITE_OG_IMAGE],
  },
};

export default async function MarketPage() {
  const [articlesResult, overviewResult] = await Promise.allSettled([
    fetchAllArticles(),
    fetchMarketOverview(),
  ]);

  const articles = articlesResult.status === "fulfilled" && Array.isArray(articlesResult.value)
    ? articlesResult.value
    : [];
  const overview = overviewResult.status === "fulfilled" && overviewResult.value
    ? { ...overviewResult.value }
    : { unavailable: true };
  const referenceTime = new Date().toISOString();
  return (
    <MarketOverviewPage
      overview={overview}
      articles={articles}
      referenceTime={referenceTime}
    />
  );
}
