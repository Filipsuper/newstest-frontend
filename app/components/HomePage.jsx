"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PreviousArticle from "./PreviousArticle";
import EmailInput from "./EmailInput";
import Testimonials from "./Testimonials";
import { DemoNewsFeed } from "./LandingDemos";
import { stripSummaryMarkup } from "../utils/stripSummaryMarkup";

const formatLetterDate = (date) =>
  new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Stockholm",
  }).format(new Date(date));

const stockholmDateKey = (value) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Stockholm",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const stockholmTime = () => new Intl.DateTimeFormat("sv-SE", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Europe/Stockholm",
}).format(new Date());

const getLetterExcerpt = (article) => {
  const firstBullet = article?.bulletPoints
    ?.split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .find(Boolean);
  const excerpt = stripSummaryMarkup(
    article?.introText?.trim() || firstBullet || article?.summary || ""
  );

  if (excerpt.length <= 220) return excerpt;
  return `${excerpt.slice(0, 217).trimEnd()}…`;
};

const testimonials = [
  {
    name: "Nidalus1",
    text: "Riktigt nice, tack så mycket :)",
    source: "Reddit",
    date: "2023-10-01",
    url: "https://www.reddit.com/r/Aktiemarknaden/comments/1j3vtqt/comment/mg45t9i/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button"
  },
  {
    name: "3xc1t3r",
    text: "Snyggt och rent! Ska få med den i rotationen!",
    date: "2023-10-03",
    source: "Reddit",
    url: "https://www.reddit.com/r/Aktiemarknaden/comments/1j3vtqt/comment/mghn1ft/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button"
  },
  {
    name: "Hampsx",
    text: "Snyggt jobbat! Kommer användas",
    date: "2023-10-02",
    source: "Reddit",
    url: "https://www.reddit.com/r/Aktiemarknaden/comments/1j3vtqt/comment/mgb36w4/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button"
  },
];

