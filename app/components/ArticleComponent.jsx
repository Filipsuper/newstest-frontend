import React, { useState } from 'react'
import { importanceColor, pnlColor } from "../utils/utils";
import dayjs from "dayjs";
import PressRelease from "./PressRelease";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import EmailInput from "./EmailInput";
import IndexGraph from "./IndexGraph";
import { Link } from "react-router";
import ShareArticleComponent from "./ShareArticleComponent";
import { parseSummary } from "../utils/parseSummary";

export default function ArticleComponent({ article, index }) {
    const { title, createdAt, summary, omxPrice, omxChange, omxChangePercentage, pressReleases, sentimentLabel, bulletPoints, introText } = article;

    const parsedSummary = parseSummary(summary)

    const SentimentDashboard = ({ sentimentLabel, omxPrice, omxChangePercentage }) => {
        const percentageChange = parseFloat(omxChangePercentage.replace('%', '').replace(',', '.'));

        const getSentimentIcon = (label) => {
            if (!label) return "⚖️"; // default to neutral if no label
            if (label.toLowerCase().includes("positive") && percentageChange > 1) return "🚀"; // strong positive
            if (label.toLowerCase().includes("positive") && percentageChange <= 1) return "🐂"; // positive
            if (label.toLowerCase().includes("negative") && percentageChange < -1) return "💥"; // strong negative
            if (label.toLowerCase().includes("negative") && percentageChange >= -1) return "🐻"; // negative

            return "⚖️"; // neutral
        };

        const sentiment = sentimentLabel === "Positive" ? "Bullish" : sentimentLabel === "Negative" ? "Bearish" : "Neutral";

        const getChangeColor = (change) => {
            const num = parseFloat(change.replace('%', '').replace(',', '.'));
            if (isNaN(num)) return "text-gray-500";
            return num > 0 ? "text-primary" : "text-secondary"
        };

        return (
            <div className="flex flex-col md:flex-row justify-between gap-6 py-3 mb-6 w-full">


                {bulletPoints && (
                    <ul className="flex flex-col w-full items-start gap-2 md:max-w-[60%]">
                        {bulletPoints.split("\n").map((bullet, idx) => {
                            if (bullet.match(/^\s*$/)) return null;
                            if (idx > 2) return null; // Limit to 4 bullet points
                            return (
                                <li
                                    key={idx}
                                    className="flex items-center w-full gap-2 border bg-bullet text-amber-500 shadow px-3 text-sm font-bold"
                                >
                                    <svg className="w-2 h-2 fill-amber-500" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" /></svg>
                                    {bullet.replaceAll("-", "").trim()}
                                </li>
                            );
                        })}
                    </ul>
                )}
                <div className="flex flex-grow justify-center">
                    <div className="flex md:flex-grow items-stretch font-sans">
                        <div className="flex flex-col justify-center w-fit border-r border-border px-4">
                            <p className="text-sm text-text-muted font-semibold">Dagens <br /> sentiment</p>
                            <p className="text-base font-bold text-text">{sentiment}</p>
                        </div>
                        <div className="flex flex-col justify-center px-4 border-r border-border">
                            <p className="text-sm font-semibold text-text-muted">OMXS30</p>
                            <p className="text-lg font-bold text-text">{omxPrice}</p>
                            <p className={`text-sm font-medium ${getChangeColor(omxChangePercentage)}`}>
                                {omxChangePercentage}
                            </p>
                        </div>

                        <div className="text-3xl flex px-4 items-center pr-4 ">
                            {getSentimentIcon(sentimentLabel)}
                        </div>




                    </div>
                </div>

            </div>
        );
    };

    return (
        <article className="max-w-4xl mx-auto px-4 py-4 relative z-10 mb-8   border-border border-opacity-10" >
            <Link to="/" className="flex flex-row items-center gap-2 text-text-muted hover:text-secondary transition-colors mb-8">
                <FaArrowLeft className="text-lg" />
                <span className="text-sm font-sans">Tillbaka</span>
            </Link>
            < div className="flex flex-row justify-between items-start mb-4 border-b border-border" >
                <div className="flex flex-col ">
                    {article.isEveningLetter ?
                        <p className="text-text font-bold text-base">
                            {
                                dayjs(createdAt).isSame(dayjs(), 'day') ? "Eftermiddagens brev" : dayjs(createdAt).locale('sv').format("MMM D, YYYY")
                            }
                        </p> :
                        <p className="text-text font-bold text-base">
                            {
                                dayjs(createdAt).isSame(dayjs(), 'day') ? "Morgonens brev" : dayjs(createdAt).locale('sv').format("MMM D, YYYY")
                            }
                        </p>}


                </div>
                <ShareArticleComponent title={title} />
            </div >

            <div className="flex flex-col md:flex-row gap-8">
                <div >
                    <h1 className="text-3xl md:text-4xl font-serif font-black text-text italic  pb-2">
                        {title}
                    </h1>
                    {introText && <p className="text-xl font-bold hidden md:flex font-sans mb-4">
                        {introText}
                    </p>}

                    <SentimentDashboard
                        sentimentLabel={sentimentLabel}
                        omxPrice={omxPrice}
                        omxChangePercentage={omxChangePercentage}
                    />


                    <div className="text-base font-sans text-text-article mb-8 prose prose">
                        {parsedSummary}
                    </div>

                    {
                        dayjs(createdAt).isSame(dayjs(), 'day') ?
                            <div className="flex flex-col justify-center items-start w-full gap-4 mb-8">
                                <div className="w-full h-60">
                                    {/* <h2 className="text-xl font-bold">OMX utv. 30 dagar:</h2> */}
                                    <IndexGraph />

                                </div>
                            </div> : null
                    }

                    {pressReleases ?
                        <div className="text-sm font-sans text-text-article flex flex-col gap-1">
                            <h2 className="text-xl font-serif font-black text-text italic pb-2">
                                Viktiga pressmeddelanden
                                <span className="text-xs text-text-muted">• Updaterad {dayjs(createdAt).format("HH:mm")}</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"> {/* Changed to grid layout */}
                                {pressReleases.map((release, idx) => {
                                    return (
                                        <PressRelease key={idx} idx={idx} release={release} />
                                    )
                                })}
                            </div>
                        </div>
                        : null}
                    <div className="flex flex-col py-4 font-bold" >
                        <a href="https://tally.so/r/nGyKJe">Saknar du något på sidan? <span className="underline text-primary">Kom gärna med feedback / förslag!</span> </a>
                    </div>
                </div>
            </div>

        </article>
    )
}