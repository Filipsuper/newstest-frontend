import React from 'react'
import { importanceColor, pnlColor } from "../utils/utils";
import dayjs from "dayjs";

export default function ArticleComponent({ article, index }) {
    const { title, createdAt, summary, omxPrice, omxChange, omxChangePercentage, pressReleases } = article;


    const parsedSummary = summary.split("\n").map((line, index) => {
        return <p className="mb-2" key={index}>{line}</p>
    });

    return (
        <article className="max-w-6xl mx-auto px-4 py-4 relative z-10 mb-8  shadow-black border-border border-opacity-10">
            <div className="flex flex-row justify-between items-start mb-4">
                <div className="flex flex-col">
                    <p className="text-text font-bold text-xl">
                        {
                            dayjs(createdAt).isSame(dayjs(), 'day') ? "Today's summary" : dayjs(createdAt).format("MMM D, YYYY")
                        }
                    </p>

                    {createdAt && (
                        <span className="text-sm text-text-muted">
                            • <span className="italic">Updated At</span> {dayjs(createdAt).format("HH:mm")}
                        </span>
                    )}
                </div>

                <div className="flex items-end mb-4">
                    <div className="space-x-2">
                        <div className="font-bold text-text">
                            OMX Pre Market <span className="text-text-muted">(15min delay)</span>
                        </div>
                        <span className="font-sans text-xl text-text">{parseInt(omxPrice)} kr</span>
                        <span className={"font-sans text-lg " + pnlColor(omxChange.split("p")[0])}>
                            {omxChange}
                        </span>
                        <span className={"font-sans text-lg " + pnlColor(omxChangePercentage.split("%")[0])}>
                            {omxChangePercentage}
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex flex-col md:flex-row gap-8">

                <div >
                    <h1 className="text-4xl font-serif font-black text-text italic mb-4 pb-2">
                        {title}
                    </h1>

                    <div className="text-sm font-sans text-text-article mb-4 prose prose">
                        {parsedSummary}
                    </div>

                </div>
                {pressReleases ? <div className="text-sm font-sans md:max-w-96 text-text-article mb-4 prose prose">
                    <h2 className="text-2xl font-serif font-black text-text italic mb-4 pb-2">Top Press Releases</h2>
                    {pressReleases.map((release, idx) => {
                        return (
                            <div key={idx} className="mb-4  bg-foreground p-4 border border-border border-opacity-10">
                                <div className="w-full flex justify-between items-center">
                                    <span>{release.ticker}</span>
                                    <span className={"p-1 px-2 rounded-sm bg-background  " + importanceColor(release.importance)}>{release.importance}</span>
                                </div>
                                <h3 className="text-lg font-serif font-bold text-text italic mb-2">{release.title}</h3>
                                <p className="text-sm font-sans  text-text-muted">{release.summary}</p>
                            </div>
                        )
                    })}
                </div> : null}
            </div>


            <div className="text-sm text-text-muted">
                <span>By <span className="italic">Morningsum</span></span>
            </div>
        </article>
    )
}