export default function HomePage({ articles }) {
  const [currentTime, setCurrentTime] = useState("--:--:--")

  useEffect(() => {
    const update = () => setCurrentTime(stockholmTime());
    update();
    const timer = setInterval(update, 1000)

    return () => clearInterval(timer)
  }, [])

  if (!articles || articles.length === 0) {
    return (
      <main className="newsletter-unavailable">
        <p className="market-kicker">OMXsums nyhetsbrev</p>
        <h1>Morgonbrevet och Kvällsbrevet</h1>
        <p>Arkivet kunde inte hämtas just nu. Du kan fortfarande anmäla dig till nästa kostnadsfria utskick.</p>
        <EmailInput />
      </main>
    );
  }

  const isTodaysArticle = stockholmDateKey(articles[0].createdAt) === stockholmDateKey(new Date())
  const latestArticle = articles[0];
  const previousArticles = isTodaysArticle ? articles.slice(1) : articles;
  const latestLetterHref = latestArticle.isEveningLetter ? "/kvallsbrevet" : "/morgonbrevet";
  const latestLetterName = latestArticle.isEveningLetter ? "Kvällsbrevet" : "Morgonbrevet";
  const latestLetterExcerpt = getLetterExcerpt(latestArticle);

  return (
    <>
      {/* Hero — the morning letter is the product */}
      <section className="min-h-[25vh] max-w-6xl flex flex-col md:flex-row justify-between font-sans mx-auto px-4 py-8 mt-16">
        <div>
          <h2 className="text-base font-bold text-text">{currentTime}</h2>
          <h1 className="text-5xl font-serif font-bold text-text mb-4">
            Allt som rör börsen,
            <br />
            på <span className="underline">3 minuter</span>
          </h1>
          <p className="text-text-article mb-8">
            Morgonbrevet sammanfattar nyheterna som rörde marknaden –
            <br />
            och hur aktierna <span className="font-semibold">reagerade</span>. Varje vardag kl. 08.00.{" "}
            <span className="underline">Helt gratis.</span>
          </p>
          <EmailInput centered={true} />
        </div>
        <div className="flex w-full md:w-1/2 mb-4 min-h-40">
          <Link
            href={latestLetterHref}
            className="group relative flex min-h-56 w-full flex-col items-center justify-center overflow-hidden transition-colors duration-300 hover:bg-primary-dark"
          >
            <article className="fade-edges absolute inset-0 h-full px-6 py-5 md:px-8">
              <p className="mb-3 font-sans text-sm font-semibold text-primary">
                Senaste {latestLetterName.toLowerCase()} · {formatLetterDate(latestArticle.createdAt)}
              </p>
              <h2 className="mb-3 font-serif text-2xl font-bold italic leading-tight text-text">
                {latestArticle.title}
              </h2>
              {latestLetterExcerpt && (
                <p className="font-sans leading-relaxed text-text-muted">
                  {latestLetterExcerpt}
                </p>
              )}
            </article>
            <div className="relative z-10 shadow-xl">
              <span className="primary-btn extra-padding text-center">
                Läs senaste {latestLetterName.toLowerCase()}
              </span>
            </div>
          </Link>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-serif font-bold text-text mb-5">
          Vad är OMXsum?
        </h2>
        <p className="text-text-muted font-sans leading-relaxed mb-4">
          OMXsum är ett svenskt börsverktyg som samlar marknadsnyheter,
          bolagssidor, kursdata och dagliga sammanfattningar på ett ställe.
          Nyhetsbevakningen följer pressmeddelanden, rapporter och insynshandel
          från ursprungliga källor och visar hur marknaden reagerade.
        </p>
        <p className="text-text-muted font-sans leading-relaxed">
          Automatiska modeller hjälper till att sortera och sammanfatta
          materialet. Källor och tidpunkter visas där informationen används.
          OMXsum är ett informationsverktyg, inte personlig investeringsrådgivning. {" "}
          <Link href="/om-oss" className="text-primary hover:underline">
            Läs mer om projektet
          </Link>
          .
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <Testimonials testimonials={testimonials} />
      </section>

      {/* The engine — our own newswire */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-serif font-bold text-text leading-tight">
              Skrivet av vår egen nyhetsbevakning
            </h2>
            <p className="text-text-muted font-sans leading-relaxed">
              OMXsum läser varje pressmeddelande, rapport och insynsaffär på
              Stockholmsbörsen – direkt från källorna, hela dagen. Vi rankar
              det viktigaste och mäter <span className="text-text font-semibold">hur mycket aktien
              rört sig sedan varje nyhet</span>. Det är den bevakningen som skriver dina brev.
            </p>
            <p className="text-text-muted font-sans leading-relaxed">
              Vill du se flödet live? <Link href="/marknaden/nyheter" className="text-primary hover:underline">Nyhetsflödet</Link>{" "}
              visar allt i realtid – med{" "}
              <Link href="/aktie/VOLV-B.ST" className="text-primary hover:underline">aktieöversikter</Link> för
              870+ svenska aktier.
            </p>
          </div>
          <div className="relative">
            <div className="absolute -inset-8 bg-primary opacity-[0.06] blur-3xl pointer-events-none"></div>
            <div className="relative"><DemoNewsFeed /></div>
          </div>
        </div>
      </section>

      {/* Personalization — make the letter yours */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="relative order-last md:order-first">
            <div className="absolute -inset-8 bg-secondary opacity-[0.06] blur-3xl pointer-events-none"></div>
            <div className="relative bg-foreground p-6" aria-hidden="true">
              <p className="font-sans text-xs text-text-muted mb-1">Ur morgonbrevet</p>
              <p className="font-serif font-bold text-text mb-2">Min sammanfattning</p>
              <div className="flex flex-row flex-wrap gap-1.5 mb-3 font-sans text-[10px]">
                <span className="rounded-full bg-secondary/15 text-text px-2 py-0.5">★ PowerCell Sweden</span>
                <span className="rounded-full bg-secondary/15 text-text px-2 py-0.5">★ Epiroc</span>
                <span className="rounded-full bg-border/40 text-text-muted px-2 py-0.5">Small Cap</span>
                <span className="rounded-full bg-border/40 text-text-muted px-2 py-0.5">Teknik</span>
              </div>
              <div className="flex flex-col gap-3 font-sans">
                <div>
                  <p className="text-xs font-bold text-text">PowerCell Sweden <span className="market-positive">+5,4%</span></p>
                  <p className="text-sm font-serif italic text-text-article">PowerCell får order värd SEK 21 million</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-text">Epiroc A <span className="market-positive">+2,6%</span></p>
                  <p className="text-sm font-serif italic text-text-article">Epiroc slutför förvärv i Sydafrika</p>
                </div>
                <p className="text-xs text-text-muted pt-1">+ 3 fler nyheter som matchar dina val</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-serif font-bold text-text leading-tight">
              Gör brevet till ditt
            </h2>
            <p className="text-text-muted font-sans leading-relaxed">
              Stjärnmärk dina bolag och följ ämnen som{" "}
              <span className="text-text font-semibold">Small Cap</span> eller{" "}
              <span className="text-text font-semibold">Hälsovård</span> – helt gratis.
              Ditt morgonbrev får en egen sektion, <span className="text-text font-semibold">Min
              sammanfattning</span>, med nyheterna som matchar dina val och hur
              aktierna reagerade.
            </p>
            <p className="text-text-muted font-sans text-sm mt-2">
              Hela din sammanfattning med Plus från 49 kr/mån ·{" "}
              <Link href="/pro" className="underline hover:text-text">Se planerna</Link>
            </p>
          </div>
        </div>
      </section>

      {/* Social proof */}

      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_2fr] md:gap-16">
          <div>
            <h2 className="text-3xl font-serif font-bold text-text mb-4">
              Utforska OMXsum
            </h2>
            <p className="font-sans leading-relaxed text-text-muted">
              Gå direkt till nyhetsflödet, breven eller verktygen för svenska
              börsbolag.
            </p>
          </div>
          <div>
            <nav
              aria-label="Utforska OMXsum"
              className="grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-2"
            >
              <Link href="/marknaden/nyheter" className="group">
                <span className="block font-serif text-xl font-bold text-text group-hover:underline">
                  Marknadsnyheter
                </span>
                <span className="mt-1 block font-sans text-sm leading-relaxed text-text-muted">
                  Pressmeddelanden, rapporter och kursreaktioner från svenska bolag.
                </span>
              </Link>
              <Link href="/morgonbrevet" className="group">
                <span className="block font-serif text-xl font-bold text-text group-hover:underline">
                  Morgon- och kvällsbrevet
                </span>
                <span className="mt-1 block font-sans text-sm leading-relaxed text-text-muted">
                  Börsdagens viktigaste händelser sammanfattade före och efter handeln.
                </span>
              </Link>
              <Link href="/aktier/screener" className="group">
                <span className="block font-serif text-xl font-bold text-text group-hover:underline">
                  Aktiescreener
                </span>
                <span className="mt-1 block font-sans text-sm leading-relaxed text-text-muted">
                  Filtrera och jämför bolag på Stockholmsbörsen.
                </span>
              </Link>
              <Link href="/terminal" className="group">
                <span className="block font-serif text-xl font-bold text-text group-hover:underline">
                  Börsterminal
                </span>
                <span className="mt-1 block font-sans text-sm leading-relaxed text-text-muted">
                  Följ marknaden i ett tätare arbetsflöde för löpande bevakning.
                </span>
              </Link>
            </nav>
            <p className="mt-10 font-sans text-sm text-text-muted">
              Populära bolag: {" "}
              <Link href="/aktie/VOLV-B.ST" className="text-primary hover:underline">
                Volvo
              </Link>
              , {" "}
              <Link href="/aktie/INVE-B.ST" className="text-primary hover:underline">
                Investor
              </Link>{" "}
              och {" "}
              <Link href="/aktie/SAAB-B.ST" className="text-primary hover:underline">
                Saab
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Previous letters */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-serif font-bold text-text text-center">Tidigare utskick</h2>
        <p className="text-text-muted text-base mt-2 text-center mb-10 font-sans">
          Läs tidigare utskick av morgon- och kvällsbrevet.
        </p>
        <div className="w-full mx-auto mt-8 grid grid-cols-1 md:grid-cols-2 gap-4" id="prev">
          {previousArticles.slice(0, 4).map((article, idx) => (
            <PreviousArticle key={idx} article={article} idx={idx} />
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h2 className="text-3xl font-serif font-bold text-text mb-4">
          Imorgon kl. 08:00 i din inkorg?
        </h2>
        <p className="text-text-muted font-sans mb-8">
          Helt gratis, avsluta när du vill.
        </p>
        <div className="flex justify-center">
          <EmailInput centered={true} />
        </div>
      </section>
    </>
  );
}
