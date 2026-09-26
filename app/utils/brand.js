export const BRAND_NAME = "OMXsum";
export const BRAND_VERSION = "2.0";
export const BRAND_LABEL = `${BRAND_NAME} ${BRAND_VERSION}`;
export const SITE_ICONS = {
  icon: [
    { url: "/icon.png?v=20260908-circle", type: "image/png", sizes: "32x32" },
    { url: "/favicon.svg?v=20260908-circle", type: "image/svg+xml", sizes: "any" },
  ],
  apple: [{ url: "/apple-icon.png?v=20260908-circle", type: "image/png", sizes: "180x180" }],
};
// Shared by company preview/download/metadata and dedicated news metadata.
export const CONTENT_OG_VERSION = "5";
// Version the URL when the artwork changes so social crawlers see a new asset.
// Dedicated story, article and company sharing images override this fallback.
export const SITE_OG_IMAGE = {
  url: "/og/home?v=20260907-news",
  width: 1200,
  height: 630,
  alt: "OMXsum 2.0 – Förstå vad som driver börsen. Nyheter, kursreaktioner och Morgonbrevet.",
};
export const LANDING_HEADLINE = ["Förstå börsnyheterna.", "Följ dina bolag."];
export const LANDING_DESCRIPTION =
  "Samla börsnyheterna, se aktiernas reaktioner och följ bolagen som berör dig. Börja med marknadsöversikten eller det kostnadsfria Morgonbrevet.";
