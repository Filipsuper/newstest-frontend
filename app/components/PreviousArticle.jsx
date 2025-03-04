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

    const parseTitleForUrl = (title) => {
        return title.replaceAll(" ", "-")
    }

    const urlTitle = parseTitleForUrl(article.title)

    return (
        <Link to={`/article/${urlTitle}`} className="group">
            <article className=" mx-auto relative z-10 mb-8 ">
                <div className="flex flex-row justify-between items-start">
                    <div className="flex flex-col  ">
                        <p className="text-text font-bold text-sm">
                            •
                            {" "}
                            {
                                dayjs(createdAt).isSame(dayjs(), 'day') ? "Dagens sammanfattning " + dayjs(createdAt).format("MMM D, YYYY") : dayjs(createdAt).format("MMM D, YYYY")
                            }
                        </p>
                    </div>
                    <div className="flex items-end ">
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

                <h1 className="text-2xl font-serif font-black text-text italic mb-4 pb-2 group-hover:underline">
                    {title}
                </h1>
            </article>
        </Link>
    )
}