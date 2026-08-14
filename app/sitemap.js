import { fetchAllArticles } from "./utils/api";

export const dynamic = "force-dynamic";

const parseTitleForUrl = (title = "") => title.replaceAll("-", "_").replaceAll(" ", "-");

export default async function sitemap() {
    const staticPages = [
        { url: "https://omxsum.com", changeFrequency: "daily", priority: 1 },
        { url: "https://omxsum.com/borsnyheter", changeFrequency: "daily", priority: 0.9 },
        { url: "https://omxsum.com/morgonbrevet", changeFrequency: "daily", priority: 0.9 },
        { url: "https://omxsum.com/kvallsbrevet", changeFrequency: "daily", priority: 0.9 },
        { url: "https://omxsum.com/marknadsnyheter", changeFrequency: "daily", priority: 0.9 },
        { url: "https://omxsum.com/screener", changeFrequency: "daily", priority: 0.8 },
        { url: "https://omxsum.com/terminal", changeFrequency: "weekly", priority: 0.7 },
        { url: "https://omxsum.com/pro", changeFrequency: "monthly", priority: 0.6 },
        { url: "https://omxsum.com/om-oss", changeFrequency: "monthly", priority: 0.5 },
    ];

    let articlePages = [];
    try {
        const articles = await fetchAllArticles();
        if (Array.isArray(articles)) {
            articlePages = articles.map((article) => ({
                url: `https://omxsum.com/article/${parseTitleForUrl(article.title)}`,
                lastModified: article.createdAt,
                changeFrequency: "never",
                priority: 0.7,
            }));
        }
    } catch (error) {
        // API unavailable — serve the static entries only
    }

    // Every tracked company has a public overview page. The listing is the same
    // source the page uses to decide indexability, so the sitemap and the
    // per-page robots directive can never disagree (see README.md).
    let companyPages = [];
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/feed/companies`, {
            next: { revalidate: 3600 },
        });
        const companies = response.ok ? await response.json() : [];
        if (Array.isArray(companies)) {
            companyPages = companies
                .filter((company) => company?.symbol)
                .map((company) => ({
                    url: `https://omxsum.com/aktie/${encodeURIComponent(company.symbol)}`,
                    changeFrequency: "daily",
                    priority: 0.6,
                }));
        }
    } catch (error) {
        // API unavailable — the company pages are simply left out this time
    }

    return [...staticPages, ...articlePages, ...companyPages];
}
