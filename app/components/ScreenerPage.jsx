"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    FiArrowDown,
    FiArrowUp,
    FiInfo,
    FiPlus,
    FiRefreshCw,
    FiX,
} from "react-icons/fi";
import { fetchScreener } from "../utils/api";
import Dropdown from "./Dropdown";
import PlusPaywall from "./PlusPaywall";

const REFRESH_MS = 60_000;

const METRICS = {
    marketCap: { label: "Börsvärde", unit: "mdr kr", step: "1", description: "Aktiekurs multiplicerad med senast rapporterat antal utestående aktier. Visas i miljarder kronor." },
    revenueGrowthPct: { label: "Omsättningstillväxt", unit: "%", step: "1", description: "Förändringen i omsättning jämfört med föregående rapporterade helår." },
    ebitMarginPct: { label: "EBIT-marginal", unit: "%", step: "1", description: "Rörelseresultat, EBIT, som andel av omsättningen för senast rapporterade helår." },
    roePct: { label: "Avkastning på eget kapital", unit: "%", step: "1", description: "Årets nettoresultat dividerat med eget kapital för senast rapporterade helår." },
    pe: { label: "P/E", unit: "x", step: "1", description: "Aktiekurs dividerad med rapporterad vinst per aktie. Negativ eller extremt hög P/E visas som Saknas." },
    ps: { label: "P/S", unit: "x", step: "0.1", description: "Bolagets börsvärde dividerat med omsättningen för senast rapporterade helår." },
    evEbit: { label: "EV/EBIT", unit: "x", step: "1", description: "Börsvärde plus nettoskuld dividerat med rapporterat EBIT. Negativt EBIT ger inget värde." },
    netDebtToEbitda: { label: "Nettoskuld/EBITDA", unit: "x", step: "0.5", description: "Rapporterad nettoskuld dividerad med EBITDA för senaste helåret. Ett negativt värde kan indikera nettokassa." },
    changePct: { label: "Dagens utveckling", unit: "%", step: "1", description: "Kursförändringen sedan föregående handelsdags stängning." },
    rvolAtTime: { label: "Relativ volym", unit: "x", step: "0.1", description: "Dagens ackumulerade volym jämförd med normal volym vid samma tidpunkt under tidigare handelsdagar." },
    return15mPct: { label: "Utveckling 15 min", unit: "%", step: "0.5", description: "Kursförändringen under de senaste 15 minuterna i OMXsums sparade marknadsflöde." },
    gapPct: { label: "Öppningsgap", unit: "%", step: "0.5", description: "Skillnaden mellan dagens öppningskurs och föregående handelsdags stängningskurs." },
};

const FILTER_GROUPS = [
    {
        label: "Finansiellt",
        metrics: ["marketCap", "revenueGrowthPct", "ebitMarginPct", "roePct", "netDebtToEbitda"],
    },
    { label: "Värdering", metrics: ["pe", "ps", "evEbit"] },
    { label: "Tekniskt", metrics: ["changePct", "rvolAtTime", "return15mPct", "gapPct"] },
];

const METRIC_DROPDOWN_GROUPS = FILTER_GROUPS.map((group) => ({
    label: group.label,
    options: group.metrics.map((value) => ({ value, label: METRICS[value].label })),
}));

const OPERATOR_OPTIONS = [
    { value: "gt", label: "Över" },
    { value: "lt", label: "Under" },
];

const PILL_LABELS = {
    roePct: "ROE",
    pe: "PE",
    ps: "PS",
    return15mPct: "15 min",
};

const COLUMNS = [
    { key: "company", label: "Bolag", align: "left" },
    { key: "price", label: "Kurs", format: "price" },
    { key: "changePct", label: "Idag", format: "signedPct" },
    { key: "marketCap", label: "Börsvärde", format: "marketCap" },
    { key: "revenueGrowthPct", label: "Oms.tillväxt", format: "signedPct" },
    { key: "ebitMarginPct", label: "EBIT-marginal", format: "signedPct" },
    { key: "roePct", label: "ROE", format: "signedPct" },
    { key: "pe", label: "P/E", format: "multiple" },
    { key: "evEbit", label: "EV/EBIT", format: "multiple" },
    { key: "rvolAtTime", label: "Rel. volym", format: "multiple" },
    { key: "return15mPct", label: "15 min", format: "signedPct" },
];

