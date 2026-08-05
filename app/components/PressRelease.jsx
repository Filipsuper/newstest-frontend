"use client";

import React, { useState } from 'react'
import Link from "next/link"
import { importanceColor, tickerToSymbol } from "../utils/utils"
import { useModal } from '../providers/ModalProvider'

export default function PressRelease({ release }) {
    const { openModal, closeModal } = useModal();

    const handleShowMore = () => {
        openModal(
            <div className="w-full max-w-xl font-sans">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <Link
                            href={`/aktie/${encodeURIComponent(tickerToSymbol(release.ticker))}`}
                            className="font-bold text-primary hover:underline"
                            onClick={() => closeModal()}
                        >
                            {release.ticker}
                        </Link>
                        <span className="mx-2">•</span>
                        <span className="text-text-muted">{release.time}</span>
                    </div>
                </div>
                <h3 className="font-serif font-bold text-text italic text-lg mb-4">{release.title}</h3>
                <p className="text-sm text-text-muted">{release.summary}</p>
                <div className="mt-4 flex justify-end">
                    <a
                        href={"https://mfn.se" + release.link}
                        className="text-primary hover:underline text-sm"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Läs mer på MFN →
                    </a>
                </div>
            </div>
        );
    };

    return (
        <div
            className="relative mb-2 w-full md:min-w-96 bg-foreground rounded-xl p-2 px-4 cursor-pointer hover:brightness-110"
            onClick={handleShowMore}
        >
            <div className="w-full flex gap-2 items-center">
                <Link
                    href={`/aktie/${encodeURIComponent(tickerToSymbol(release.ticker))}`}
                    className="text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                >
                    {release.ticker}
                </Link>
                <span>•</span>
                <span>{release.time}</span>
                <div className="flex flex-grow"></div>
                <a href={"https://mfn.se" + release.link} className="">
                    <button
                        className="px-2 py-2 text-xs font-sans text-primary hover:underline cursor-pointer"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            window.location.href = "https://mfn.se" + release.link
                        }}
                    >
                        Källa
                    </button>
                </a>
            </div>
            <h3 className="font-serif font-bold text-text italic">{release.title}</h3>
            <span className="text-xs">Show more...</span>
        </div>
    )
}
