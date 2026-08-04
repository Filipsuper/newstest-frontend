"use client";

import Link from "next/link";
import dayjs from "dayjs";
import { tagLabel, tagColor } from "../utils/newsTags";
import { useModal } from "../providers/ModalProvider";

const formatFactMoney = (value, currency = "SEK") =>
    value != null ? `${Math.round(value).toLocaleString("sv-SE")} ${currency}` : "–";

function InsiderFacts({ facts }) {
    const transactions = facts?.transactions ?? [];
    if (transactions.length === 0) return null;

    return (
        <div className="mt-4 border-t border-border pt-4">
            <span className="text-[11px] uppercase tracking-wider text-text-muted">Transaktioner</span>
            <div className="flex flex-col gap-3 mt-2">
                {transactions.map((tx, idx) => (
                    <div key={idx} className="text-sm text-text-article">
                        <p className="font-semibold text-text">
                            {tx.person}
                            {tx.position && <span className="font-normal text-text-muted"> – {tx.position}</span>}
                        </p>
                        <p className="text-text-muted">
                            {tx.nature === "Acquisition" ? "Köp" : tx.nature === "Disposal" ? "Försäljning" : tx.nature}
                            {tx.volume != null && ` · ${tx.volume.toLocaleString("sv-SE")} st`}
                            {tx.price != null && ` à ${tx.price.toLocaleString("sv-SE")} ${tx.currency ?? ""}`}
                            {tx.transactionDate && ` · ${tx.transactionDate}`}
                        </p>
                    </div>
                ))}
                {facts.grossValue != null && (
                    <p className="text-sm text-text">
                        Totalt värde: <span className="font-semibold">{formatFactMoney(facts.grossValue, facts.currencies?.[0])}</span>
                    </p>
                )}
            </div>
        </div>
    );
}

export default function NewsModal({ item }) {
    const { closeModal } = useModal();
    const time = dayjs(item.ts);

    return (
        <div className="w-full max-w-xl font-sans max-h-[70vh] overflow-y-auto">
            <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-xs">
                <span className="text-text-muted font-semibold">{time.format("D MMM YYYY · HH:mm")}</span>
                {(item.labels ?? []).slice(0, 4).map((tag) => (
                    <span key={tag} className={`border px-1.5 py-0.5 uppercase tracking-wide text-[10px] ${tagColor(tag)}`}>
                        {tagLabel(tag)}
                    </span>
                ))}
            </div>

            <h2 className="text-2xl font-serif font-bold italic text-text mb-3">{item.title}</h2>

            {Number.isFinite(item.reaction?.pct) && (
                <p className="text-sm mb-3">
                    <span className="text-text-muted">Kursreaktion sedan publicering: </span>
                    <span className={`font-semibold ${item.reaction.pct >= 0 ? "text-primary" : "text-secondary"}`}>
                        {item.reaction.pct >= 0 ? "+" : ""}{item.reaction.pct.toFixed(2)}%
                    </span>
                </p>
            )}

            {item.summary && (
                <p className="text-sm text-text-article leading-relaxed">{item.summary}</p>
            )}

            <InsiderFacts facts={item.facts} />

            <div className="flex flex-row justify-between items-center mt-6 pt-4 border-t border-border">
                {item.symbol ? (
                    <Link
                        href={`/aktie/${encodeURIComponent(item.symbol)}`}
                        onClick={() => closeModal()}
                        className="text-primary text-sm hover:underline"
                    >
                        {item.company ?? item.symbol} →
                    </Link>
                ) : <span />}
                {item.url && (
                    <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-text-muted hover:text-text underline"
                    >
                        Läs original
                    </a>
                )}
            </div>
        </div>
    );
}
