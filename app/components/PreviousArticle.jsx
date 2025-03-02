import React from 'react'
import { pnlColor } from "../utils/utils";
import dayjs from "dayjs";
import { Link } from "react-router";

export default function PreviousArticle({ article, index }) {
    const { title, createdAt, summary, omxPrice, omxChange, omxChangePercentage } = article;

    console.log(article)

    const parsedSummary = summary.split("\n").map((line, index) => {
        return <p className="mb-2" key={index}>{line}</p>
    });

    return (
        <Link to={`/article/${article._id}`} className="group">
            <article className="max-w-4xl mx-auto px-4 py-4 relative z-10 mb-8  shadow-black border-border border-opacity-10">
                <div className="flex flex-row justify-between items-start">
                    <div className="flex flex-col">
                        <p className="text-text font-bold text-sm">
                            {
                                dayjs(createdAt).isSame(dayjs(), 'day') ? "Today's summary" : dayjs(createdAt).format("MMM D, YYYY")
                            }
                        </p>

                        {/* {createdAt && (
                        <span className="text-sm text-text-muted">
                            • <span className="italic">Updated At</span> {dayjs(createdAt).format("HH:mm")}
                        </span>
                    )} */}
                    </div>

                    <div className="flex items-end mb-4">
                        <div className="space-x-2">
                            <span className="font-sans text-sm text-text">{parseInt(omxPrice)} kr</span>
                            <span className={"font-sans text-sm " + pnlColor(omxChange.split("p")[0])}>
                                {omxChange}
                            </span>
                            <span className={"font-sans text-sm " + pnlColor(omxChangePercentage.split("%")[0])}>
                                {omxChangePercentage}
                            </span>
                        </div>
                    </div>
                </div>

                <h1 className="text-2xl font-serif font-black text-text italic mb-4 pb-2">
                    {title}
                </h1>
            </article>
        </Link>
    )
}