const svNumber = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 });
const svPrice = new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function finite(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function valueFor(row, key) {
    if (key === "company") return row.name ?? row.symbol ?? "";
    if (key in (row.fundamentals ?? {})) return finite(row.fundamentals[key]);
    if (key in (row.metrics ?? {})) return finite(row.metrics[key]);
    return finite(row[key]);
}

function formatValue(value, format) {
    const number = finite(value);
    if (number == null) return "Saknas";
    if (format === "price") return `${svPrice.format(number)} kr`;
    if (format === "marketCap") return `${svNumber.format(number)} mdr`;
    if (format === "multiple") return `${svNumber.format(number)}x`;
    if (format === "signedPct") return `${number > 0 ? "+" : ""}${svNumber.format(number)}%`;
    return svNumber.format(number);
}

function signedClass(value) {
    const number = finite(value);
    if (number == null || number === 0) return "text-text-article";
    return number > 0 ? "market-positive" : "market-negative";
}

function activeFilterParts(filter) {
    const metric = METRICS[filter.metric];
    const unit = metric.unit === "%"
        ? "%"
        : filter.metric === "marketCap"
            ? " mdr kr"
            : filter.metric === "netDebtToEbitda" || filter.metric === "rvolAtTime"
                ? "x"
                : "";
    return {
        label: PILL_LABELS[filter.metric] ?? metric.label,
        condition: `${filter.operator === "gt" ? ">" : "<"} ${svNumber.format(filter.value)}${unit}`,
    };
}

function EmptyState({ filtered }) {
    return (
        <div className="screener-empty">
            <p className="font-semibold text-text">{filtered ? "Inga bolag matchar urvalet" : "Ingen screenerdata att visa ännu"}</p>
            <p className="mt-1 text-sm text-text-muted">
                {filtered ? "Prova att ta bort ett filter eller använda ett bredare intervall." : "Försök igen om en liten stund."}
            </p>
        </div>
    );
}

function ScreenerTable() {
    const [items, setItems] = useState(null);
    const [meta, setMeta] = useState(null);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [segment, setSegment] = useState("all");
    const [sector, setSector] = useState("all");
    const [filters, setFilters] = useState([]);
    const [filterOpen, setFilterOpen] = useState(false);
    const [draftMetric, setDraftMetric] = useState("revenueGrowthPct");
    const [draftOperator, setDraftOperator] = useState("gt");
    const [draftValue, setDraftValue] = useState("10");
    const [sort, setSort] = useState({ key: "marketCap", direction: "desc" });

    const load = async ({ silent = false } = {}) => {
        if (silent) setRefreshing(true);
        try {
            const response = await fetchScreener("absolute", 1000);
            if (response.error) throw new Error(response.error);
            setItems(response.items ?? []);
            setMeta(response.meta ?? null);
            setError(null);
        } catch {
            setError("Kunde inte hämta screenerdata.");
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        let active = true;
        const initialLoad = async () => {
            try {
                const response = await fetchScreener("absolute", 1000);
                if (!active) return;
                if (response.error) throw new Error(response.error);
                setItems(response.items ?? []);
                setMeta(response.meta ?? null);
                setError(null);
            } catch {
                if (active) {
                    setItems([]);
                    setError("Kunde inte hämta screenerdata.");
                }
            }
        };
        initialLoad();
        const timer = setInterval(() => {
            if (active) load({ silent: true });
        }, REFRESH_MS);
        return () => {
            active = false;
            clearInterval(timer);
        };
    // The interval intentionally keeps the same unfiltered universe fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!filterOpen) return undefined;
        const onKeyDown = (event) => {
            if (event.key === "Escape") setFilterOpen(false);
        };
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [filterOpen]);

    const segments = useMemo(() => [...new Set((items ?? []).map((row) => row.segment).filter(Boolean))].sort(), [items]);
    const sectors = useMemo(() => [...new Set((items ?? []).map((row) => row.sector).filter(Boolean))].sort(), [items]);
    const segmentOptions = useMemo(() => [
        { value: "all", label: "Alla listor" },
        ...segments.map((value) => ({ value, label: value })),
    ], [segments]);
    const sectorOptions = useMemo(() => [
        { value: "all", label: "Alla sektorer" },
        ...sectors.map((value) => ({ value, label: value })),
    ], [sectors]);

    const visibleItems = useMemo(() => {
        const result = (items ?? []).filter((row) => {
            if (segment !== "all" && row.segment !== segment) return false;
            if (sector !== "all" && row.sector !== sector) return false;
            return filters.every((filter) => {
                const value = valueFor(row, filter.metric);
                if (value == null) return false;
                return filter.operator === "gt" ? value > filter.value : value < filter.value;
            });
        });

        result.sort((left, right) => {
            const a = valueFor(left, sort.key);
            const b = valueFor(right, sort.key);
            if (a == null && b == null) return String(left.name ?? left.symbol).localeCompare(String(right.name ?? right.symbol), "sv");
            if (a == null) return 1;
            if (b == null) return -1;
            const comparison = typeof a === "string" ? a.localeCompare(b, "sv") : a - b;
            return sort.direction === "asc" ? comparison : -comparison;
        });
        return result;
    }, [items, segment, sector, filters, sort]);

    const addFilter = (filter) => {
        if (!METRICS[filter.metric] || String(filter.value).trim() === "" || !Number.isFinite(Number(filter.value))) return;
        const normalized = { ...filter, value: Number(filter.value) };
        setFilters((current) => [
            ...current.filter((item) => !(item.metric === normalized.metric && item.operator === normalized.operator)),
            normalized,
        ]);
    };

    const addDraftFilter = () => {
        addFilter({ metric: draftMetric, operator: draftOperator, value: draftValue });
    };

    const resetFilters = () => {
        setSegment("all");
        setSector("all");
        setFilters([]);
    };

    const hasFilters = Boolean(segment !== "all" || sector !== "all" || filters.length);

    const toggleSort = (key) => {
        setSort((current) => ({
            key,
            direction: current.key === key
                ? (current.direction === "desc" ? "asc" : "desc")
                : (key === "company" ? "asc" : "desc"),
        }));
    };

    return (
        <section className="font-sans" aria-label="Aktiescreener">
            <div className="screener-toolbar">
                <h1 className="">Screener</h1>
                {hasFilters && (
                    <div className="screener-chips" aria-label="Aktiva filter">
                        {segment !== "all" && (
                            <button type="button" className="screener-chip is-active" onClick={() => setSegment("all")} aria-label={`Ta bort listfilter ${segment}`}>
                                <span className="screener-chip-label">Lista</span>
                                <span className="screener-chip-divider" aria-hidden="true" />
                                <span className="screener-chip-condition">{segment}</span>
                                <FiX aria-hidden="true" />
                            </button>
                        )}
                        {sector !== "all" && (
                            <button type="button" className="screener-chip is-active" onClick={() => setSector("all")} aria-label={`Ta bort sektorfilter ${sector}`}>
                                <span className="screener-chip-label">Sektor</span>
                                <span className="screener-chip-divider" aria-hidden="true" />
                                <span className="screener-chip-condition">{sector}</span>
                                <FiX aria-hidden="true" />
                            </button>
                        )}
                        {filters.map((filter) => {
                            const parts = activeFilterParts(filter);
                            return (
                                <button
                                    type="button"
                                    key={`${filter.metric}-${filter.operator}`}
                                    className="screener-chip is-active"
                                    onClick={() => setFilters((current) => current.filter((item) => item !== filter))}
                                    aria-label={`Ta bort ${parts.label} ${parts.condition}`}
                                >
                                    <span className="screener-chip-label">{parts.label}</span>
                                    <span className="screener-chip-divider" aria-hidden="true" />
                                    <span className="screener-chip-condition">{parts.condition}</span>
                                    <FiX aria-hidden="true" />
                                </button>
                            );
                        })}
                    </div>
                )}
                <div className="screener-toolbar-actions">
                    <button
                        type="button"
                        className={`screener-toolbar-button ${filterOpen ? "is-active" : ""}`}
                        onClick={() => setFilterOpen(true)}
                        aria-haspopup="dialog"
                        aria-expanded={filterOpen}
                        aria-label="Lägg till filter"
                        title="Lägg till filter"
                    >
                        <FiPlus aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className="screener-toolbar-button"
                        onClick={() => load({ silent: true })}
                        disabled={refreshing}
                        aria-label={refreshing ? "Uppdaterar screenerdata" : "Uppdatera screenerdata"}
                        title="Uppdatera"
                    >
                        <FiRefreshCw className={refreshing ? "spin" : ""} aria-hidden="true" />
                    </button>
                </div>
            </div>

            {filterOpen && (
                <div className="screener-filter-backdrop" onMouseDown={() => setFilterOpen(false)}>
                    <div
                        className="screener-filter-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="screener-filter-title"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="screener-filter-modal-heading">
                            <div>
                                <h2 id="screener-filter-title">Filtrera bolag</h2>
                                {/* <p>Kombinera marknad, finansiella nyckeltal och tekniska signaler.</p> */}
                            </div>
                            <button type="button" onClick={() => setFilterOpen(false)} aria-label="Stäng filter">
                                <FiX aria-hidden="true" />
                            </button>
                        </div>

                        <div className="screener-filter-modal-body">
                            <div className="screener-filter-market">
                                <div className="screener-filter-field">
                                    <span>Lista</span>
                                    <Dropdown value={segment} onChange={setSegment} options={segmentOptions} ariaLabel="Välj lista" />
                                </div>
                                <div className="screener-filter-field">
                                    <span>Sektor</span>
                                    <Dropdown value={sector} onChange={setSector} options={sectorOptions} ariaLabel="Välj sektor" />
                                </div>
                            </div>

                            <div className="screener-filter-divider" />

                            <div className="screener-filter-field">
                                <span>Nyckeltal</span>
                                <Dropdown value={draftMetric} onChange={setDraftMetric} groups={METRIC_DROPDOWN_GROUPS} ariaLabel="Välj nyckeltal" />
                            </div>
                            <div className="screener-filter-info">
                                <FiInfo aria-hidden="true" />
                                <p>{METRICS[draftMetric].description}</p>
                            </div>
                            <div className="screener-filter-rule">
                                <div className="screener-filter-field">
                                    <span>Villkor</span>
                                    <Dropdown value={draftOperator} onChange={setDraftOperator} options={OPERATOR_OPTIONS} ariaLabel="Välj villkor" />
                                </div>
                                <label className="screener-filter-field">
                                    <span>Värde ({METRICS[draftMetric].unit})</span>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        step={METRICS[draftMetric].step}
                                        value={draftValue}
                                        onChange={(event) => setDraftValue(event.target.value)}
                                        onKeyDown={(event) => { if (event.key === "Enter") addDraftFilter(); }}
                                    />
                                </label>
                            </div>
                            <button type="button" className="screener-add-condition" onClick={addDraftFilter}>
                                <FiPlus aria-hidden="true" /> Lägg till
                            </button>
                        </div>

                        <div className="screener-filter-modal-footer">
                            {hasFilters && <button type="button" className="screener-clear-filters" onClick={resetFilters}>Rensa filter</button>}
                            <button type="button" className="screener-filter-done" onClick={() => setFilterOpen(false)}>Stäng</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="screener-result-bar">
                <div>
                    <strong>{items == null ? "Hämtar bolag…" : `${visibleItems.length} av ${items.length} bolag`}</strong>
                    <span>
                        {meta?.financialCoverage != null
                            ? `Helårsdata för ${meta.financialCoverage} bolag · marknadsdata uppdateras löpande`
                            : "Rapporterade helårssiffror · marknadsdata uppdateras löpande"}
                    </span>
                </div>
            </div>

            {error && <p className="screener-error" role="alert">{error}</p>}

            {items == null ? (
                <div className="screener-table-shell" aria-label="Laddar screenerdata">
                    <div className="screener-loading-head" />
                    {[...Array(9)].map((_, index) => <div key={index} className="screener-loading-row" />)}
                </div>
            ) : visibleItems.length === 0 ? (
                <EmptyState filtered={hasFilters} />
            ) : (
                <div className="screener-table-shell">
                    <div className="screener-table-scroll" tabIndex="0" aria-label="Screenerresultat, skrolla i sidled för fler nyckeltal">
                        <table className="screener-table">
                            <thead>
                                <tr>
                                    {COLUMNS.map((column) => {
                                        const active = sort.key === column.key;
                                        return (
                                            <th key={column.key} className={column.key === "company" ? "screener-company-column" : ""}>
                                                <button type="button" onClick={() => toggleSort(column.key)}>
                                                    {column.label}
                                                    {active && (sort.direction === "asc" ? <FiArrowUp /> : <FiArrowDown />)}
                                                </button>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {visibleItems.map((row) => (
                                    <tr key={row.symbol}>
                                        <td className="screener-company-column">
                                            <Link href={`/aktie/${encodeURIComponent(row.symbol)}`}>
                                                <strong>{row.name ?? row.symbol}</strong>
                                                <span>{row.nativeSymbol ?? row.symbol}{row.segment ? ` · ${row.segment}` : ""}</span>
                                            </Link>
                                        </td>
                                        {COLUMNS.slice(1).map((column) => {
                                            const value = valueFor(row, column.key);
                                            return (
                                                <td
                                                    key={column.key}
                                                    className={column.format === "signedPct" ? signedClass(value) : value == null ? "is-missing" : ""}
                                                >
                                                    {formatValue(value, column.format)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="screener-method">
                <p>
                    Finansiella nyckeltal bygger på senast rapporterade helår. Värderingsmultiplar visas bara när kurs, antal aktier och jämförbar rapporteringsvaluta finns. Tekniska mått bygger på OMXsums sparade marknadsflöde.
                </p>
                {meta?.dataAsOf && <p>Marknadsdata per {new Date(meta.dataAsOf).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })}.</p>}
            </div>
        </section>
    );
}

export default function ScreenerPage() {
    return (
        <main className="screener-page">
            {/* <header className="screener-heading">
                <h1>Aktiescreener</h1>
            </header> */}
            <PlusPaywall redirectTo="/screener">
                <ScreenerTable />
            </PlusPaywall>
        </main>
    );
}
