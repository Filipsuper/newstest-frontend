import { fetchAllArticles } from "./utils/api";

export const dynamic = "force-dynamic";

const parseTitleForUrl = (title = "") => title.replaceAll("-", "_").replaceAll(" ", "-");

export default async function sitemap() {
    const staticPages = [
        { url: "https://omxsum.com", changeFrequency: "daily", priority: 1 },
        { url: "https://omxsum.com/borsnyheter", changeFrequency: "daily", priority: 0.9 },
        { url: "https://omxsum.com/morgonbrevet", changeFrequency: "daily", priority: 0.9 },
        { url: "https://omxsum.com/kvallsbrevet", changeFrequency: "daily", priority: 0.9 },
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

    return [...staticPages, ...articlePages];
}
