// Indexing policy, see README.md: permanent, useful pages are open to crawlers.
// Personal, token-bearing and post-checkout pages carry nothing a searcher can
// use and stay out of the index. Company pages are decided per symbol in
// app/aktie/[symbol]/page.jsx.
export default function robots() {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/settings", "/mina-aktier", "/bevakning", "/bekrafta", "/pro/klart"],
        },
        sitemap: "https://omxsum.com/sitemap.xml",
    };
}
