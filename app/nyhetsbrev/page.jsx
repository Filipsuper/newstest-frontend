import LetterLibrary from "../components/LetterLibrary";
import { fetchAllArticles } from "../utils/api";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Morgonbrevet och Kvällsbrevet",
    description: "Läs OMXsums kostnadsfria morgon- och kvällsbrev med dagens viktigaste svenska börsnyheter och kursreaktioner.",
    alternates: { canonical: "/nyhetsbrev" },
};

export default async function Page() {
    let articles = [];
    let unavailable = false;
    try {
        const response = await fetchAllArticles();
        articles = Array.isArray(response) ? response : [];
    } catch {
        articles = [];
        unavailable = true;
    }
    return <LetterLibrary articles={articles} unavailable={unavailable} />;
}
