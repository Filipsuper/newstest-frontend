import HomePage from "../components/HomePage";
import { fetchAllArticles } from "../utils/api";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Morgonbrevet och Kvällsbrevet",
    description: "Läs OMXsums kostnadsfria morgon- och kvällsbrev med dagens viktigaste svenska börsnyheter och kursreaktioner.",
    alternates: { canonical: "/nyhetsbrev" },
};

export default async function Page() {
    let articles = [];
    try {
        const response = await fetchAllArticles();
        articles = Array.isArray(response) ? response : [];
    } catch {
        articles = [];
    }
    return <HomePage articles={articles} />;
}
