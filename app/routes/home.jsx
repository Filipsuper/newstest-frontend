import { useEffect, useState } from "react";
import { pnlColor } from "../utils/utils";
import { fetchArticle } from "../utils/api";
import dayjs from "dayjs";

export function meta() {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  const [article, setArticle] = useState();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchArticle();
        setArticle(data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  if (!article) {
    return <div>...</div>;
  }

  const { title, createdAt, summary, omxPrice, omxChange, omxChangePercentage } = article;

  const parsedSummary = summary.split("\n").map((line, index) => {
    return <p className="mb-2" key={index}>{line}</p>
  });


  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-950 dark:to-gray-800 relative">
      <div className="absolute inset-0 z-20 bg-[url(https://grainy-gradients.vercel.app/noise.svg)] opacity-20 pointer-events-none"></div>
      <article className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        <h1 className="text-5xl font-serif font-black text-zinc-800 dark:text-zinc-100 italic mb-4 pb-2">
          {title}
        </h1>
        <div className="flex items-end mb-4 mt-4">
          <div className="space-x-2">
            <div className="font-bold text-zinc-600 dark:text-zinc-400">
              OMX Pre Market <span className="text-zinc-400">(15min delay)</span>
            </div>
            <span className="font-sans text-xl text-zinc-800 dark:text-zinc-100">{parseInt(omxPrice)} kr</span>
            <span className={"font-sans text-lg " + pnlColor(omxChange.split("p")[0])}>
              {omxChange}
            </span>
            <span className={"font-sans text-lg " + pnlColor(omxChangePercentage.split("%")[0])}>
              {omxChangePercentage}
            </span>
          </div>
          <div className="flex-grow"></div>
          {createdAt && (
            <span className="text-sm text-zinc-400">
              • <span className="italic">Updated At</span> {dayjs(createdAt).format("HH:mm")}
            </span>
          )}
        </div>
        <div className="text-xl text-zinc-600 dark:text-zinc-300 mb-4 prose prose">
          {parsedSummary}
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          <span>By <span className="italic">Morningsum</span></span>
        </div>
      </article>
    </main>


  )
}
