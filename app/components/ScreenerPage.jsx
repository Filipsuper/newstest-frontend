"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    FiArrowDown,
    FiArrowUp,
    FiChevronDown,
    FiPlus,
    FiRefreshCw,
    FiSliders,
    FiX,
} from "react-icons/fi";
import { fetchScreener } from "../utils/api";
import PlusPaywall from "./PlusPaywall";

const REFRESH_MS = 60_000;

const METRICS = {
    marketCap: { label: "Börsvärde", unit: "mdr kr", step: "1" },
    revenueGrowthPct: { label: "Omsättningstillväxt", unit: "%", step: "1" },
    ebitMarginPct: { label: "EBIT-marginal", unit: "%", step: "1" },
    roePct: { label: "Avkastning på eget kapital", unit: "%", step: "1" },
    pe: { label: "P/E", unit: "x", step: "1" },
    ps: { label: "P/S", unit: "x", step: "0.1" },
    evEbit: { label: "EV/EBIT", unit: "x", step: "1" },
    netDebtToEbitda: { label: "Nettoskuld/EBITDA", unit: "x", step: "0.5" },
    changePct: { label: "Dagens utveckling", unit: "%", step: "1" },
    rvolAtTime: { label: "Relativ volym", unit: "x", step: "0.1" },
    return15mPct: { label: "Utveckling 15 min", unit: "%", step: "0.5" },
    gapPct: { label: "Öppningsgap", unit: "%", step: "0.5" },
};

const FILTER_GROUPS = [
    {
        label: "Finansiellt",
        metrics: ["marketCap", "revenueGrowthPct", "ebitMarginPct", "roePct", "netDebtToEbitda"],
    },
    { label: "Värdering", metrics: ["pe", "ps", "evEbit"] },
    { label: "Tekniskt", metrics: ["changePct", "rvolAtTime", "return15mPct", "gapPct"] },
];

const QUICK_FILTERS = [
    { label: "Lönsam tillväxt", conditions: [
        { metric: "revenueGrowthPct", operator: "gte", value: 10 },
        { metric: "ebitMarginPct", operator: "gte", value: 10 },
    ] },
    { label: "P/E under 15", conditions: [{ metric: "pe", operator: "lte", value: 15 }] },
    { label: "ROE över 15%", conditions: [{ metric: "roePct", operator: "gte", value: 15 }] },
    { label: "Hög relativ volym", conditions: [{ metric: "rvolAtTime", operator: "gte", value: 1.5 }] },
];

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
    return number > 0 ? "text-emerald-500 dark:text-emerald-300" : "text-red-500 dark:text-red-400";
}

function activeFilterLabel(filter) {
    const metric = METRICS[filter.metric];
    return `${metric.label} ${filter.operator === "gte" ? "minst" : "högst"} ${svNumber.format(filter.value)}${metric.unit === "%" ? "%" : ` ${metric.unit}`}`;
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
    const [draftOperator, setDraftOperator] = useState("gte");
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

    const segments = useMemo(() => [...new Set((items ?? []).map((row) => row.segment).filter(Boolean))].sort(), [items]);
    const sectors = useMemo(() => [...new Set((items ?? []).map((row) => row.sector).filter(Boolean))].sort(), [items]);

    const visibleItems = useMemo(() => {
        const result = (items ?? []).filter((row) => {
            if (segment !== "all" && row.segment !== segment) return false;
            if (sector !== "all" && row.sector !== sector) return false;
            return filters.every((filter) => {
                const value = valueFor(row, filter.metric);
                if (value == null) return false;
                return filter.operator === "gte" ? value >= filter.value : value <= filter.value;
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
        setFilterOpen(false);
    };

    const applyQuickFilter = (preset) => {
        setFilters((current) => {
            const next = [...current];
            for (const condition of preset.conditions) {
                const index = next.findIndex((item) => item.metric === condition.metric && item.operator === condition.operator);
                if (index >= 0) next[index] = condition;
                else next.push(condition);
            }
            return next;
        });
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
                <label className="screener-select">
                    <span className="sr-only">Välj segment</span>
                    <select value={segment} onChange={(event) => setSegment(event.target.value)}>
                        <option value="all">Alla listor</option>
                        {segments.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                    <FiChevronDown aria-hidden="true" />
                </label>

                <label className="screener-select">
                    <span className="sr-only">Välj sektor</span>
                    <select value={sector} onChange={(event) => setSector(event.target.value)}>
                        <option value="all">Alla sektorer</option>
                        {sectors.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                    <FiChevronDown aria-hidden="true" />
                </label>

                <div className="screener-toolbar-actions">
                    <div className="screener-filter-wrap">
                        <button
                            type="button"
                            className={`screener-toolbar-button ${filterOpen ? "is-active" : ""}`}
                            onClick={() => setFilterOpen((open) => !open)}
                            aria-expanded={filterOpen}
                            aria-label="Lägg till filter"
                            title="Lägg till filter"
                        >
                            <FiSliders aria-hidden="true" />
                        </button>
                        {filterOpen && (
                            <div className="screener-filter-menu">
                            <label>
                                <span>Nyckeltal</span>
                                <select value={draftMetric} onChange={(event) => setDraftMetric(event.target.value)}>
                                    {FILTER_GROUPS.map((group) => (
                                        <optgroup key={group.label} label={group.label}>
                                            {group.metrics.map((key) => <option key={key} value={key}>{METRICS[key].label}</option>)}
                                        </optgroup>
                                    ))}
                                </select>
                            </label>
                            <div className="screener-filter-rule">
                                <label>
                                    <span>Villkor</span>
                                    <select value={draftOperator} onChange={(event) => setDraftOperator(event.target.value)}>
                                        <option value="gte">Minst</option>
                                        <option value="lte">Högst</option>
                                    </select>
                                </label>
                                <label>
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
                            <button type="button" className="screener-apply" onClick={addDraftFilter}>Använd filter</button>
                            </div>
                        )}
                    </div>
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

            <div className="screener-chips" aria-label="Aktiva filter">
                {filters.map((filter) => (
                    <button
                        type="button"
                        key={`${filter.metric}-${filter.operator}`}
                        className="screener-chip is-active"
                        onClick={() => setFilters((current) => current.filter((item) => item !== filter))}
                        aria-label={`Ta bort ${activeFilterLabel(filter)}`}
                    >
                        {activeFilterLabel(filter)} <FiX aria-hidden="true" />
                    </button>
                ))}
                {!filters.length && QUICK_FILTERS.map((preset) => (
                    <button type="button" key={preset.label} className="screener-chip" onClick={() => applyQuickFilter(preset)}>
                        {preset.label} <FiPlus aria-hidden="true" />
                    </button>
                ))}
                {hasFilters && (
                    <button type="button" className="screener-reset" onClick={resetFilters}>Rensa urval</button>
                )}
            </div>

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
            <header className="screener-heading">
                <h1>Aktiescreener</h1>
            </header>
            <PlusPaywall redirectTo="/screener">
                <ScreenerTable />
            </PlusPaywall>
        </main>
    );
}
