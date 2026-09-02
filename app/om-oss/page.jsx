import Link from "next/link";

export const metadata = {
  title: "Om OMXsum",
  description:
    "OMXsum är Filip Karlbergs sidoprojekt för svenska börsnyheter, dagliga marknadsbrev, aktiekurser och bolagsanalys.",
  alternates: { canonical: "/om-oss" },
  openGraph: {
    title: "Om OMXsum",
    description:
      "Läs om varför OMXsum byggs och hur tjänsten samlar svenska börsnyheter, kursdata och bolagsinformation.",
    url: "https://omxsum.com/om-oss",
    siteName: "OMXsum",
    locale: "sv_SE",
    type: "website",
    images: ["/omxsum_og.jpg"],
  },
};

export default function About() {
  return (
    <main className="public-page public-page--editorial min-h-[80vh] mx-auto max-w-3xl px-4 py-10 md:py-14">
      <header className="mb-16">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-text mb-6">
          Om OMXsum
        </h1>
        <p className="text-lg md:text-xl font-serif leading-relaxed text-text-article">
          OMXsum är ett sidoprojekt som jag, Filip Karlberg, bygger vid sidan av
          mina studier. Idén är enkel: det ska gå snabbt att förstå vad som
          händer på den svenska börsen utan att behöva öppna tio olika tjänster.
        </p>
      </header>

      <section className="mb-14">
        <h2 className="text-2xl font-serif font-bold text-text mb-4">
          Ett verktyg för att förstå börsdagen
        </h2>
        <div className="space-y-4 font-sans leading-relaxed text-text-muted">
          <p>
            OMXsum samlar svenska marknadsnyheter, pressmeddelanden, rapporter,
            kursdata och bolagsinformation. Morgonbrevet ger en kort överblick
            inför handelsdagen och kvällsbrevet sammanfattar vad som faktiskt
            hände när börsen stängde.
          </p>
          <p>
            På bolagssidorna går det att följa kurser, finansiella nyckeltal,
            estimat, värdering, nyheter och kommande händelser. För den som vill
            arbeta mer aktivt finns också en {" "}
            <Link href="/screener" className="text-primary hover:underline">
              aktiescreener
            </Link>{" "}
            och en {" "}
            <Link href="/terminal" className="text-primary hover:underline">
              börsterminal
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="mb-14">
        <h2 className="text-2xl font-serif font-bold text-text mb-4">
          Så tas innehållet fram
        </h2>
        <div className="space-y-4 font-sans leading-relaxed text-text-muted">
          <p>
            Tjänsten hämtar material från bland annat bolagens pressmeddelanden,
            rapporter och andra marknadsdatakällor. Automatiska modeller hjälper
            till att sortera, analysera och sammanfatta stora mängder information
            till ett mer lättläst format.
          </p>
          <p>
            Målet är att alltid visa källa och tidpunkt nära informationen så att
            du kan kontrollera underlaget själv. Automatiska sammanfattningar kan
            innehålla fel, och innehållet på OMXsum ska inte ses som en
            rekommendation att köpa eller sälja värdepapper.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-serif font-bold text-text mb-4">
          Ett projekt som fortsätter utvecklas
        </h2>
        <div className="space-y-4 font-sans leading-relaxed text-text-muted">
          <p>
            Jag bygger OMXsum för att lära mig, lösa ett problem jag själv har
            och göra svensk börsinformation enklare att ta till sig. Nya
            funktioner utvecklas löpande och mycket av riktningen kommer från
            feedback från dem som använder sidan.
          </p>
          <p>
            Har du hittat något som inte stämmer eller har en idé om vad som
            borde byggas härnäst? Mejla gärna {" "}
            <a
              href="mailto:filipkarlberg1@gmail.com"
              className="text-primary hover:underline"
            >
              filipkarlberg1@gmail.com
            </a>
            . Du kan också börja med dagens {" "}
            <Link href="/marknadsnyheter" className="text-primary hover:underline">
              marknadsnyheter
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
