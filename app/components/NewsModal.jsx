"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { FiExternalLink } from "react-icons/fi";
import { tagLabel, tagColor } from "../utils/newsTags";
import { useModal } from "../providers/ModalProvider";
import { fetchStory } from "../utils/api";

// Accepts either the Market API's Story v1 payload (company pages hold the raw
// stories) or the flat shape the live feed renders, so one modal serves both
// instead of each surface growing its own.
function normalizeStory(input = {}) {
    if (input.headline) {
        return {
            id: input.id,
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
        id: input.id,
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

// The wire normalises every release with re.sub(r"\s+", " ", …) before storing
// it, so the text arrives as one run with no line breaks and no column
// alignment. What survives is whatever list markers were characters in the
// source, and splitting on those beats presenting a 4,000-character wall.
//
// The paragraph and table branches below are for text that kept its shape:
// they do nothing today and start working by themselves if the wire ever
// preserves the original alongside the normalised copy.
const BULLET = /\s+[*•]\s+/;
const isTabularLine = (line) => (line.match(/ {2,}/g) ?? []).length >= 2;

function classifyBlock(block) {
    const lines = block.split("\n").filter((line) => line.trim());
    const tabular = lines.filter(isTabularLine).length;
    return {
        kind: lines.length >= 2 && tabular >= Math.max(2, Math.ceil(lines.length * 0.6)) ? "table" : "p",
        text: block,
    };
}

function releaseBlocks(text) {
    const paragraphs = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
    if (paragraphs.length > 1) return paragraphs.map(classifyBlock);

    const flat = paragraphs[0] ?? "";
    const parts = flat.split(BULLET).map((part) => part.trim()).filter(Boolean);
    if (parts.length < 3) return [classifyBlock(flat)];
    const [lead, ...items] = parts;
    return [classifyBlock(lead), ...items.map((item) => ({ kind: "li", text: item }))];
}

function ReleaseText({ text }) {
    const blocks = releaseBlocks(text);
    return (
        <div className="mt-4 flex flex-col gap-3">
            {blocks.map((block, index) => {
                if (block.kind === "table") {
                    return (
                        <pre
                            key={index}
                            className="overflow-x-auto rounded-md bg-shadow/40 px-3 py-2 font-mono text-[11.5px] leading-[1.55] text-text-article"
                        >
                            {block.text}
                        </pre>
                    );
                }
                if (block.kind === "li") {
                    return (
                        <div key={index} className="flex gap-2 text-sm leading-relaxed text-text-article">
                            <span aria-hidden="true" className="text-text-muted">•</span>
                            <span>{block.text}</span>
                        </div>
                    );
                }
                return (
                    <p key={index} className="whitespace-pre-wrap text-sm leading-relaxed text-text-article">
                        {block.text}
                    </p>
                );
            })}
        </div>
    );
}

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

// The reaction as a picture: percent vs the pre-publication baseline, minute
// by minute from half an hour before the news to four hours after. The zero
// line is the baseline, the dashed marker is the publication moment, and the
// area flips to the negative color below zero. Plain SVG on the site's tokens.
function ReactionChart({ series, publishedAt }) {
    const id = useId().replace(/[^a-z0-9]/gi, "");
    const [hover, setHover] = useState(null);
    const points = series?.points ?? [];

    const geometry = useMemo(() => {
        if (points.length < 3) return null;
        const width = 620;
        const height = 130;
        const pad = { left: 44, right: 10, top: 12, bottom: 20 };
        const publishTs = Date.parse(publishedAt);
        const t0 = Math.min(points[0].t, publishTs);
        const t1 = points[points.length - 1].t;
        if (!(t1 > t0)) return null;
        const values = points.map((point) => point.pct);
        const top = Math.max(0, ...values);
        const bottom = Math.min(0, ...values);
        const span = (top - bottom) || 1;
        const x = (t) => pad.left + ((t - t0) / (t1 - t0)) * (width - pad.left - pad.right);
        const y = (pct) => pad.top + ((top - pct) / span) * (height - pad.top - pad.bottom);
        return { width, height, pad, publishTs, t0, t1, top, bottom, x, y, zero: y(0) };
    }, [points, publishedAt]);

    if (!geometry) return null;
    const { width, height, pad, publishTs, top, bottom, x, y, zero } = geometry;

    const line = points.map((point, index) => `${index ? "L" : "M"}${x(point.t).toFixed(1)},${y(point.pct).toFixed(1)}`).join(" ");
    const area = `M${x(points[0].t).toFixed(1)},${zero.toFixed(1)} ${points.map((point) => `L${x(point.t).toFixed(1)},${y(point.pct).toFixed(1)}`).join(" ")} L${x(points[points.length - 1].t).toFixed(1)},${zero.toFixed(1)} Z`;
    const svTime = (t) => new Date(t).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm" });
    const pctLabel = (value) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

    const onMove = (event) => {
        const svg = event.currentTarget;
        const rect = svg.getBoundingClientRect();
        const t = geometry.t0 + ((event.clientX - rect.left) / rect.width * width - pad.left) / (width - pad.left - pad.right) * (geometry.t1 - geometry.t0);
        let nearest = points[0];
        for (const point of points) {
            if (Math.abs(point.t - t) < Math.abs(nearest.t - t)) nearest = point;
        }
        setHover(nearest);
    };

    const toneClipped = (tone) => (
        <g clipPath={`url(#reaction-clip-${tone}-${id})`}>
            <path d={area} fill={`url(#reaction-fill-${tone}-${id})`} />
            <path
                d={line}
                fill="none"
                stroke={tone === "neg" ? "var(--company-negative)" : "var(--company-blue)"}
                strokeWidth="1.6"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
        </g>
    );

    return (
        <div className="mb-5">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-auto"
                role="img"
                aria-label="Kursreaktion i procent mot baslinjen, minut för minut kring publiceringen"
                onMouseMove={onMove}
                onMouseLeave={() => setHover(null)}
            >
                <defs>
                    <linearGradient id={`reaction-fill-pos-${id}`} gradientUnits="userSpaceOnUse" x1="0" y1={pad.top} x2="0" y2={zero}>
                        <stop offset="0" stopColor="var(--company-blue)" stopOpacity="0.32" />
                        <stop offset="1" stopColor="var(--company-blue)" stopOpacity="0.03" />
                    </linearGradient>
                    <linearGradient id={`reaction-fill-neg-${id}`} gradientUnits="userSpaceOnUse" x1="0" y1={zero} x2="0" y2={height - pad.bottom}>
                        <stop offset="0" stopColor="var(--company-negative)" stopOpacity="0.03" />
                        <stop offset="1" stopColor="var(--company-negative)" stopOpacity="0.32" />
                    </linearGradient>
                    <clipPath id={`reaction-clip-pos-${id}`}><rect x="0" y="0" width={width} height={zero} /></clipPath>
                    <clipPath id={`reaction-clip-neg-${id}`}><rect x="0" y={zero} width={width} height={height - zero} /></clipPath>
                </defs>

                {/* baseline (0 %) and extremes */}
                <line x1={pad.left} x2={width - pad.right} y1={zero} y2={zero} stroke="var(--company-grid-line)" strokeWidth="1" />
                {[top, bottom].filter((value) => value !== 0).map((value) => (
                    <text key={value} x={pad.left - 6} y={y(value) + 3} textAnchor="end" fontSize="10" fill="var(--color-text-muted)">{pctLabel(value)}</text>
                ))}
                <text x={pad.left - 6} y={zero + 3} textAnchor="end" fontSize="10" fill="var(--color-text-muted)">0%</text>

                {/* publication marker */}
                {publishTs >= geometry.t0 && publishTs <= geometry.t1 && (
                    <>
                        <line x1={x(publishTs)} x2={x(publishTs)} y1={pad.top} y2={height - pad.bottom} stroke="var(--color-text-muted)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                        <text x={x(publishTs) + 4} y={pad.top + 8} fontSize="10" fill="var(--color-text-muted)">Publicering {svTime(publishTs)}</text>
                    </>
                )}

                {toneClipped("pos")}
                {bottom < 0 && toneClipped("neg")}

                {/* time axis: start and end */}
                <text x={pad.left} y={height - 6} fontSize="10" fill="var(--color-text-muted)">{svTime(geometry.t0)}</text>
                <text x={width - pad.right} y={height - 6} textAnchor="end" fontSize="10" fill="var(--color-text-muted)">{svTime(geometry.t1)}</text>

                {hover && (
                    <>
                        <circle cx={x(hover.t)} cy={y(hover.pct)} r="3" fill={hover.pct < 0 ? "var(--company-negative)" : "var(--company-blue)"} />
                        <text
                            x={Math.min(Math.max(x(hover.t), pad.left + 30), width - pad.right - 30)}
                            y={y(hover.pct) - 8}
                            textAnchor="middle"
                            fontSize="10.5"
                            fontWeight="600"
                            fill="var(--color-text)"
                        >
                            {svTime(hover.t)} · {pctLabel(hover.pct)}
                        </text>
                    </>
                )}
            </svg>
            <p className="text-[11px] text-text-muted mt-1">
                Kursutveckling i procent mot senaste avslut före publiceringen, 30 min före till 4 h efter nyheten.
            </p>
        </div>
    );
}

export default function NewsModal({ item, story }) {
    const { closeModal } = useModal();
    const data = normalizeStory(story ?? item ?? {});
    const facts = data.facts ?? {};
    const reactionPct = Number(data.reaction?.pct);

    // The story opens instantly from what the page already holds; the release
    // it was built from is fetched alongside and fills in underneath.
    const [release, setRelease] = useState(null);
    const [reactionSeries, setReactionSeries] = useState(null);
    const [loadingRelease, setLoadingRelease] = useState(Boolean(data.id));
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (!data.id) return undefined;
        let active = true;
        setRelease(null);
        setReactionSeries(null);
        setExpanded(false);
        setLoadingRelease(true);
        fetchStory(data.id)
            .then((detail) => {
                if (!active) return;
                setRelease(detail?.document ?? null);
                setReactionSeries(detail?.reactionSeries ?? null);
            })
            .catch(() => { /* the summary and source link still stand on their own */ })
            .finally(() => { if (active) setLoadingRelease(false); });
        return () => { active = false; };
    }, [data.id]);

    const body = release?.body?.trim() ?? "";
    const preamble = release?.preamble?.trim() ?? "";
    // With figures to read, the release folds away: the numbers answer most
    // questions and the full text is there for the ones they do not.
    const hasFigures = Boolean(facts.reportMetrics?.length || facts.estimateComparisons?.length);
    const collapsible = hasFigures && Boolean(body);
    const showBody = Boolean(body) && (!collapsible || expanded);

    return (
        <div className="w-[min(660px,86vw)] font-sans max-h-[78vh] overflow-y-auto pr-1">
            <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 mb-3 pr-6 text-xs">
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
                <p className="text-sm mb-4 flex flex-row flex-wrap gap-x-4 gap-y-1">
                    <span>
                        <span className="text-text-muted">Kursreaktion sedan publicering: </span>
                        <span className={`font-semibold tabular-nums ${reactionPct >= 0 ? "text-primary" : "text-secondary"}`}>
                            {reactionPct >= 0 ? "+" : ""}{reactionPct.toFixed(2)}%
                        </span>
                    </span>
                    {/* Fixed windows are final numbers — they only render once the
                        window has closed, so they never tick. */}
                    {[
                        ["Första avslut", data.reaction?.tickPct],
                        ["+1 min", data.reaction?.m1Pct],
                        ["+5 min", data.reaction?.m5Pct],
                        ["+15 min", data.reaction?.m15Pct],
                        ["+1h", data.reaction?.h1Pct],
                        ["+1 dag", data.reaction?.d1Pct],
                    ].map(([label, value]) =>
                        Number.isFinite(value) ? (
                            <span key={label} title={`Kursreaktion ${label === "Första avslut" ? "vid första avslutet" : label} efter publicering`}>
                                <span className="text-text-muted">{label}: </span>
                                <span className={`font-semibold tabular-nums ${value >= 0 ? "text-primary" : "text-secondary"}`}>
                                    {value >= 0 ? "+" : ""}{value.toFixed(2)}%
                                </span>
                            </span>
                        ) : null
                    )}
                </p>
            )}

            <ReactionChart series={reactionSeries} publishedAt={data.publishedAt} />

            {data.summary && <p className="text-sm text-text-article leading-relaxed">{data.summary}</p>}

            {facts.money?.display && !facts.reportMetrics && (
                <p className="mt-4 text-sm text-text">
                    Belopp: <span className="font-semibold tabular-nums">{facts.money.display}</span>
                </p>
            )}

            <ReportMetrics metrics={facts.reportMetrics} />
            <EstimateComparisons comparisons={facts.estimateComparisons} />
            <InsiderTransactions facts={facts} />

            {preamble && preamble !== data.summary && !collapsible && (
                <p className="mt-5 text-sm font-semibold leading-relaxed text-text">{preamble}</p>
            )}

            {collapsible && (
                <button
                    type="button"
                    onClick={() => setExpanded((open) => !open)}
                    className="mt-6 text-xs text-text-muted hover:text-text cursor-pointer"
                >
                    {expanded ? "▾ Dölj pressmeddelandet" : "▸ Läs hela pressmeddelandet"}
                </button>
            )}

            {loadingRelease && !body && (
                <p className="mt-5 text-xs text-text-muted">Hämtar pressmeddelandet…</p>
            )}

            {showBody && <ReleaseText text={body} />}

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
