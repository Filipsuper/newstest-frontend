import { fetchAllArticles } from "./utils/api";
import HomePage from "./components/HomePage";

export const dynamic = "force-dynamic";

const title = "Svenska börsnyheter, aktiekurser och bolagsanalys";
const description =
  "Följ svenska börsnyheter, aktiekurser och över 870 bolag på Stockholmsbörsen. Läs Morgonbrevet, se kursreaktioner och hitta dagens viktigaste händelser.";

export const metadata = {
  title: { absolute: `${title} | OMXsum` },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${title} | OMXsum`,
    description,
    url: "https://omxsum.com",
    siteName: "OMXsum",
    locale: "sv_SE",
    type: "website",
    images: [{
      url: "/omxsum_og.jpg",
      width: 1200,
      height: 630,
      alt: "OMXsum – svenska börsnyheter och bolagsanalys",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | OMXsum`,
    description,
    images: ["/omxsum_og.jpg"],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://omxsum.com/#organization",
      name: "OMXsum",
      url: "https://omxsum.com",
      logo: {
        "@type": "ImageObject",
        url: "https://omxsum.com/android-chrome-512x512.png",
        width: 512,
        height: 512,
      },
      sameAs: ["https://x.com/omxsumcom"],
    },
    {
      "@type": "WebSite",
      "@id": "https://omxsum.com/#website",
      url: "https://omxsum.com",
      name: "OMXsum",
      description,
      inLanguage: "sv-SE",
      publisher: { "@id": "https://omxsum.com/#organization" },
    },
  ],
};

export default async function Page() {
  let articles = null;
  try {
    articles = await fetchAllArticles();
  } catch (error) {
    articles = null;
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <HomePage articles={articles} />
    </>
  );
}
