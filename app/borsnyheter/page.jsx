import Link from "next/link";
import dayjs from "dayjs";
import EmailInput from "../components/EmailInput";
import { fetchAllArticles } from "../utils/api";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Börsnyheter idag – Stockholmsbörsen sammanfattad på 3 minuter",
    description:
        "AI-sammanfattade börsnyheter från Stockholmsbörsen varje vardag. Morgonbrev kl. 08:00 med dagens viktigaste marknadshändelser och kvällssammanfattning kl. 17:30. Läs dagens börssammanfattning gratis.",
    alternates: { canonical: "/borsnyheter" },
};

export default async function Page() {
    let articles = [];
    try {
        articles = (await fetchAllArticles()) ?? [];
    } catch {
        articles = [];
    }

    return (
        <main className="min-h-[80vh] mx-auto max-w-3xl px-4 py-12">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-text mb-4 leading-tight">
                Börsnyheter idag – Stockholmsbörsen sammanfattad
            </h1>
            <p className="text-text-article font-sans leading-relaxed mb-10">
                OMXsum sammanfattar börsen idag på tre minuter. Varje vardag går vi igenom
                nyhetsflödet från Stockholmsbörsen – rapporter, pressmeddelanden, ordrar och
                insynshandel – och sammanfattar det som faktiskt rör marknaden till en kort,
                läsbar börssammanfattning. Helt gratis.
            </p>

            <section className="mb-12">
                <h2 className="text-2xl font-serif font-bold text-text mb-3">
                    Två sammanfattningar varje börsdag
                </h2>
                <div className="font-sans text-text-article leading-relaxed flex flex-col gap-4">
                    <p>
                        <strong className="text-text">Morgonbrevet kl. 08:00</strong> – dagens
                        viktigaste börsnyheter innan Stockholmsbörsen öppnar: marknadssentiment,
                        rapporter att bevaka, viktiga pressmeddelanden och hur terminerna pekar.
                        Skickas till din inkorg och publiceras på{" "}
                        <Link href="/morgonbrevet" className="text-primary hover:underline">omxsum.com/morgonbrevet</Link>.
                    </p>
                    <p>
                        <strong className="text-text">Kvällssammanfattningen kl. 17:30</strong> – hur
                        börsen gick idag: dagens vinnare och förlorare, nyheterna som rörde kurserna
                        och vad som väntar imorgon. Läses på{" "}
                        <Link href="/kvallsbrevet" className="text-primary hover:underline">omxsum.com/kvallsbrevet</Link>.
                    </p>
                </div>
            </section>

            <section className="mb-12">
                <h2 className="text-2xl font-serif font-bold text-text mb-3">För vem?</h2>
                <p className="font-sans text-text-article leading-relaxed">
                    För dig som vill hålla koll på svenska börsen utan att scrolla nyhetsflöden
                    hela dagen. Sammanfattningarna skrivs av AI utifrån OMXsums egen
                    nyhetsbevakning av Stockholmsbörsen och granskas mot kursdata – så att du ser
                    inte bara vad som hänt, utan hur marknaden reagerade.
                </p>
            </section>

            <section className="mb-12">
                <h2 className="text-2xl font-serif font-bold text-text mb-4">
                    Få börsnyheterna till din inkorg
                </h2>
                <EmailInput />
            </section>

            {articles.length > 0 && (
                <section className="mb-12">
                    <h2 className="text-2xl font-serif font-bold text-text mb-4">
                        Senaste börssammanfattningarna
                    </h2>
                    <ul className="flex flex-col gap-3 font-sans">
                        {articles.slice(0, 6).map((article) => (
                            <li key={article.title}>
                                <Link
                                    href={`/article/${encodeURIComponent(article.title.replaceAll("-", "_").replaceAll(" ", "-"))}`}
                                    className="group"
                                >
                                    <span className="text-xs text-text-muted">
                                        {dayjs(article.createdAt).format("D MMM YYYY")} · {article.isEveningLetter ? "Kvällsbrev" : "Morgonbrev"}
                                    </span>
                                    <br />
                                    <span className="font-serif font-bold italic text-text group-hover:underline">
                                        {article.title}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section>
                <h2 className="text-2xl font-serif font-bold text-text mb-3">Mer än sammanfattningar</h2>
                <p className="font-sans text-text-article leading-relaxed">
                    Vill du följa börsnyheterna live? <Link href="/marknadsnyheter" className="text-primary hover:underline">Marknadsnyheter</Link>{" "}
                    visar pressmeddelanden och insynshandel i realtid med kursreaktioner, och varje
                    aktie har en egen översikt med kurs, finanser och nyheter.
                </p>
            </section>
        </main>
    );
}
