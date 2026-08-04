"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import Link from "next/link";
import { FaCheck } from "react-icons/fa6";
import PreviousArticle from "./PreviousArticle";
import EmailInput from "./EmailInput";
import Testimonials from "./Testimonials";

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

function PlanBadge({ children }) {
  return (
    <span className="w-fit text-[11px] uppercase tracking-wider text-secondary border border-secondary/40 px-2 py-0.5 font-sans">
      {children}
    </span>
  );
}

function FeatureSection({ badge, title, text, bullets, img, alt, reverse, cta }) {
  return (
    <section className="max-w-6xl mx-auto px-4 py-20 md:py-28">
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center`}>
        <div className={`flex flex-col gap-4 ${reverse ? "md:order-2" : ""}`}>
          {badge}
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-text leading-tight">{title}</h2>
          <p className="text-text-muted font-sans leading-relaxed">{text}</p>
          {bullets && (
            <ul className="flex flex-col gap-2 mt-1 font-sans">
              {bullets.map((bullet, idx) => (
                <li key={idx} className="flex flex-row gap-2 items-start text-sm text-text-article">
                  <FaCheck className="text-primary shrink-0 mt-1" /> {bullet}
                </li>
              ))}
            </ul>
          )}
          {cta}
        </div>
        <div className={`relative ${reverse ? "md:order-1" : ""}`}>
          <div className="absolute -inset-8 bg-primary opacity-[0.07] blur-3xl pointer-events-none"></div>
          <img
            src={img}
            alt={alt}
            loading="lazy"
            className="relative w-full shadow-2xl shadow-black/40"
          />
        </div>
      </div>
    </section>
  );
}

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
  const previousArticles = isTodaysArticle ? articles.slice(1) : articles;

  return (
    <>
      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-4 pt-16 md:pt-24 pb-10 text-center overflow-visible">
        <div className="absolute top-0 left-1/4 h-40 w-96 bg-secondary blur-[180px] opacity-25 pointer-events-none"></div>
        <div className="absolute top-20 right-1/4 h-40 w-96 bg-primary blur-[180px] opacity-20 pointer-events-none"></div>

        <p className="relative font-sans text-xs uppercase tracking-[0.2em] text-text-muted mb-6">
          {currentTime} · Nyhetsbrev · Livenyheter · Aktiedata
        </p>
        <h1 className="relative text-5xl md:text-6xl font-serif font-bold text-text leading-[1.05] mb-6">
          Håll koll på börsen,
          <br />
          på bara <span className="italic underline decoration-secondary decoration-4 underline-offset-8">3 minuter</span>
        </h1>
        <p className="relative text-text-muted font-sans max-w-xl mx-auto mb-8">
          AI-summerade morgon- och kvällsbrev, livenyheter från Stockholmsbörsen
          och rena aktieöversikter – utan brus.
        </p>
        <div className="relative flex justify-center mb-16">
          <EmailInput centered={true} />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="absolute -inset-10 bg-primary opacity-10 blur-3xl pointer-events-none"></div>
          <img
            src="/landing/hero-stock.png"
            alt="Aktieöversikt för Volvo B på omxsum.com"
            className="relative w-full shadow-2xl shadow-black/50"
          />
        </div>
      </section>

      {/* Features */}
      <FeatureSection
        badge={<PlanBadge>Gratis</PlanBadge>}
        title={<>Morgonbrevet & Kvällsbrevet</>}
        text="Marknadsläget summerat av AI varje vardag – i inkorgen kl. 08:00 och på sidan kl. 17:30. Sentiment, viktiga pressmeddelanden och dagens siffror, färdigtuggat på tre minuter."
        bullets={[
          "Morgonbrevet i din inkorg varje vardag 08:00",
          "Kvällsbrevet på sidan varje vardag 17:30",
          "Klickbara aktier med kursgraf direkt i brevet",
        ]}
        img="/landing/feature-letter.png"
        alt="Morgonbrevet på omxsum.com"
        cta={<Link href="/morgonbrevet" className="text-primary font-sans text-sm hover:underline mt-2">Läs dagens morgonbrev →</Link>}
      />

      <FeatureSection
        reverse
        badge={<PlanBadge>Plus</PlanBadge>}
        title={<>Marknadsnyheter – live</>}
        text="Pressmeddelanden, insynshandel, ordrar och rapporter från Stockholmsbörsen i realtid – kategoriserade och på svenska. Dagens vinnare och förlorare uppdateras löpande."
        bullets={[
          "Livenyheter sekunder efter publicering",
          "Etiketter: rapport, förvärv, insynshandel, order …",
          "Dagens vinnare och förlorare",
        ]}
        img="/landing/feature-news.png"
        alt="Live marknadsnyheter på omxsum.com"
        cta={<Link href="/marknadsnyheter" className="text-primary font-sans text-sm hover:underline mt-2">Till marknadsnyheterna →</Link>}
      />

      <FeatureSection
        badge={<PlanBadge>Plus</PlanBadge>}
        title={<>Hela bolaget på en sida</>}
        text="Kurs i realtid, finanser, rapportkalender, kurshistorik och alla nyheter om bolaget – samlat i en ren översikt. Nyhetsprickar direkt i grafen visar när saker hände."
        bullets={[
          "Intradagskurs och historik för 870+ svenska aktier",
          "Omsättning, EBIT och marginaler – år och kvartal",
          "Rapportdatum, estimat och utdelningar",
        ]}
        img="/landing/feature-financials.png"
        alt="Finansiell översikt för Evolution på omxsum.com"
      />

      <FeatureSection
        reverse
        badge={<PlanBadge>Pro</PlanBadge>}
        title={<>Terminalen – för dig som vill se allt</>}
        text="Vårt proffsverktyg med realtidsgrafer, live-nyhetsflöde, screener och kortkommandon. För dig som följer marknaden hela dagen."
        bullets={[
          "Realtidsdata för hela börsen",
          "Flera grafer sida vid sida",
          "Screener och movers över 865 aktier",
        ]}
        img="/landing/feature-terminal.png"
        alt="Terminalen på terminal.omxsum.com"
        cta={<a href="https://terminal.omxsum.com" target="_blank" rel="noopener noreferrer" className="text-primary font-sans text-sm hover:underline mt-2">Öppna terminalen →</a>}
      />

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <Testimonials testimonials={testimonials} />
      </section>

      {/* Pricing teaser */}
      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-serif font-bold text-text mb-3">Börja gratis</h2>
        <p className="text-text-muted font-sans mb-12">Nyhetsbreven är alltid gratis. Uppgradera när du vill ha mer.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 font-sans mb-10">
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm uppercase tracking-wider text-text-muted">Gratis</span>
            <span className="text-3xl font-bold text-text">0 kr</span>
            <span className="text-sm text-text-muted">Nyhetsbreven & terminalens grunddata</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm uppercase tracking-wider text-secondary">Plus</span>
            <span className="text-3xl font-bold text-text">49 kr<span className="text-base text-text-muted">/mån</span></span>
            <span className="text-sm text-text-muted">Livenyheter & aktieöversikter</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm uppercase tracking-wider text-secondary">Pro</span>
            <span className="text-3xl font-bold text-text">99 kr<span className="text-base text-text-muted">/mån</span></span>
            <span className="text-sm text-text-muted">Allt + hela terminalen</span>
          </div>
        </div>
        <Link href="/pro" className="primary-btn extra-padding">Jämför planerna →</Link>
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
      <section className="relative max-w-3xl mx-auto px-4 py-24 text-center overflow-visible">
        <div className="absolute top-10 left-1/3 h-32 w-80 bg-secondary blur-[160px] opacity-20 pointer-events-none"></div>
        <h2 className="relative text-4xl font-serif font-bold text-text mb-4">
          Imorgon kl. 08:00 i din inkorg?
        </h2>
        <p className="relative text-text-muted font-sans mb-8">
          Helt gratis, avsluta när du vill.
        </p>
        <div className="relative flex justify-center">
          <EmailInput centered={true} />
        </div>
      </section>
    </>
  );
}
