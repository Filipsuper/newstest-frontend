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
import { useTheme } from "../providers/ThemeProvider";

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

  // New feature cards data
  const features = [
    {
      title: "Snabb Sammanfattning",
      description: "Få marknadsläget på bara 3 minuter varje morgon."
    },
    {
      title: "AI-Genererade Nyheter",
      description: "Alltid uppdaterat med viktiga pressmeddelanden och nyheter."
    },
    {
      title: "Gratis och Enkel Prenumeration",
      description: "Få dagens brev direkt i inkorgen, helt gratis."
    },
  ];

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
          {/* <p className="text-text-muted">Läs gårdagens artiklar</p>
            <Link to="#prev" className="text-text-muted hover:text-secondary transition-colors mb-8"><FaArrowDown /></Link> */}
        </div>
        <div className="flex w-full md:w-1/2 mb-4 min-h-40">
          <Link
            to="/morgonbrevet"
            className="flex flex-col items-center justify-center w-full min-h-56 h-full hover:bg-primary-dark transition-colors duration-300  relative overflow-hidden"
          >
            <div className="absolute inset-0 h-full  p-2 fade-edges">
              <ArticleComponent article={articles[0]} />
            </div>
            {isTodaysArticle ?

              <div className="relative z-10 shadow-xl">
                <h3 className="text-2xl font-bold text-text-muted hidden dark:flex font-serif mb-2">Dagens Morgonbrev</h3>
                <div className="primary-btn text-center">
                  Läs morgonens brev
                </div>
              </div>

              :
              <div className="relative z-10 shadow-xl">
                <h3 className="text-2xl font-bold text-text-muted hidden dark:flex p-2 font-serif mb-2">Gårdagens Morgonbrev</h3>
                <div className="primary-btn text-center">
                  Läs gårdagens brev
                </div>
              </div>
            }
          </Link>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-serif font-bold text-text-article mb-6 text-start">Våra nyhetsbrev</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/morgonbrevet"
            className="bg-background border border-border  p-6 shadow-lg hover:shadow-xl transition-shadow flex flex-col"
          >
            <h3 className="text-xl font-semibold text-text mb-2">Morgonbrevet</h3>
            <p className="text-text-muted flex-grow">
              Få morgonens viktigaste marknadshändelser och pressmeddelanden, direkt i din inkorg kl. 08:00 varje vardag.
            </p>
            <div className="mt-4 primary-btn w-max self-start">Läs Morgonbrevet</div>
          </Link>

          <Link
            to="/kvallsbrevet"
            className="bg-background border border-border  p-6 shadow-lg hover:shadow-xl transition-shadow flex flex-col"
          >
            <h3 className="text-xl font-semibold text-text mb-2">Kvällsbrevet</h3>
            <p className="text-text-muted flex-grow">
              En översikt och analys av dagens börshändelser, sammanfattade på ett lättförståeligt sätt att ta med sig inför nästa dag. Släpps kl. 17:30 varje vardag.
            </p>
            <div className="mt-4 primary-btn w-max self-start">Läs Kvällsbrevet</div>
          </Link>
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