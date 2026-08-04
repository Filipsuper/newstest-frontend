"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import Link from "next/link";
import ArticleComponent from "./ArticleComponent";
import PreviousArticle from "./PreviousArticle";
import EmailInput from "./EmailInput";
import Testimonials from "./Testimonials";
import { DemoNewsFeed } from "./LandingDemos";

dayjs.extend(utc);

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
  const [currentTime, setCurrentTime] = useState("00:00:00")

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs.utc().add(2, "hour").format("HH:mm:ss"))
    }, 500)

    return () => clearInterval(timer)
  }, [])

  if (!articles || articles.length === 0) {
    return <div className="text-text">Loading...</div>;
  }

  const isTodaysArticle = dayjs(articles[0].createdAt).day() === dayjs.utc().day()
  const latestArticle = articles[0];
  const previousArticles = isTodaysArticle ? articles.slice(1) : articles;

  return (
    <>
      {/* Hero — the morning letter is the product */}
      <section className="min-h-[25vh] max-w-6xl flex flex-col md:flex-row justify-between font-sans mx-auto px-4 py-8 mt-16">
        <div>
          <h2 className="text-base font-bold text-text">{currentTime}</h2>
          <h1 className="text-5xl font-serif font-bold text-text-article mb-4">
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
            href={latestArticle.isEveningLetter ? "/kvallsbrevet" : "/morgonbrevet"}
            className="flex flex-col items-center justify-center w-full min-h-56 h-full hover:bg-primary-dark transition-colors duration-300 relative overflow-hidden"
          >
            <div className="absolute inset-0 h-full p-2 fade-edges">
              <ArticleComponent article={articles[0]} />
            </div>
            <div className="relative z-10 shadow-xl">
              <span className="primary-btn text-center extra-padding">
                Läs senaste {latestArticle.isEveningLetter ? "kvällsbrevet" : "morgonbrevet"}
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Why — calm, no selling */}
      <section className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-text mb-6">
          Tre minuter om dagen räcker
        </h2>
        <p className="text-text-muted font-sans leading-relaxed max-w-xl mx-auto">
          Du behöver inte scrolla nyhetsflöden hela dagen. Morgonbrevet summerar
          det som faktiskt rörde marknaden – rapporter, pressmeddelanden och
          insynshandel, med kursreaktionen på varje nyhet – innan börsen öppnar.
          Kvällsbrevet knyter ihop dagen kl. 17:30, direkt på sidan.
        </p>
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
              Vill du se flödet live? <Link href="/marknadsnyheter" className="text-primary hover:underline">Marknadsnyheter</Link>{" "}
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
            <div className="relative border border-border bg-foreground p-6" aria-hidden="true">
              <p className="font-sans text-xs text-text-muted mb-1">Ur morgonbrevet</p>
              <p className="font-serif font-bold text-text mb-3">📌 Min sammanfattning</p>
              <div className="flex flex-col gap-3 font-sans">
                <div>
                  <p className="text-xs font-bold text-text">PowerCell Sweden <span className="text-primary">+5,4%</span></p>
                  <p className="text-sm font-serif italic text-text-article">PowerCell får order värd SEK 21 million</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-text">Epiroc A <span className="text-primary">+2,6%</span></p>
                  <p className="text-sm font-serif italic text-text-article">Epiroc slutför förvärv i Sydafrika</p>
                </div>
                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="h-2.5 bg-border w-[92%]" />
                  <div className="h-2.5 bg-border w-[68%]" />
                </div>
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
      <section className="max-w-6xl mx-auto px-4 py-16">
        <Testimonials testimonials={testimonials} />
      </section>

      {/* Previous letters */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-serif font-bold text-text-article text-center">Tidigare utskick</h2>
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
        <h2 className="text-4xl font-serif font-bold text-text mb-4">
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
