"use client";

import Link from "next/link";
import { FiExternalLink } from "react-icons/fi";
import { tagLabel, tagColor } from "../utils/newsTags";
import { useModal } from "../providers/ModalProvider";

// Accepts either the Market API's Story v1 payload (company pages hold the raw
// stories) or the flat shape the live feed renders, so one modal serves both
// instead of each surface growing its own.
function normalizeStory(input = {}) {
    if (input.headline) {
        return {
            publishedAt: input.publishedAt,
            headline: input.headline,
            tags: input.tags ?? [],
            summary: input.summary,
            reaction: input.reaction,
            facts: input.facts,
            companies: input.companies ?? [],
            sources: input.sources?.length
                ? input.sources
                : [input.primarySource].filter(Boolean),
            regulatory: (input.tags ?? []).includes("REGULATORY"),
        };
    }
    return {
        publishedAt: input.ts,
        headline: input.title,
        tags: input.labels ?? [],
        summary: input.summary,
        reaction: input.reaction,
        facts: input.facts,
        companies: input.symbol ? [{ symbol: input.symbol, name: input.company }] : [],
        sources: input.url ? [{ name: input.source, url: input.url }] : [],
        regulatory: input.regulatory,
    };
}

const svDateTime = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Tidpunkt saknas"
        : date.toLocaleString("sv-SE", {
            day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
        });
};

// The wire keeps fact keys in English by contract; the site reads Swedish.
const METRIC_LABELS = {
    revenue: "Omsättning",
    net_sales: "Nettoomsättning",
    gross_profit: "Bruttoresultat",
    ebit: "EBIT",
    ebita: "EBITA",
    ebitda: "EBITDA",
    operating_profit: "Rörelseresultat",
    net_profit: "Nettoresultat",
    eps: "Vinst per aktie",
    cash_flow: "Kassaflöde",
    order_intake: "Orderingång",
    dividend: "Utdelning",
};

const metricLabel = (metric) => METRIC_LABELS[metric.key] ?? metric.label ?? metric.key;

const VERDICTS = {
    beat: ["Över förväntan", "text-primary"],
    miss: ["Under förväntan", "text-secondary"],
    inline: ["I linje", "text-text-muted"],
};

function Section({ title, children }) {
    return (
        <div className="mt-6">
            <span className="text-[11px] uppercase tracking-wider text-text-muted">{title}</span>
            <div className="mt-2">{children}</div>
        </div>
    );
}

function ReportMetrics({ metrics }) {
    if (!metrics?.length) return null;
    return (
        <Section title="Nyckeltal i rapporten">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
                {metrics.map((metric, index) => (
                    <div key={`${metric.key}-${index}`} className="flex flex-col">
                        <dt className="text-xs text-text-muted">{metricLabel(metric)}</dt>
                        <dd className="text-sm font-semibold text-text tabular-nums">{metric.value}</dd>
                    </div>
                ))}
            </dl>
            <p className="mt-3 text-[11px] text-text-muted">
                Siffrorna är hämtade ur bolagets egen rapport. Jämförelsetal inom parentes.
            </p>
        </Section>
    );
}

