"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiArrowRight, FiSearch, FiX } from "react-icons/fi";
import { fetchCompanyProfiles } from "../utils/api";
import { getCompanies } from "../utils/companies";

const PAGE_SIZE = 12;

const PROFILE_AXES = [
    { key: "value", label: "Värde" },
    { key: "growth", label: "Tillväxt" },
    { key: "past", label: "Historik" },
    { key: "health", label: "Hälsa" },
    { key: "insiders", label: "Insyn" },
    { key: "dividend", label: "Utdelning" },
];

const SEGMENT_FILTERS = [
    { value: "all", label: "Alla" },
    { value: "large", label: "Large Cap" },
    { value: "mid", label: "Mid Cap" },
    { value: "small", label: "Small Cap" },
    { value: "first_north", label: "First North" },
    { value: "spotlight", label: "Spotlight" },
];

const SORT_OPTIONS = [
    { value: "movement", label: "Störst rörelse" },
    { value: "gainers", label: "Stiger mest" },
    { value: "losers", label: "Faller mest" },
    { value: "name", label: "Namn A–Ö" },
];

const finite = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const normalizedSearch = (value = "") => value
    .toLocaleLowerCase("sv-SE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const segmentGroup = (company = {}) => {
    const source = `${company.segment ?? ""} ${company.market ?? ""}`
        .toLocaleUpperCase("sv-SE")
        .replace(/[^A-ZÅÄÖ0-9]+/g, "_");

    if (source.includes("FIRST_NORTH") || source.includes("FIRSTNORTH")) return "first_north";
    if (source.includes("SPOTLIGHT")) return "spotlight";
    if (source.includes("LARGE")) return "large";
    if (source.includes("MID")) return "mid";
    if (source.includes("SMALL")) return "small";
    return "other";
};

const segmentLabel = (company) => (
    SEGMENT_FILTERS.find((option) => option.value === segmentGroup(company))?.label
    ?? company.segment
    ?? company.market
    ?? "Lista saknas"
);

const formatPrice = (value) => {
    const price = finite(value);
    if (price === null) return "Saknas";
    return `${price.toLocaleString("sv-SE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: Math.abs(price) < 1 ? 4 : 2,
    })} kr`;
};

const formatChange = (value) => {
    const change = finite(value);
    if (change === null) return "Saknas";
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
};

const polarPoint = (index, radius, center = 95) => {
    const angle = ((index * 60) - 90) * (Math.PI / 180);
    return {
        x: center + (Math.cos(angle) * radius),
        y: center + (Math.sin(angle) * radius),
    };
};

