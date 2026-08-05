import React from 'react'
import Link from "next/link";

export default function NewsLettersCTA({ newletterCards }) {
    return (
        <>
            <h2 className="text-4xl font-serif font-bold text-text-article text-center">Våra nyhetsbrev</h2>
            <p className="text-text-muted text-base mt-2  text-center mb-10">
                Morgon- och kvällsbrevet är helt gratis och går att läsa direkt i sidan eller få skickat till din inkorg.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {newletterCards.map((card, index) => (
                    <Link
                        href={card.link}
                        key={index}
                        className="bg-foreground rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow flex flex-col"
                    >
                        <div className="flex flex-row items-center mb-2 gap-2">
                            <h3 className="text-xl font-semibold text-text ">{card.title}</h3>
                            <span>•</span>
                            <span>{card.time}</span>
                        </div>
                        <p className="text-text-muted flex-grow">
                            {card.description}
                        </p>
                        <div className="mt-4 primary-btn w-max self-start">Läs {card.title}</div>
                    </Link>
                ))}
            </div>
        </>
    )
}
