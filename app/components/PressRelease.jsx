import React, { useState } from 'react'
import { importanceColor } from "../utils/utils"
import { Link, useNavigate } from "react-router"
import { useModal } from '../providers/ModalProvider'

export default function PressRelease({ release }) {
    const { openModal, closeModal } = useModal();

    const handleShowMore = () => {
        openModal(
            <div className="w-full max-w-xl font-sans">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <span className="font-bold">{release.ticker}</span>
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
            className="relative mb-2 w-full md:min-w-96 bg-foreground p-2 px-4 border border-border border-opacity-10 cursor-pointer hover:brightness-110"
            onClick={handleShowMore}
        >
            <div className="w-full flex gap-2 items-center">
                <span>{release.ticker}</span>
                <span>•</span>
                <span>{release.time}</span>
                <div className="flex flex-grow"></div>
                <a to={"https://mfn.se" + release.link} className="">
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
