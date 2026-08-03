import Script from "next/script";
import "./app.css";
import Providers from "./providers";
import SiteChrome from "./components/SiteChrome";

export const metadata = {
  metadataBase: new URL("https://omxsum.com"),
  title: {
    default: "OMXsum - Dagliga marknadssummeringar",
    template: "%s | OMXsum",
  },
  description:
    "Dagliga marknadssummeringar och viktiga pressmeddelanden från morgonens nyheter – genererade av AI varje dag kl. 08:00. Få en snabb överblick av den svenska börsens nyheter på OMXsum.com.",
  icons: {
    icon: "/favicon-32x32.png",
  },
  openGraph: {
    title: "Omxsum",
    description: "Marknadssummeringar varje morgon 8.00 och kväll 17.30",
    url: "https://omxsum.com",
    siteName: "Omxsum",
    type: "website",
    images: ["/omxsum_og.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Omxsum",
    description: "Marknadssummeringar varje morgon 8.00 och kväll 17.30",
    images: ["/omxsum_og.jpg"],
  },
};

// Applies the stored theme before first paint to avoid a flash of the wrong theme
const themeInitScript = `
try {
  var theme = localStorage.getItem('theme');
  if (!theme) theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.classList.add(theme);
} catch (e) {}
`;

export default function RootLayout({ children }) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <body className="bg-background text-text">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Providers>
          <SiteChrome>{children}</SiteChrome>
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
