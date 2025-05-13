import React, { useState } from 'react'
import { importanceColor, pnlColor } from "../utils/utils";
import dayjs from "dayjs";
import PressRelease from "./PressRelease";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import EmailInput from "./EmailInput";
import IndexGraph from "./IndexGraph";
import { Link } from "react-router";
import ShareArticleComponent from "./ShareArticleComponent";

export default function ArticleComponent({ article, index }) {
    const { title, createdAt, summary, omxPrice, omxChange, omxChangePercentage, pressReleases, articleCount, bulletPoints } = article;

    const parsedSummary = summary.split("\n").map((line, index) => {
        if (line.includes("##")) {
            return <h2 className=" font-bold text-text font-serif italic mt-2 text-lg" key={index} >{line.replaceAll("#", "")}</h2>
        } else if (line === "") {
            return
        }

        if (line === "") {
            return null;
        }

        const parts = line.split(/(\[.*?\]\(.*?\)|\&\&[^\&]+\&\&|\*\*[^\*]+\*\*|##[^#]+##|\/red\/[^\/]+\/red\/|\/green\/[^\/]+\/green\/)/);

        return (
            <p className="mb-2 text-text-article" key={index}>
                {parts.map((part, i) => {

                    if (part.startsWith('&&') && part.endsWith('&&')) {
                        return <span key={i} className="font-bold">{part.slice(2, -2)}</span>;
                    } else if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong className="" key={i}>{part.slice(2, -2)}</strong>;
                    } else if (part.startsWith('##') && part.endsWith('##')) {
                        return <h2 key={i} className="text-xl font-semibold">{part.slice(2, -2)}</h2>;
                    } else if (part.startsWith('/red/') && part.endsWith('/red/')) {
                        return <span key={i} className="text-amber-400">{part.slice(5, -5)}</span>;
                    } else if (part.startsWith('/green/') && part.endsWith('/green/')) {
                        return <span key={i} className="text-primary">{part.slice(7, -7)}</span>;
                    }
                    return part;
                })}
            </p >
        );

    });

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
                {/* dayjs(createdAt).format("HH:mm") */}
                {/* <div className="flex items-end mb-4">
                    <div className="space-x-2">
                        <div className="font-bold text-text ">
                            OMX pm <span className="text-text-muted text-sm">( 15min delay )</span>
                        </div>
                        <span className="font-sans text-lg text-text">{parseInt(omxPrice)} kr</span>
                        <span className={"font-sans text-lg " + pnlColor(omxChange.split("p")[0])}>
                            {omxChange}
                        </span>
                        <span className={"font-sans text-lg " + pnlColor(omxChangePercentage.split("%")[0])}>
                            {omxChangePercentage}
                        </span>
                    </div>
                </div> */}
            </div >

            <div className="flex flex-col md:flex-row gap-8">
                <div >
                    <h1 className="text-3xl md:text-4xl font-serif font-black text-text italic  pb-2">
                        {title}
                    </h1>
                    <div className="mb-4 flex flex-wrap gap-1 md:gap-2">

                        {
                            bulletPoints && bulletPoints.split("\n").map((bullet, idx) => {
                                if (bullet.match(/^\s*$/)) {
                                    return null
                                }

                                return (
                                    <div className="flex flex-row items-center w-fit gap-2 px-2 " key={idx}>
                                        <span className="shadow-md w-2 h-2  bg-secondary rotate-45  text-xs"></span>
                                        <p className="text-secondary italic font-bold font-sans" >
                                            {bullet.replaceAll("-", "")}
                                        </p>
                                    </div>
                                )
                            })
                        }
                    </div>
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
                    <ShareArticleComponent title={title} />
                </div>
            </div>

        </article>
    )
}