function EstimateComparisons({ comparisons }) {
    if (!comparisons?.length) return null;
    const source = comparisons.find((row) => row.sourceUrl);
    return (
        <Section title="Utfall mot förväntan">
            <div className="flex flex-col gap-2">
                {comparisons.map((row, index) => {
                    const [label, tone] = VERDICTS[row.verdict] ?? ["", "text-text-muted"];
                    return (
                        <div key={`${row.key}-${index}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                            <span className="text-sm text-text">{metricLabel(row)}</span>
                            <span className="text-sm text-text-article tabular-nums">
                                {row.actualDisplay ?? row.actualAmount}
                                <span className="text-text-muted"> mot {row.estimateDisplay ?? row.estimateAmount}</span>
                            </span>
                            <span className={`text-xs font-semibold ${tone}`}>{label}</span>
                        </div>
                    );
                })}
            </div>
            {source && (
                <p className="mt-3 text-[11px] text-text-muted">
                    Konsensus: {source.source}
                    {source.contributors ? ` · ${source.contributors} bidragsgivare` : ""}
                    {" · "}
                    <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-text">
                        källa
                    </a>
                </p>
            )}
        </Section>
    );
}

function InsiderTransactions({ facts }) {
    const transactions = facts?.transactions ?? [];
    if (!transactions.length) return null;
    const currency = facts.currencies?.[0] ?? "SEK";
    return (
        <Section title="Transaktioner">
            <div className="flex flex-col gap-3">
                {transactions.map((transaction, index) => (
                    <div key={index} className="text-sm text-text-article">
                        <p className="font-semibold text-text">
                            {transaction.person}
                            {transaction.position && (
                                <span className="font-normal text-text-muted"> – {transaction.position}</span>
                            )}
                        </p>
                        <p className="text-text-muted">
                            {transaction.nature === "Acquisition" ? "Köp"
                                : transaction.nature === "Disposal" ? "Försäljning"
                                    : transaction.nature}
                            {transaction.volume != null && ` · ${transaction.volume.toLocaleString("sv-SE")} st`}
                            {transaction.price != null && ` à ${transaction.price.toLocaleString("sv-SE")} ${transaction.currency ?? ""}`}
                            {transaction.transactionDate && ` · ${transaction.transactionDate}`}
                        </p>
                    </div>
                ))}
                {facts.grossValue != null && (
                    <p className="text-sm text-text">
                        Totalt värde:{" "}
                        <span className="font-semibold tabular-nums">
                            {Math.round(facts.grossValue).toLocaleString("sv-SE")} {currency}
                        </span>
                    </p>
                )}
            </div>
        </Section>
    );
}

export default function NewsModal({ item, story }) {
    const { closeModal } = useModal();
    const data = normalizeStory(story ?? item ?? {});
    const facts = data.facts ?? {};
    const reactionPct = Number(data.reaction?.pct);

    return (
        <div className="w-full max-w-2xl font-sans max-h-[74vh] overflow-y-auto">
            <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-xs">
                <span className="text-text-muted font-semibold">{svDateTime(data.publishedAt)}</span>
                {data.regulatory && (
                    <span className="border border-text-muted/40 px-1.5 py-0.5 uppercase tracking-wide text-[10px] text-text-muted">
                        Regulatoriskt
                    </span>
                )}
                {data.tags.filter((tag) => tag !== "REGULATORY").slice(0, 4).map((tag) => (
                    <span key={tag} className={`border px-1.5 py-0.5 uppercase tracking-wide text-[10px] ${tagColor(tag)}`}>
                        {tagLabel(tag)}
                    </span>
                ))}
            </div>

            <h2 className="text-2xl font-serif font-bold italic text-text mb-3">{data.headline}</h2>

            {Number.isFinite(reactionPct) && (
                <p className="text-sm mb-4">
                    <span className="text-text-muted">Kursreaktion sedan publicering: </span>
                    <span className={`font-semibold tabular-nums ${reactionPct >= 0 ? "text-primary" : "text-secondary"}`}>
                        {reactionPct >= 0 ? "+" : ""}{reactionPct.toFixed(2)}%
                    </span>
                </p>
            )}

            {data.summary && <p className="text-sm text-text-article leading-relaxed">{data.summary}</p>}

            {facts.money?.display && !facts.reportMetrics && (
                <p className="mt-4 text-sm text-text">
                    Belopp: <span className="font-semibold tabular-nums">{facts.money.display}</span>
                </p>
            )}

            <ReportMetrics metrics={facts.reportMetrics} />
            <EstimateComparisons comparisons={facts.estimateComparisons} />
            <InsiderTransactions facts={facts} />

            {data.companies.length > 0 && (
                <Section title={data.companies.length > 1 ? "Berörda bolag" : "Bolag"}>
                    <div className="flex flex-row flex-wrap gap-x-4 gap-y-2">
                        {data.companies.slice(0, 6).map((company) => (
                            <Link
                                key={company.symbol}
                                href={`/aktie/${encodeURIComponent(company.symbol)}`}
                                onClick={() => closeModal()}
                                className="text-sm text-primary hover:underline"
                            >
                                {company.name ?? company.symbol} →
                            </Link>
                        ))}
                    </div>
                </Section>
            )}

            {data.sources.length > 0 && (() => {
                // One release can arrive through several wires and even several
                // URLs on the same wire. The reader wants the issuer's own
                // publication, so only the canonical source is offered.
                const original = data.sources.find((source) => source.url);
                return (
                    <div className="mt-8 flex flex-row flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
                        <span>Källa: {data.sources[0].publisher ?? data.sources[0].name}</span>
                        {original && (
                            <a
                                href={original.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 hover:text-text underline"
                            >
                                Läs original <FiExternalLink />
                            </a>
                        )}
                    </div>
                );
            })()}
        </div>
    );
}
