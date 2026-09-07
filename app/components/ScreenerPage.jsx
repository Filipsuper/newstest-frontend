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
import { fetchCompanyProfiles, fetchScreener } from "../utils/api";
import { Button, IconButton } from "./ui/Button";
import { Select } from "./ui/Select";
import { TextField } from "./ui/TextField";
import { Dialog } from "./ui/overlays";
import { Container, Heading, Inline, Stack, Text, cx } from "./ui/layout";
import { EmptyState, Skeleton } from "./ui/data";
import styles from "./screener.module.css";
import CompanyProfileRadar from "./CompanyProfileRadar";
import PlusPaywall from "./PlusPaywall";
import { StockWorkspaceNav } from "./WorkspaceNav";

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

const PRESETS = [
    {
        id: "unusual-volume",
        label: "Ovanligt hög handel",
        filters: [{ metric: "rvolAtTime", operator: "gt", value: 1.5 }],
        sort: { key: "rvolAtTime", direction: "desc" },
    },
    {
        id: "rising-volume",
        label: "Stiger med volym",
        filters: [
            { metric: "changePct", operator: "gt", value: 2 },
            { metric: "rvolAtTime", operator: "gt", value: 1.3 },
        ],
        sort: { key: "changePct", direction: "desc" },
    },
    {
        id: "profitable-growth",
        label: "Lönsam tillväxt",
        filters: [
            { metric: "revenueGrowthPct", operator: "gt", value: 10 },
            { metric: "ebitMarginPct", operator: "gt", value: 10 },
        ],
        sort: { key: "revenueGrowthPct", direction: "desc" },
    },
    {
        id: "low-pe",
        label: "Lägre P/E",
        filters: [
            { metric: "pe", operator: "gt", value: 0 },
            { metric: "pe", operator: "lt", value: 15 },
        ],
        sort: { key: "pe", direction: "asc" },
    },
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
    { key: "changePct", label: "Dagsförändring", format: "signedPct" },
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
    if (number == null || number === 0) return "";
    return number > 0 ? styles.positive : styles.negative;
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

const segmentLabel = (value) => ({ LARGE_CAP: "Large Cap", MID_CAP: "Mid Cap", SMALL_CAP: "Small Cap", FIRST_NORTH: "First North" })[value] ?? value;

function FilterChip({ label, condition, onRemove }) {
    return (
        <Button variant="secondary" size="sm" className={styles.chip} onClick={onRemove} aria-label={`Ta bort ${label} ${condition}`}>
            <span>{label} <span className={styles.condition}>{condition}</span></span>
            <FiX aria-hidden="true" />
        </Button>
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
    const [activePreset, setActivePreset] = useState(null);
    const [filterOpen, setFilterOpen] = useState(false);
    const [draftMetric, setDraftMetric] = useState("revenueGrowthPct");
    const [draftOperator, setDraftOperator] = useState("gt");
    const [draftValue, setDraftValue] = useState("10");
    const [sort, setSort] = useState({ key: "marketCap", direction: "desc" });
    const [resultLimit, setResultLimit] = useState(50);
    const [profiles, setProfiles] = useState({});

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
    const segmentOptions = useMemo(() => [
        { value: "all", label: "Alla listor" },
        ...segments.map((value) => ({ value, label: segmentLabel(value) })),
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

    useEffect(() => {
        setResultLimit(50);
    }, [segment, sector, filters]);

    const shownItems = visibleItems.slice(0, resultLimit);
    const shownSymbolsKey = shownItems.map((row) => row.symbol).join("|");

    useEffect(() => {
        const symbols = shownSymbolsKey.split("|").filter(Boolean);
        // Retry unfinished batches when a filter/sort cancels the previous page.
        const requested = symbols.filter((symbol) => profiles[symbol] === undefined || profiles[symbol] === null);
        if (!requested.length) return undefined;
        setProfiles((current) => {
            const next = { ...current };
            requested.forEach((symbol) => { next[symbol] = null; });
            return next;
        });
        let active = true;
        const loadProfiles = async () => {
            for (let start = 0; active && start < requested.length; start += 12) {
                const batch = requested.slice(start, start + 12);
                const response = await fetchCompanyProfiles(batch);
                if (!active) return;
                const bySymbol = new Map(response.items.map((item) => [item.symbol, item]));
                setProfiles((current) => {
                    const next = { ...current };
                    batch.forEach((symbol) => { next[symbol] = bySymbol.get(symbol) ?? false; });
                    return next;
                });
            }
        };
        loadProfiles();
        return () => { active = false; };
        // The key captures the exact visible result page; cached profiles stay in state.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shownSymbolsKey]);

    const addFilter = (filter) => {
        if (!METRICS[filter.metric] || String(filter.value).trim() === "" || !Number.isFinite(Number(filter.value))) return;
        const normalized = { ...filter, value: Number(filter.value) };
        setFilters((current) => [
            ...current.filter((item) => !(item.metric === normalized.metric && item.operator === normalized.operator)),
            normalized,
        ]);
        setActivePreset(null);
    };

    const addDraftFilter = () => {
        addFilter({ metric: draftMetric, operator: draftOperator, value: draftValue });
    };

    const resetFilters = () => {
        setSegment("all");
        setSector("all");
        setFilters([]);
        setActivePreset(null);
    };

    const applyPreset = (preset) => {
        if (activePreset === preset.id) {
            resetFilters();
            return;
        }
        setSegment("all");
        setSector("all");
        setFilters(preset.filters);
        setSort(preset.sort);
        setActivePreset(preset.id);
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

    const removeFilter = (filter) => {
        setFilters((current) => current.filter((item) => item !== filter));
        setActivePreset(null);
    };
    const changeSegment = (value) => { setSegment(value); setActivePreset(null); };
    const changeSector = (value) => { setSector(value); setActivePreset(null); };
    const draftValid = draftValue.trim() !== "" && finite(draftValue) !== null;
    const dataTime = meta?.dataAsOf ? new Date(meta.dataAsOf) : null;
    const validDataTime = dataTime && Number.isFinite(dataTime.getTime());
    const filterCount = filters.length + Number(segment !== "all") + Number(sector !== "all");

    return (
        <section aria-label="Aktiescreener">
            <header className={styles.intro}>
                <Heading as="h1" size="page">Hitta bolag</Heading>
                <Text size="sm" tone="secondary">Börja med ett färdigt urval eller bygg ett eget.</Text>
            </header>
            <Inline className={styles.presets} role="group" aria-label="Färdiga urval">
                {PRESETS.map((preset) => (
                    <Button
                        key={preset.id}
                        variant={activePreset === preset.id ? "primary" : "secondary"}
                        size="sm"
                        aria-pressed={activePreset === preset.id}
                        onClick={() => applyPreset(preset)}
                    >
                        {preset.label}
                    </Button>
                ))}
            </Inline>

            <div className={styles.toolbar}>
                <Dialog
                    open={filterOpen}
                    onOpenChange={setFilterOpen}
                    title="Filtrera bolag"
                    className={styles.filterDialog}
                    trigger={<Button variant="secondary" size="sm"><FiPlus aria-hidden="true" /> Lägg till filter</Button>}
                    footer={<>
                        {hasFilters && <Button variant="ghost" onClick={resetFilters}>Rensa filter</Button>}
                        <Button onClick={() => setFilterOpen(false)}>Visa {visibleItems.length} bolag</Button>
                    </>}
                >
                    <Stack gap={6}>
                        <div className={styles.fieldPair}>
                            <Select label="Lista" value={segment} onValueChange={changeSegment} options={segmentOptions} />
                            <Select label="Sektor" value={sector} onValueChange={changeSector} options={sectorOptions} />
                        </div>
                        <div className={styles.rule}>
                            <Select label="Nyckeltal" value={draftMetric} onValueChange={setDraftMetric} groups={METRIC_DROPDOWN_GROUPS} />
                            <Text size="xs" tone="secondary">{METRICS[draftMetric].description}</Text>
                            <div className={styles.fieldPair}>
                                <Select label="Villkor" value={draftOperator} onValueChange={setDraftOperator} options={OPERATOR_OPTIONS} />
                                <TextField
                                    label={`Värde (${METRICS[draftMetric].unit})`}
                                    type="number"
                                    inputMode="decimal"
                                    step={METRICS[draftMetric].step}
                                    value={draftValue}
                                    onValueChange={setDraftValue}
                                    onKeyDown={(event) => { if (event.key === "Enter" && draftValid) addDraftFilter(); }}
                                />
                            </div>
                            <Button variant="secondary" disabled={!draftValid} onClick={addDraftFilter}>
                                <FiPlus aria-hidden="true" /> Lägg till villkor
                            </Button>
                        </div>
                        <div role="status">
                            <Text size="xs" tone="secondary">
                                {filterCount ? `${filterCount} aktiva filter · ${visibleItems.length} bolag matchar` : "Inga aktiva filter"}
                            </Text>
                        </div>
                        {hasFilters && (
                            <Inline role="group" aria-label="Aktiva filter i dialog">
                                {segment !== "all" && <FilterChip label="Lista" condition={segmentLabel(segment)} onRemove={() => changeSegment("all")} />}
                                {sector !== "all" && <FilterChip label="Sektor" condition={sector} onRemove={() => changeSector("all")} />}
                                {filters.map((filter) => <FilterChip key={`${filter.metric}-${filter.operator}`} {...activeFilterParts(filter)} onRemove={() => removeFilter(filter)} />)}
                            </Inline>
                        )}
                    </Stack>
                </Dialog>
                <Inline className={styles.chips} role="group" aria-label="Aktiva filter">
                    {segment !== "all" && <FilterChip label="Lista" condition={segmentLabel(segment)} onRemove={() => changeSegment("all")} />}
                    {sector !== "all" && <FilterChip label="Sektor" condition={sector} onRemove={() => changeSector("all")} />}
                    {filters.map((filter) => <FilterChip key={`${filter.metric}-${filter.operator}`} {...activeFilterParts(filter)} onRemove={() => removeFilter(filter)} />)}
                    {hasFilters && <Button size="sm" variant="ghost" onClick={resetFilters}>Rensa filter</Button>}
                </Inline>
                <IconButton
                    size="sm"
                    label={refreshing ? "Uppdaterar screenerdata" : "Uppdatera screenerdata"}
                    onClick={() => load({ silent: true })}
                    loading={refreshing}
                >
                    {!refreshing && <FiRefreshCw aria-hidden="true" />}
                </IconButton>
            </div>

            <div className={styles.resultBar}>
                <Text size="sm" numeric role="status">
                    {items == null ? "Hämtar bolag…" : `${visibleItems.length} av ${items.length} bolag`}
                </Text>
                <Text size="xs" tone="secondary">
                    {validDataTime
                        ? <>Marknadsdata <time dateTime={dataTime.toISOString()}>{dataTime.toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Stockholm" })}</time></>
                        : "Uppdateringstid saknas"}
                </Text>
            </div>

            {error && Boolean(items?.length) && (
                <div className={styles.error} role="alert">
                    <Text size="sm">{error} Tidigare hämtade värden visas.</Text>
                    <Button variant="secondary" size="sm" onClick={() => load({ silent: true })} loading={refreshing}>Försök igen</Button>
                </div>
            )}

            {items == null ? (
                <div className={styles.tableShell} role="status" aria-label="Laddar screenerdata">
                    {[...Array(9)].map((_, index) => <Skeleton key={index} className={styles.loadingRow} />)}
                </div>
            ) : error && !items.length ? (
                <EmptyState title="Kunde inte hämta screenerdata" description="Försök att hämta bolagen igen." role="alert"
                    action={<Button variant="secondary" loading={refreshing} onClick={() => load({ silent: true })}>Försök igen</Button>} />
            ) : visibleItems.length === 0 ? (
                <EmptyState
                    title={hasFilters ? "Inga bolag matchar urvalet" : "Ingen screenerdata att visa ännu"}
                    description={hasFilters ? "Ta bort ett filter eller välj ett bredare intervall." : "Försök igen om en liten stund."}
                    action={hasFilters
                        ? <Button variant="secondary" onClick={resetFilters}>Visa alla bolag</Button>
                        : <Button variant="secondary" loading={refreshing} onClick={() => load({ silent: true })}>Försök igen</Button>}
                />
            ) : (
                <div className={styles.tableShell}>
                    <div className={styles.tableScroll} role="region" tabIndex={0} aria-label="Screenerresultat, skrolla i sidled för fler nyckeltal">
                        <table className={styles.table} aria-label="Bolag och nyckeltal">
                            <thead>
                                <tr>
                                    {COLUMNS.map((column) => {
                                        const active = sort.key === column.key;
                                        return (
                                            <th scope="col" key={column.key}
                                                className={column.key === "company" ? styles.companyColumn : undefined}
                                                aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
                                            >
                                                <Button variant="ghost" size="sm" className={styles.sortButton} onClick={() => toggleSort(column.key)}>
                                                    {column.label}
                                                    {active && (sort.direction === "asc" ? <FiArrowUp aria-hidden="true" /> : <FiArrowDown aria-hidden="true" />)}
                                                </Button>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {shownItems.map((row) => (
                                    <tr key={row.symbol}>
                                        <td className={styles.companyColumn}>
                                            <Link href={`/aktie/${encodeURIComponent(row.symbol)}`} className={styles.companyLink}>
                                                <CompanyProfileRadar
                                                    compact
                                                    companyName={row.name ?? row.symbol}
                                                    loading={profiles[row.symbol] === undefined || profiles[row.symbol] === null}
                                                    profile={profiles[row.symbol] || null}
                                                />
                                                <span className={styles.companyCopy}>
                                                    <strong>{row.name ?? row.symbol}</strong>
                                                    <span>{row.nativeSymbol ?? row.symbol}{row.segment ? ` · ${segmentLabel(row.segment)}` : ""}</span>
                                                </span>
                                            </Link>
                                        </td>
                                        {COLUMNS.slice(1).map((column) => {
                                            const value = valueFor(row, column.key);
                                            return (
                                                <td key={column.key} className={cx(
                                                    value == null && styles.missing,
                                                    ["changePct", "revenueGrowthPct", "return15mPct"].includes(column.key) && signedClass(value),
                                                )}>
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

            <div className={styles.footer}>
                <Dialog
                    title="Om nyckeltalen"
                    trigger={<Button variant="ghost" size="sm"><FiInfo aria-hidden="true" /> Om nyckeltalen</Button>}
                >
                    <Stack gap={4}>
                        <Text size="sm">Finansiella nyckeltal bygger på senast rapporterade helår. Värderingsmultiplar visas bara när kurs, antal aktier och jämförbar rapporteringsvaluta finns.</Text>
                        <Text size="sm">Tekniska mått bygger på OMXsums sparade marknadsflöde. Tider visas i svensk tid. Saknade värden visas som Saknas och sorteras sist.</Text>
                        {meta?.financialCoverage != null && <Text size="sm">Helårsdata finns för {meta.financialCoverage} bolag.</Text>}
                        <Text size="sm">Bolagsprofilens sex axlar sammanfattar underliggande nyckeltal. Färgen visar genomsnittet av tillgängliga poäng, inte ett köp- eller säljråd. Saknade axlar får inga poäng.</Text>
                    </Stack>
                </Dialog>
                {shownItems.length < visibleItems.length && (
                    <Button variant="secondary" onClick={() => setResultLimit((value) => value + 50)}>Visa fler bolag</Button>
                )}
                <Text size="xs" tone="secondary" numeric>{items?.length ? `Visar ${shownItems.length} av ${visibleItems.length}` : ""}</Text>
            </div>
        </section>
    );
}

export default function ScreenerPage() {
    return (
        <Container as="main" className={styles.workspace}>
            <StockWorkspaceNav foundation />
            <PlusPaywall redirectTo="/aktier/screener" title="Utforska aktier med Plus" description="Hitta bolag med screenerns urval och egna filter. Marknadsöversikten och bolagens nyheter är fortsatt öppna.">
                <ScreenerTable />
            </PlusPaywall>
        </Container>
    );
}