const smoothClosedPath = (points, tension = 0.72) => {
    if (points.length < 3) return "";
    const control = tension / 6;
    let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

    points.forEach((current, index) => {
        const previous = points[(index - 1 + points.length) % points.length];
        const next = points[(index + 1) % points.length];
        const after = points[(index + 2) % points.length];
        const cp1 = {
            x: current.x + ((next.x - previous.x) * control),
            y: current.y + ((next.y - previous.y) * control),
        };
        const cp2 = {
            x: next.x - ((after.x - current.x) * control),
            y: next.y - ((after.y - current.y) * control),
        };
        path += ` C ${cp1.x.toFixed(2)} ${cp1.y.toFixed(2)}, ${cp2.x.toFixed(2)} ${cp2.y.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
    });

    return `${path} Z`;
};

function CompanyProfile({ companyName, loading, profile }) {
    const radius = 53;
    const profileByKey = new Map(
        (Array.isArray(profile?.axes) ? profile.axes : []).map((axis) => [axis.key, axis]),
    );
    const axes = PROFILE_AXES.map((axis) => {
        const score = finite(profileByKey.get(axis.key)?.score);
        return { ...axis, score: score === null ? null : Math.max(0, Math.min(5, score)) };
    });
    const points = axes.map((axis, index) => ({
        ...polarPoint(index, radius * (0.14 + (((axis.score ?? 0) / 5) * 0.86))),
        missing: axis.score === null,
    }));
    const labels = PROFILE_AXES.map((axis, index) => {
        const position = polarPoint(index, 76);
        const direction = position.x - 95;
        return {
            ...axis,
            ...position,
            anchor: direction > 12 ? "start" : direction < -12 ? "end" : "middle",
        };
    });
    const availableScores = axes.filter((axis) => axis.score !== null).length;
    const hasProfile = Boolean(profile) && availableScores > 0;
    const completeProfile = availableScores === PROFILE_AXES.length;
    const stateClass = loading ? " is-loading" : hasProfile ? "" : " is-empty";
    const description = loading
        ? `Bolagsprofil för ${companyName} laddas`
        : hasProfile
            ? `${companyName}: ${axes.map((axis) => `${axis.label} ${axis.score ?? "saknas"} av 5`).join(", ")}`
            : `Bolagsprofil saknas för ${companyName}`;

    return (
        <svg
            className={`stock-profile${stateClass}`}
            viewBox="0 0 190 190"
            role="img"
            aria-label={description}
        >
            <title>{description}</title>
            {[1, 2, 3].map((ring) => (
                <circle
                    key={ring}
                    className="stock-profile__ring"
                    cx="95"
                    cy="95"
                    r={(radius * ring) / 3}
                />
            ))}
            {PROFILE_AXES.map((axis, index) => {
                const endpoint = polarPoint(index, radius);
                return (
                    <line
                        key={axis.key}
                        className="stock-profile__spoke"
                        x1="95"
                        y1="95"
                        x2={endpoint.x}
                        y2={endpoint.y}
                    />
                );
            })}

            {loading && <circle className="stock-profile__placeholder" cx="95" cy="95" r="28" />}
            {completeProfile && (
                <>
                    <path className="stock-profile__shape" d={smoothClosedPath(points)} />
                </>
            )}
            {hasProfile && !completeProfile && points.map((point, index) => (
                point.missing ? null : (
                    <line
                        key={`measure-${PROFILE_AXES[index].key}`}
                        className="stock-profile__measure"
                        x1="95"
                        y1="95"
                        x2={point.x}
                        y2={point.y}
                    />
                )
            ))}
            {hasProfile && points.map((point, index) => (
                point.missing ? null : (
                    <circle
                        key={PROFILE_AXES[index].key}
                        className="stock-profile__point"
                        cx={point.x}
                        cy={point.y}
                        r="2.1"
                    />
                )
            ))}

            {labels.map((label, index) => (
                <text
                    key={label.key}
                    className="stock-profile__label"
                    x={label.x}
                    y={label.y - 3}
                    textAnchor={label.anchor}
                >
                    <tspan x={label.x}>{label.label}</tspan>
                    <tspan className="stock-profile__score" x={label.x} dy="10">
                        {loading ? "·" : axes[index].score ?? "–"}
                    </tspan>
                </text>
            ))}
        </svg>
    );
}

function CompanyCard({ company, profile }) {
    const symbol = company.nativeSymbol ?? company.symbol?.replace(/\.ST$/i, "") ?? company.symbol;
    const change = finite(company.changePct);
    const profileLoading = profile === undefined || profile === null;
    const profileAvailable = Boolean(profile);
    const coverage = finite(profile?.coveragePct);

    return (
        <Link
            className="stock-card"
            href={`/aktie/${encodeURIComponent(company.symbol)}`}
            aria-label={`Öppna ${company.name}`}
        >
            <header className="stock-card__header">
                <span>
                    <strong>{company.name}</strong>
                    <small>{symbol}</small>
                </span>
                <FiArrowRight aria-hidden="true" />
            </header>

            <div className="stock-card__body">
                <CompanyProfile
                    companyName={company.name}
                    loading={profileLoading}
                    profile={profileAvailable ? profile : null}
                />
                <dl>
                    <div>
                        <dt>Kurs</dt>
                        <dd>{formatPrice(company.price)}</dd>
                    </div>
                    <div>
                        <dt>Utveckling</dt>
                        <dd className={change > 0 ? "market-positive" : change < 0 ? "market-negative" : ""}>
                            {formatChange(change)}
                        </dd>
                    </div>
                    <div>
                        <dt>Lista</dt>
                        <dd>{segmentLabel(company)}</dd>
                    </div>
                </dl>
            </div>

            <footer className="stock-card__footer">
                <span title={company.sector ?? company.yahooSector ?? "Sektor saknas"}>
                    {company.sector ?? company.yahooSector ?? "Sektor saknas"}
                </span>
                <small>
                    {profileLoading
                        ? "Profil laddas"
                        : profileAvailable
                            ? coverage === null
                                ? "Profil tillgänglig"
                                : `${Math.round(coverage)} % underlag`
                            : "Profil saknas"}
                </small>
            </footer>
        </Link>
    );
}

export default function StocksDirectoryPage({ companies = [] }) {
    const [rows, setRows] = useState(companies);
    const [query, setQuery] = useState("");
    const [segment, setSegment] = useState("all");
    const [sector, setSector] = useState("all");
    const [sort, setSort] = useState("movement");
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [profiles, setProfiles] = useState({});

    useEffect(() => {
        if (!companies.length) getCompanies().then(setRows);
    }, [companies]);

    const sortedRows = useMemo(
        () => rows.filter((company) => company?.symbol && company?.name),
        [rows],
    );
    const sectors = useMemo(
        () => [...new Set(sortedRows.map((company) => company.sector ?? company.yahooSector).filter(Boolean))]
            .sort((left, right) => left.localeCompare(right, "sv-SE")),
        [sortedRows],
    );
    const availableSegments = useMemo(() => {
        const groups = new Set(sortedRows.map(segmentGroup));
        return SEGMENT_FILTERS.filter((option) => option.value === "all" || groups.has(option.value));
    }, [sortedRows]);

    const filtered = useMemo(() => {
        const needle = normalizedSearch(query);
        const result = sortedRows.filter((company) => {
            if (segment !== "all" && segmentGroup(company) !== segment) return false;
            const companySector = company.sector ?? company.yahooSector;
            if (sector !== "all" && companySector !== sector) return false;
            if (!needle) return true;
            return normalizedSearch([
                company.name,
                company.nativeSymbol,
                company.symbol,
                companySector,
            ].filter(Boolean).join(" ")).includes(needle);
        });

        return result.sort((left, right) => {
            if (sort === "name") return left.name.localeCompare(right.name, "sv-SE");

            const leftChange = finite(left.changePct);
            const rightChange = finite(right.changePct);
            if (sort === "movement") {
                if (leftChange === null && rightChange === null) {
                    return left.name.localeCompare(right.name, "sv-SE");
                }
                if (leftChange === null) return 1;
                if (rightChange === null) return -1;
                return Math.abs(rightChange) - Math.abs(leftChange)
                    || left.name.localeCompare(right.name, "sv-SE");
            }
            if (sort === "gainers" || sort === "losers") {
                if (leftChange === null && rightChange === null) {
                    return left.name.localeCompare(right.name, "sv-SE");
                }
                if (leftChange === null) return 1;
                if (rightChange === null) return -1;
                const movementOrder = sort === "gainers"
                    ? rightChange - leftChange
                    : leftChange - rightChange;
                return movementOrder || left.name.localeCompare(right.name, "sv-SE");
            }

            return left.name.localeCompare(right.name, "sv-SE");
        });
    }, [query, sector, segment, sort, sortedRows]);

    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [query, sector, segment, sort]);

    const visible = filtered.slice(0, visibleCount);
    const visibleSymbolsKey = visible.map((company) => company.symbol).join("|");

    useEffect(() => {
        const symbols = visibleSymbolsKey.split("|").filter(Boolean);
        const requested = symbols.filter(
            (symbol) => !Object.prototype.hasOwnProperty.call(profiles, symbol),
        );
        if (!requested.length) return undefined;

        setProfiles((current) => {
            const next = { ...current };
            requested.forEach((symbol) => {
                if (!Object.prototype.hasOwnProperty.call(next, symbol)) next[symbol] = null;
            });
            return next;
        });

        const loadProfiles = async () => {
            for (let start = 0; start < requested.length; start += PAGE_SIZE) {
                const batch = requested.slice(start, start + PAGE_SIZE);
                const response = await fetchCompanyProfiles(batch);
                const bySymbol = new Map(response.items.map((item) => [item.symbol, item]));
                setProfiles((current) => {
                    const next = { ...current };
                    batch.forEach((symbol) => {
                        next[symbol] = bySymbol.get(symbol) ?? false;
                    });
                    return next;
                });
            }
        };

        loadProfiles();
        return undefined;
        // Profile state is intentionally read at the start of each visible batch.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleSymbolsKey]);

    const resetFilters = () => {
        setQuery("");
        setSegment("all");
        setSector("all");
        setSort("movement");
    };

    return (
        <main className="stock-catalog">
            <header className="stock-catalog__header">
                <div>
                    <p className="market-kicker">Aktier</p>
                    <h1>Utforska svenska börsbolag</h1>
                </div>
                <label className="stock-catalog__search">
                    <span className="sr-only">Sök bolag eller ticker</span>
                    <FiSearch aria-hidden="true" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Sök bolag eller ticker"
                    />
                    {query && (
                        <button type="button" onClick={() => setQuery("")} aria-label="Rensa sökning">
                            <FiX aria-hidden="true" />
                        </button>
                    )}
                </label>
            </header>

            <section className="stock-catalog__controls" aria-label="Filtrera bolag">
                <div className="stock-catalog__segments" role="group" aria-label="Välj marknadslista">
                    {availableSegments.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={segment === option.value ? "is-active" : ""}
                            aria-pressed={segment === option.value}
                            onClick={() => setSegment(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                <div className="stock-catalog__selects">
                    <label>
                        <span className="sr-only">Filtrera på sektor</span>
                        <select value={sector} onChange={(event) => setSector(event.target.value)}>
                            <option value="all">Alla sektorer</option>
                            {sectors.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </label>
                    <label>
                        <span className="sr-only">Sortera bolag</span>
                        <select value={sort} onChange={(event) => setSort(event.target.value)}>
                            {SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                </div>
            </section>

            <section className="stock-catalog__results" aria-labelledby="stock-results-heading">
                <div className="stock-catalog__results-heading">
                    <h2 id="stock-results-heading">Bolag</h2>
                    <span>{filtered.length.toLocaleString("sv-SE")} träffar</span>
                </div>

                {sortedRows.length === 0 ? (
                    <div className="stock-catalog__empty">
                        <strong>Bolagsregistret kunde inte hämtas</strong>
                        <span>Försök igen om en stund.</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="stock-catalog__empty">
                        <strong>Inga bolag matchar filtren</strong>
                        <button type="button" onClick={resetFilters}>Rensa filter</button>
                    </div>
                ) : (
                    <>
                        <div className="stock-catalog__grid">
                            {visible.map((company) => (
                                <CompanyCard
                                    key={company.symbol}
                                    company={company}
                                    profile={profiles[company.symbol]}
                                />
                            ))}
                        </div>
                        {visible.length < filtered.length && (
                            <button
                                className="stock-catalog__more"
                                type="button"
                                onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
                            >
                                Visa fler bolag
                            </button>
                        )}
                    </>
                )}
            </section>
        </main>
    );
}
