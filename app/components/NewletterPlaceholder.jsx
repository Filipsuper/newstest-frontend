import React from 'react'
import { FaArrowDown } from "react-icons/fa6";
import { Link } from "react-router";

export default function NewletterPlaceholder({ title, body, isTodaysArticle, isWeekend }) {


    return (
        <div className="w-full flex flex-col items-center justify-center  text-center h-fit relative mb-4">
            <div className={"absolute -top-10 -right-10 h-16 w-96  blur-[200px] " + (title === "Morgonbrevet" ? "bg-secondary" : "bg-primary")}></div>
            <h1 className="text-4xl font-bold ">{title}</h1>
            <p className="text-text-article font-sans text-sm">{body}</p>
            {(!isTodaysArticle && (
                <div className="text-text-article flex text-sm flex-col justify-center font-sans items-center min-h-[50vh] ">
                    {isWeekend ? (
                        <>
                            <span className="font-bold  text-2xl">God dag!</span> <br />
                            Inget morgonbrev under helgen.
                            <br />
                            <span className="text-text-muted ">
                                Nedan hittar du de tidigare artiklarna
                            </span>
                            <Link to="#prev" className="text-text-muted mt-2"><FaArrowDown /></Link>
                        </>
                    ) : (
                        <>
                            Dagens artikel har inte publicerats än
                            <br />
                            <span className="text-text-muted ">
                                Kom tillbaka senare eller läs de tidigare artiklarna
                            </span>
                            <Link to="#prev" className="text-text-muted mt-2"><FaArrowDown /></Link>

                        </>
                    )}
                </div>
            ))}
        </div>
    )
}
