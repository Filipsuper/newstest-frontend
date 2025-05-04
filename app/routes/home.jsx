import { useEffect, useState } from "react";
import { pnlColor } from "../utils/utils";
import { fetchAllArticles, fetchArticle } from "../utils/api";
import dayjs from "dayjs";
import ArticleComponent from "../components/ArticleComponent";
import PreviousArticle from "../components/PreviousArticle";
import { Link } from "react-router";
import { FaArrowDown, FaTwitter } from "react-icons/fa";
import utc from "dayjs/plugin/utc"
import { FaBluesky, FaReddit, FaX } from "react-icons/fa6";
import EmailInput from "../components/EmailInput";
import { useTheme } from "../providers/ThemeProvider";
import AccountCallToAction from "../components/AccountCallToAction";
import NewsLettersCTA from "../components/NewsLettersCTA";
import Testimonials from "../components/Testimonials";

export function meta() {
  return [
    { title: "OMXsum - Dagliga marknadssummeringar" },
    { name: "description", content: "Dagliga marknadssummeringar och viktiga pressmeddelanden från morgonens nyheter – genererade av AI varje dag kl. 08:00. Få en snabb överblick av den svenska börsens nyheter på OMXsum.com." },
  ];
}

export const loader = async () => {
  const article = await fetchAllArticles();
  return article;
};

export default function Home({ loaderData }) {
  const articles = loaderData
  const { theme, setTheme } = useTheme();

  const [currentTime, setCurrentTime] = useState("00:00:00")

  if (!articles) {
    return <div className="text-text">Loading...</div>;
  }
  dayjs.extend(utc);


  const isTodaysArticle = dayjs(articles[0].createdAt).day() === dayjs.utc().day()

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs.utc().add(2, "hour").format("HH:mm:ss"))
    }, 500)

    return () => clearInterval(timer)
  }, [])

  const latestArticle = articles[0];

  const newletterCards = [
    {
      title: "Morgonbrevet",
      description: "Få morgonens viktigaste marknadshändelser och pressmeddelanden, direkt i din inkorg kl. 08:00 varje vardag.",
      link: "/morgonbrevet",
      time: "08:00"
    },
    {
      title: "Kvällsbrevet",
      description: "En översikt och analys av dagens börshändelser, sammanfattade på ett lättförståeligt sätt att ta med sig inför nästa dag. Släpps kl. 17:30 varje vardag.",
      link: "/kvallsbrevet",
      time: "17:30"
    },
  ]

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

  ]

  return (
    <>


      <section className="min-h-[25vh] max-w-6xl flex flex-col md:flex-row justify-between font-sans  mx-auto px-4 py-8 mt-16 border-border border-opacity-10">
        <div className="" >
          <h2 className="text-base font-bold text-text">{currentTime}</h2>
          <h1 className="text-5xl font-serif font-bold text-text-article mb-4">
            Håll koll på börsen,
            <br />
            på bara <span className="underline">3 minuter</span>
          </h1>
          <p className="text-text-article mb-8">
            Få morgonens viktigaste marknadshändelser direkt till din inkorg,
            <br />
            varje vardag kl. 08.00. <span className="underline">Helt gratis.</span>
          </p>
          <EmailInput centered={true} />
        </div>
        <div className="flex w-full md:w-1/2 mb-4 min-h-40">
          <Link
            to={latestArticle.isEveningLetter ? "/kvallsbrevet" : "/morgonbrevet"}
            className="flex flex-col items-center justify-center w-full min-h-56 h-full hover:bg-primary-dark transition-colors duration-300  relative overflow-hidden"
          >
            <div className="absolute inset-0 h-full  p-2 fade-edges">
              <ArticleComponent article={articles[0]} />
            </div>
            <div className="relative z-10 shadow-xl">
              <span className="primary-btn text-center">
                Läs senaste {latestArticle.isEveningLetter ? "kvällsbrevet" : "morgonbrevet"}
              </span>
            </div>
          </Link>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-4 py-24  ">
        <Testimonials testimonials={testimonials} />
      </section>
      <section className="max-w-6xl mx-auto px-4 py-24">
        <NewsLettersCTA newletterCards={newletterCards} />
      </section >
      <section className="max-w-6xl mx-auto px-4 py-24 flex flex-col gap-0">
        <AccountCallToAction />
      </section>
      <section className="max-w-6xl  mx-auto px-4 relative z-10 py-24 ">
        <h2 className="text-4xl font-serif font-bold text-text-article text-center">Tidigare utskick</h2>
        <p className="text-text-muted text-base mt-2  text-center mb-10">
          Här kan du läsa tidigare utskick av morgon- och kvällsbrevet.
        </p>
        <div className="w-full mx-auto mt-8 grid grid-cols-1 grid-rows-4 md:grid-cols-2 md:grid-rows-2 gap-4 relative z-10 " id="prev">
          {
            isTodaysArticle ? articles.slice(1).map((article, idx) => (
              <PreviousArticle key={idx} article={article} idx={idx} />
            )) :
              articles.map((article, idx) => (
                <PreviousArticle key={idx} article={article} idx={idx} />
              ))
          }
        </div>
      </section>
    </>
  );
}