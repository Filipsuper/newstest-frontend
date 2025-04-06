import React, { useState } from 'react'
import { importanceColor } from "../utils/utils"
import { Link, useNavigate } from "react-router"

export default function PressRelease({ release }) {
    const [show, setShow] = useState()


    return (
        <div className="relative mb-2 w-full md:min-w-96 bg-foreground p-2 px-4 border border-border border-opacity-10 cursor-pointer  hover:brightness-150" onClick={(e) => { setShow(!show) }}>
            <div className="w-full flex gap-2 items-center " >
                <span>{release.ticker}</span>
                <span>•</span>
                <span>{release.time}</span>
                <div className="flex flex-grow"></div>
                <Link to={"https://mfn.se" + release.link} className="  ">
                    <button className="px-2 py-2 text-xs font-sans text-primary hover:underline cursor-pointer" onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()

                        window.location.href = "https://mfn.se" + release.link

                    }}>
                        Källa
                    </button>
                </Link>
            </div>
            <h3 className=" font-serif font-bold text-text italic">{release.title}</h3>
            {!show ? <span className="text-xs">Show more...</span> : null}
            {show ? <p className="text-xs font-sans  text-text-muted">{release.summary}</p> : null}

        </div >
    )
}
