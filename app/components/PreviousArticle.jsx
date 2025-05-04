import React from 'react'
import { pnlColor } from "../utils/utils";
import dayjs from "dayjs";
import { Link } from "react-router";
import { parseSummary } from "../utils/parseSummary.jsx";

export default function PreviousArticle({ article, idx }) {
    const { title, createdAt, summary, omxPrice, omxChange, omxChangePercentage, isEveningLetter } = article;

    const parseTitleForUrl = (title) => {
        return title.replaceAll("-", "_").replaceAll(" ", "-")
    }

    const urlTitle = parseTitleForUrl(article.title)

    return (
        <Link to={`/article/${urlTitle}`} rel={(idx === 0 ? "canonical" : "")} className="group">
            <article className=" mx-auto relative z-10 mb-8 ">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <span className={"bg-gray-100 text-white text-xs font-medium px-2 py-0.5   " + (isEveningLetter ? "bg-secondary " : "bg-primary ")}>
                            {isEveningLetter ? "Kvällsbrevet" : "Morgonbrevet"}
                        </span>
                        <span className="text-sm text-text-muted">
                            • {dayjs(createdAt).format("MMM D, YYYY")}
                        </span>
                    </div>
                    <div className="text-right space-x-2">
                        <span className="text-sm text-text">{parseInt(omxPrice)} kr</span>
                        <span className={`text-sm ${pnlColor(omxChange.split("p")[0])}`}>{omxChange}</span>
                        <span className={`text-sm ${pnlColor(omxChangePercentage.split("%")[0])}`}>{omxChangePercentage}</span>
                    </div>
                </div>


                <h2 className="text-xl font-serif font-bold italic text-text group-hover:underline mb-1">
                    {title}
                </h2>
                <p className="text-base text-text-muted body-text line-clamp-2">
                    {parseSummary(summary.split("\n")[0])}
                </p>

                <div className="text-sm font-medium text-primary hover:underline">
                    Läs mer →
                </div>

            </article>
        </Link>
    )
}