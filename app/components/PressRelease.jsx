import React, { useState } from 'react'
import { importanceColor } from "../utils/utils"

export default function PressRelease({ release }) {
    const [show, setShow] = useState()

    return (
        <div className="mb-2 w-full md:min-w-96 bg-foreground p-2 px-4 border border-border border-opacity-10 cursor-pointer  hover:brightness-150" onClick={() => { setShow(!show) }}>
            <div className="w-full flex gap-2 items-center">
                <span>{release.ticker}</span>
                <span>•</span>
                <span>{release.time}</span>
                <div className="flex flex-grow"></div>
                <span className={"p-1 px-2 rounded-sm bg-background  " + importanceColor(release.importance)}>{release.importance}</span>
            </div>
            <h3 className=" font-serif font-bold text-text italic">{release.title}</h3>
            {!show ? <span className="text-xs">Show more...</span> : null}
            {show ? <p className="text-xs font-sans  text-text-muted">{release.summary}</p> : null}
        </div>
    )
}
