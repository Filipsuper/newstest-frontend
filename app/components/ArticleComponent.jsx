import React from 'react'
import { pnlColor } from "../utils/utils";
import dayjs from "dayjs";

export default function ArticleComponent({ article, index }) {
    const { title, createdAt, summary, omxPrice, omxChange, omxChangePercentage } = article;

    console.log(article)

    const parsedSummary = summary.split("\n").map((line, index) => {
        return <p className="mb-2" key={index}>{line}</p>
    });
    return (
        <article className="max-w-4xl mx-auto px-4 py-4 relative z-10 mb-8 border-b border-zinc-200 dark:border-zinc-700">
            <div className="flex flex-row justify-between items-start">
                <div className="flex flex-col">
                    <p className="text-zinc-400 dark:text-zinc-200 font-bold text-xl">
                        {
                            dayjs(createdAt).isSame(dayjs(), 'day') ? "Today's summary" : dayjs(createdAt).format("MMM D, YYYY")
                        }
                    </p>

                    {createdAt && (
                        <span className="text-sm text-zinc-400">
                            • <span className="italic">Updated At</span> {dayjs(createdAt).format("HH:mm")}
                        </span>
                    )}
                </div>

                <div className="flex items-end mb-4 p-2">
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

                </div>
            </div>

            <h1 className="text-4xl font-serif font-black text-zinc-800 dark:text-zinc-100 italic mb-4 pb-2">
                {title}
            </h1>

            <div className="text-xl text-zinc-600 dark:text-zinc-300 mb-4 prose prose">
                {parsedSummary}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
                <span>By <span className="italic">Morningsum</span></span>
            </div>
        </article>
    )
}
