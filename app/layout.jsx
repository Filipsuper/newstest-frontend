import Script from "next/script";
import "./app.css";
import "@fontsource-variable/geist";
import "./styles/tokens.css";
import Providers from "./providers";
import SiteChrome from "./components/SiteChrome";

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
    siteName: "Omxsum",
    type: "website",
    images: ["/omxsum_og.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "OMXsum – Svenska börsnyheter och marknadsbrev",
    description: "Svenska börsnyheter, aktiekurser, bolagsanalys och dagliga marknadsbrev.",
    images: ["/omxsum_og.jpg"],
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
        <Script
          src="https://getmegadesk.com/embed.js"
          data-pub="699e1bc8dfc30ef3ddbe9d5f"
          strategy="afterInteractive"
        />
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7447242940993455"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <Script
          src="https://scripts.simpleanalyticscdn.com/latest.js"
          strategy="afterInteractive"
        />
        <Script
          src="https://unhidden.so/seo.js"
          data-website-id="6a709a29c77f9ae189bae849"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
