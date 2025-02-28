import { useEffect, useState } from "react";
import { pnlColor } from "../utils/utils";
import { fetchArticle } from "../utils/api";

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

  const { title, createdAt, summary, omxPreMarketData } = article;

  return (
    // <h1>Home</h1>
    <main className=" min-h-screen">
      <article className="max-w-4xl mx-auto px-4 py-8 ">
        <h1 className="text-4xl font-bold ">God Morgon,</h1>
        <h2 className="text-4xl font-bold mb-4 border-b pb-2">{title}</h2>
        <div className="flex items-end mb-4 mt-4">
          <div>
            <div className=" font-bold text-gray-600">OMX Pre Market <span className="text-gray-400">(15min delay)</span></div>
            <span className={"font-sans text-xl "}>{parseInt(omxPreMarketData.currentPrice)} kr</span>
            <span className={"font-sans text-lg text-gray-400 " + pnlColor(omxPreMarketData.priceChange.split("p")[0])} > {omxPreMarketData.priceChange}</span>
            <span className={"font-sans text-lg text-gray-400 " + pnlColor(omxPreMarketData.priceChangePercentage.split("%")[0])}> {omxPreMarketData.priceChangePercentage}</span>
          </div>
          <div className="flex-grow"></div>
          {createdAt && <span className="text-sm text-gray-400"> • <span className="italic">Updated At</span>  {new Date(createdAt).toLocaleDateString()}</span>}
        </div>
        <div className="text-xl text-gray-800 mb-4 prose prose">{summary}</div>
        <div className="text-sm text-gray-400">
          <span>By <span className="italic">Morningsum</span></span>
        </div>
      </article>
    </main >
  )
}
