import SiteScripts from "./components/SiteScripts";
import "./app.css";
import "@fontsource-variable/geist";
import "./styles/tokens.css";
import Providers from "./providers";
import SiteChrome from "./components/SiteChrome";
import { BRAND_LABEL, SITE_OG_IMAGE } from "./utils/brand";

export const metadata = {
  metadataBase: new URL("https://omxsum.com"),
  title: {
    default: "OMXsum – Svenska börsnyheter och marknadsbrev",
    template: "%s | OMXsum",
  },
  description:
    "Svenska börsnyheter, aktiekurser, bolagsanalys och dagliga marknadsbrev.",
  icons: {
    icon: "/favicon-32x32.png",
  },
  openGraph: {
    title: "OMXsum – Svenska börsnyheter och marknadsbrev",
    description: "Svenska börsnyheter, aktiekurser, bolagsanalys och dagliga marknadsbrev.",
    url: "https://omxsum.com",
    siteName: BRAND_LABEL,
    type: "website",
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "OMXsum – Svenska börsnyheter och marknadsbrev",
    description: "Svenska börsnyheter, aktiekurser, bolagsanalys och dagliga marknadsbrev.",
    images: [SITE_OG_IMAGE],
  },
};

// Applies the stored theme before first paint to avoid a flash of the wrong theme
const themeInitScript = `
try {
  var theme = localStorage.getItem('theme');
  if (!theme) theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.classList.add(theme);
  if (!window.location.pathname.match(/^\\/terminal(?:\\/|$)/)) {
    document.documentElement.classList.add('public-palette');
  }
} catch (e) {}
`;

export default function RootLayout({ children, story }) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <body className="bg-background text-text">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Providers>
          <SiteChrome>{children}</SiteChrome>
          {story}
        </Providers>
        <SiteScripts />
      </body>
    </html>
  );
}
