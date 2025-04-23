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
      name: "Hampsx",
      text: "Snyggt jobbat! Kommer användas",
      date: "2023-10-02",
      source: "Reddit",
      url: "https://www.reddit.com/r/Aktiemarknaden/comments/1j3vtqt/comment/mgb36w4/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button"
    },
    {
      name: "3xc1t3r",
      text: "Snyggt och rent! Ska få med den i rotationen!",
      date: "2023-10-03",
      source: "Reddit",
      url: "https://www.reddit.com/r/Aktiemarknaden/comments/1j3vtqt/comment/mghn1ft/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button"
    },
  ]

  return (
    <>


      <section className="min-h-[25vh] max-w-6xl flex flex-col md:flex-row justify-between font-sans  mx-auto px-4 py-8 mt-16 mb-8 border-border border-opacity-10">
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
          {/* <div className="flex flex-row gap-2 items-center justify-start">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="relative inline-flex items-center h-6 border border-border w-11 "
            >
              <span
                className={`${theme === 'light' ? 'translate-x-6' : 'translate-x-1'
                  } inline-block w-4 h-4 transform bg-secondary transition-transform`}
              />
            </button>
            <span className="text-text-muted text-xs">Ändra tema</span>

          </div> */}
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
      <section className="max-w-6xl mx-auto px-4 py-12">
        {/* <h2 className="text-3xl font-serif font-bold text-text-article mb-6 text-start">Vad våra läsare säger</h2> */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="  p-6  flex flex-col justify-center items-center font-sans"
            >
              <p className="text-text-muted ">
                <span className="text-xl font-bold text-center">"</span> {" "}{testimonial.text}
              </p>
              <a className="flex flex-row items-center gap-2 hover:underline" noopener noreferrer target="_blank" href={testimonial.url}>
                {testimonial.source === "Reddit" && <FaReddit className="text-text-muted" />}
                <span className="text-xl font-semibold text-text font-serif">{testimonial.name}</span>
                {/* <span>•</span>
                <span>{dayjs(testimonial.date).format("MMM D, YYYY")}</span> */}
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-serif font-bold text-text-article mb-6 text-start">Våra nyhetsbrev</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {newletterCards.map((card, index) => (
            <Link
              to={card.link}
              key={index}
              className="bg-background border border-border p-6 shadow-lg hover:shadow-xl transition-shadow flex flex-col"
            >

              <div className="flex flex-row items-center mb-2 gap-2">
                <h3 className="text-xl font-semibold text-text ">{card.title}</h3>
                <span>•</span>
                <span>{card.time}</span>
              </div>
              <p className="text-text-muted flex-grow">
                {card.description}
              </p>
              <div className="mt-4 primary-btn w-max self-start">Läs {card.title}</div>
            </Link>
          ))}
        </div>
      </section>
      <div className="max-w-6xl py- mx-auto px-4 relative z-10 mt-20 ">
        <div className="w-full mx-auto mt-8 relative z-10 border-b border-border">
          <h2 className="text-lg font-serif font-black text-text-muted italic mb-4 mt-8">Tidigare artiklar</h2>
        </div>
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
      </div>
    </>
  );
}