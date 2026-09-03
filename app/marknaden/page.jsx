import { fetchAllArticles, fetchMarketOverview } from "../utils/api";
import MarketOverviewPage from "../components/MarketOverviewPage";

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
    images: ["/omxsum_og.jpg"],
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
    : {};
  const referenceTime = new Date().toISOString();
  return (
    <MarketOverviewPage
      overview={overview}
      articles={articles}
      referenceTime={referenceTime}
    />
  );
}
