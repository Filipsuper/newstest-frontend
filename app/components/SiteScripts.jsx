"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

export default function SiteScripts() {
  // The confirmation URL contains an inbox-ownership credential. No ads,
  // analytics or third-party embeds belong on this route, even after success.
  const path = usePathname();
  if (path === "/bekrafta") return null;
  return (
    <>
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
    </>
  );
}
