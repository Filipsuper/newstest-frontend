import React, { useState, useEffect } from 'react'
import ArticleComponent from "../components/ArticleComponent";
import { fetchArticle } from "../utils/api";
import dayjs from "dayjs";
import PreviousArticle from "../components/PreviousArticle";
import utc from "dayjs/plugin/utc"
import NewletterPlaceholder from "../components/NewletterPlaceholder";

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

    const isTodaysArticle = dayjs(articles[0].createdAt).day() === dayjs.utc().add(2, "hour").day()

    // Get day name to show specific weekend message
    const today = dayjs.utc().format('dddd')
    const isWeekend = today === 'Saturday' || today === 'Sunday'

    return (
        <main className="flex flex-col items-center justify-center overflow-x-clip">
            <NewletterPlaceholder title="Morgonbrevet" body="Morgonens viktigaste händelser 8:00" isTodaysArticle={isTodaysArticle} isWeekend={isWeekend} />

            {isTodaysArticle && <ArticleComponent article={articles[0]} />}


            <div className="max-w-6xl py- mx-auto px-4 relative z-10  ">
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
        </main>

    )
}
