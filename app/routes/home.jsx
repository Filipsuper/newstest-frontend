import { useEffect, useState } from "react";
import { pnlColor } from "../utils/utils";
import { fetchArticle } from "../utils/api";
import dayjs from "dayjs";
import ArticleComponent from "../components/ArticleComponent";
import PreviousArticle from "../components/PreviousArticle";
import { Link } from "react-router";
import { FaArrowDown, FaTwitter } from "react-icons/fa";
import utc from "dayjs/plugin/utc"
import { FaBluesky, FaX } from "react-icons/fa6";
import EmailInput from "../components/EmailInput";
import IndexGraph from "../components/IndexGraph";

export function meta() {
  return [
    { title: "OMXsum - Dagliga marknadssummeringar" },
    { name: "description", content: "Dagliga marknadssummeringar och viktiga pressmeddelanden från morgonens nyheter – genererade av AI varje dag kl. 08:00. Få en snabb överblick av den svenska börsens nyheter på OMXsum.com." },
  ];
}

export const loader = async () => {
  const article = await fetchArticle();
  return article;
};

export default function Home({ loaderData }) {
  const articles = loaderData

  const [currentTime, setCurrentTime] = useState("00:00:00")

  if (!articles) {
    return <div className="text-text">Loading...</div>;
  }
  dayjs.extend(utc);


  const isTodaysArticle = dayjs(articles[0].createdAt).day() === dayjs.utc().day()

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs.utc().add(1, "hour").format("HH:mm:ss"))
    }, 500)

    return () => clearInterval(timer)
  }, [])

  return (
    <>

      {isTodaysArticle ? <ArticleComponent article={articles[0]} /> :
        <div className="min-h-[25vh] max-w-6xl flex flex-row justify-between font-sans  mx-auto px-4 py-8 mt-16 mb-8 border-border border-opacity-10">
          <div className="" >
            <h2 className="text-base font-bold text-text">{currentTime}</h2>
            <h1 className="text-5xl font-serif font-bold text-text-article mb-4">
              Håll koll på börsen,
              <br />
              på bara <span className="underline">3 minuter</span>
            </h1>
            <p className="text-text-article mb-8">
              Få morgonens viktigaste marknadshändelser direkt till din inkorg, varje vardag kl. 08.00. <span className="underline">Helt gratis.</span>
            </p>
            <EmailInput centered={true} />
            {/* <p className="text-text-muted">Läs gårdagens artiklar</p>
            <Link to="#prev" className="text-text-muted hover:text-secondary transition-colors mb-8"><FaArrowDown /></Link> */}
          </div>
          <div className="hidden md:flex w-full md:w-1/2 mb-4">

          </div>
        </div>
      }
      {isTodaysArticle ?
        <div className="max-w-6xl flex flex-row  mx-auto px-4 relative mt-8 ">
          <EmailInput />
        </div>
        : null
      }

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