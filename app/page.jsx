import { Suspense } from "react";
import HomePage from "./components/HomePage";
import {
  LandingLetterPreview,
  LandingNewsPreview,
  LandingPreviewLoading,
} from "./components/LandingPreviews";
import { BRAND_LABEL, LANDING_DESCRIPTION, SITE_OG_IMAGE } from "./utils/brand";

export const dynamic = "force-dynamic";

const title = `${BRAND_LABEL} – Börsnyheter med sammanhang`;
const description = LANDING_DESCRIPTION;

export const metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    url: "https://omxsum.com",
    siteName: BRAND_LABEL,
    locale: "sv_SE",
    type: "website",
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [SITE_OG_IMAGE],
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
      name: BRAND_LABEL,
      alternateName: "OMXsum",
      description,
      inLanguage: "sv-SE",
      publisher: { "@id": "https://omxsum.com/#organization" },
    },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <HomePage
        newsPreview={
          <Suspense fallback={<LandingPreviewLoading type="nyheter" />}>
            <LandingNewsPreview />
          </Suspense>
        }
        letterPreview={
          <Suspense fallback={<LandingPreviewLoading type="brevet" />}>
            <LandingLetterPreview />
          </Suspense>
        }
      />
    </>
  );
}
