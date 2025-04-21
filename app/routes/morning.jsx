import React, { useState, useEffect } from 'react'
import ArticleComponent from "../components/ArticleComponent";
import { fetchArticle } from "../utils/api";
import dayjs from "dayjs";
import PreviousArticle from "../components/PreviousArticle";
import utc from "dayjs/plugin/utc"

export const loader = async () => {
    const article = await fetchArticle();
    return article;
};

export default function morning({ loaderData }) {
    const articles = loaderData

    if (!articles) {
        return <div className="text-text">Loading...</div>;
    }

    dayjs.extend(utc);

    const isTodaysArticle = dayjs(articles[0].createdAt).day() === dayjs.utc().day()
    const formattedDate = dayjs(articles[0].createdAt).format('D MMM')

    // Get day name to show specific weekend message
    const today = dayjs.utc().format('dddd')
    const isWeekend = today === 'Saturday' || today === 'Sunday'

    return (
        <div className="flex flex-col items-center justify-center ">
            <div className="w-full flex flex-col items-center justify-center h-fit relative ">
                <div className="absolute -top-10 -right-10 h-16 w-96 bg-secondary blur-[150px]"></div>
                <h1 className="text-4xl font-bold ">Morgonbrevet</h1>
                <p className="text-text-article">Morgonens viktigaste händelser 8:00</p>
                {(!isTodaysArticle && (
                    <div className="w-full max-w-xl mt-8 text-center">
                        <div className=" p-4">
                            <p className="text-text-article ">
                                {isWeekend ? (
                                    <>
                                        <span className="font-bold  text-2xl">God dag!</span> <br />
                                        Inget morgonbrev under helgen.
                                        <br />
                                        <span className="text-text-muted ">
                                            Nedan är senaste artikeln från {formattedDate}
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        Dagens artikel har inte publicerats än
                                        <br />
                                        <span className="text-text-muted ">
                                            Nedan är senaste artikeln från {formattedDate}
                                        </span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
            <ArticleComponent article={articles[0]} />


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
        </div>

    )
}
