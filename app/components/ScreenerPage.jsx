"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
    FiArrowDown,
    FiArrowUp,
    FiInfo,
    FiLock,
    FiPlus,
    FiRefreshCw,
    FiX,
} from "react-icons/fi";
import { fetchScreener } from "../utils/api";
import { Checkbox } from "./ui/Choices";
import { SCREENER_METRICS as METRICS, DEFAULT_COLUMNS, FREE_DEFAULT_COLUMNS, FREE_METRICS, DISCOVERABLE_METRICS, isLegacyIntradayMetric, matchesMetricSearch, restrictScreenerState, finite, dailyHistoryDate as historyDate, screenerMetricText, screenerValue as valueFor, matchesFilter, validFilter, readScreenerQuery, writeScreenerQuery } from "../utils/screener";
import { readScreenerCompany, screenerCompanyQuery } from "../utils/screenerCompany";
import { Button, IconButton } from "./ui/Button";
import { Select } from "./ui/Select";
import { SearchableSelect } from "./ui/SearchableSelect";
import { Label } from "./ui/Label";
import { TextField } from "./ui/TextField";
import { Dialog } from "./ui/overlays";
import { Container, Heading, Inline, Stack, Text, cx } from "./ui/layout";
import { EmptyState, Skeleton } from "./ui/data";
import styles from "./screener.module.css";
import CompanyProfileRadar from "./CompanyProfileRadar";
import { useAuthContext } from "../providers/AuthProvider";
import UpgradeLink from "./UpgradeLink";
import LogInModal from "../modals/logInModal";
import { StockWorkspaceNav } from "./WorkspaceNav";
import ScreenerPreview from './ScreenerPreview';

const REFRESH_MS = 60_000;
const ScreenerCompanyDrawer = dynamic(() => import("./ScreenerCompanyDrawer"));

const OPERATOR_OPTIONS = [
    { value: "gt", label: "Över" },
    { value: "lt", label: "Under" },
    { value: "between", label: "Mellan" },
];

const PRESETS = [
    {
        id: "positive-trend", label: "Positiv långsiktig trend",
        filters: [{ metric: "dailyDistanceSma50Pct", operator: "gt", value: 0 }, { metric: "dailyDistanceSma200Pct", operator: "gt", value: 0 }],
        sort: { key: "dailyReturn1yPct", direction: "desc" },
    },
    {
        id: "insider-buying", label: "Insiders nettoköper",
        filters: [{ metric: "insider_netValue90d", operator: "gt", value: 0 }, { metric: "insider_buyers90d", operator: "gt", value: 1 }],
        sort: { key: "insider_netValue90d", direction: "desc" },
    },
    {
        id: "completed-volume",
        label: "Hög volym, avslutad dag",
        filters: [{ metric: "dailyCompletedRvol", operator: "gt", value: 1.5 }],
        sort: { key: "dailyCompletedRvol", direction: "desc" },
    },
    {
        id: "rising-month",
        label: "Stiger på en månad",
        filters: [
            { metric: "dailyReturn1moPct", operator: "gt", value: 5 },
            { metric: "dailyDistanceSma20Pct", operator: "gt", value: 0 },
        ],
        sort: { key: "dailyReturn1moPct", direction: "desc" },
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

const svNumber = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 1 });

function signedClass(value) {
    const number = finite(value);
    if (number == null || number === 0) return "";
    return number > 0 ? styles.positive : styles.negative;
}

function activeFilterParts(filter) {
    const metric = METRICS[filter.metric];
    const value = metric.type === "enum" ? metric.options.find(option => option.value === filter.value)?.label : svNumber.format(filter.value);
    const condition = filter.operator === "between" ? `${value}–${svNumber.format(filter.upper)} ${metric.unit}`
        : filter.operator === "eq" ? value : `${filter.operator === "gt" ? ">" : "<"} ${value}${metric.unit === "%" ? "" : " "}${metric.unit}`;
    const label = PILL_LABELS[filter.metric] ?? metric.shortLabel ?? metric.label;
    return { label: isLegacyIntradayMetric(filter.metric) ? `Äldre intradag · ${label}` : label, condition: condition.trim() };
}

function historyContext(row) {
    const date = historyDate(row);
    const status = row.daily?.status;
    const statusLabel = { missing: "Historiskt underlag saknas.", unsupported: "Historik stöds inte för detta instrument.", unavailable: "Historik kunde inte hämtas." }[status];
    if (statusLabel || !date) return `${statusLabel ?? "Historiskt underlag saknas."}${date ? ` Sista datum i underlaget: ${date}.` : ""} Saknade värden matchar inte filter.`;
    const basis = row.daily?.priceBasis === "provider_close" ? "Leverantörens dagskurser. Justering för bolagshändelser är inte verifierad; inte totalavkastning."
        : "Kursgrund saknas; justering för bolagshändelser är inte verifierad.";
    const stale = status === "stale" ? `Äldre underlag: siffrorna avser ${date}, inte senaste handelsdagen.${row.daily?.expectedAsOfDate ? ` Förväntat senaste datum: ${row.daily.expectedAsOfDate}.` : ""} ` : "";
    return `Senaste avslutade dag i underlaget: ${date}. ${stale}${status === "partial" ? "Delvis historik; vissa mått saknas. " : ""}${basis}`;
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

function ScreenerTable({ plus }) {
    const [items, setItems] = useState(null);
    const [meta, setMeta] = useState(null);
    const pendingResearch = useRef(false);
    pendingResearch.current = meta?.profileStatus === "pending" || meta?.insiderStatus === "pending";
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
    const [columns, setColumns] = useState(plus ? DEFAULT_COLUMNS : FREE_DEFAULT_COLUMNS);
    const [queryReady, setQueryReady] = useState(false);
    const [restrictedQuery, setRestrictedQuery] = useState(false);
    const [lockedPreset, setLockedPreset] = useState(null);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [drawerVisited, setDrawerVisited] = useState(false);
    const companyTrigger = useRef(null);
    const screenerScroll = useRef(null);
    const resultRegion = useRef(null);
    const [draftUpper, setDraftUpper] = useState("20");
    const [columnSearch, setColumnSearch] = useState("");
    const [legacyColumnChoices, setLegacyColumnChoices] = useState([]);
    const columnDefinitions = [{ key: "company", label: "Bolag" }, ...columns.map(key => ({
        key, label: `${["pe", "ps"].includes(key) ? METRICS[key].label : METRICS[key].shortLabel ?? METRICS[key].label}${isLegacyIntradayMetric(key) ? " (intradag)" : ""}`,
        format: METRICS[key].format ?? (METRICS[key].unit === "%" ? METRICS[key].signed ? "signedPct" : "pct" : METRICS[key].unit === "x" ? "multiple" : null),
    }))];
    const paidAccess = plus && meta?.access?.tier !== "free";
    const previewCache = useMemo(() => new Map(), [paidAccess]);
    useEffect(() => { if (selectedCompany) setDrawerVisited(true); }, [selectedCompany]);
    useEffect(() => {
        const pathname = window.location.pathname;
        const restoreCompany = () => {
            if (window.location.pathname === pathname) setSelectedCompany(readScreenerCompany(window.location.search));
        };
        restoreCompany();
        window.addEventListener("popstate", restoreCompany);
        return () => window.removeEventListener("popstate", restoreCompany);
    }, []);
    const selectCompany = (symbol, { push = false } = {}) => {
        const query = screenerCompanyQuery(window.location.search, symbol);
        const href = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
        window.history[push ? "pushState" : "replaceState"]({ ...window.history.state, omxsumScreenerCompany: push || window.history.state?.omxsumScreenerCompany }, "", href);
        setSelectedCompany(symbol);
    };
    const closeCompany = () => {
        if (window.history.state?.omxsumScreenerCompany) window.history.back();
        else selectCompany(null);
    };
    const openCompany = (event, symbol) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        companyTrigger.current = event.currentTarget;
        screenerScroll.current = { left: window.scrollX, top: window.scrollY };
        selectCompany(symbol, { push: true });
    };
    const unlocked = key => paidAccess || FREE_METRICS.includes(key);
    const defaultColumns = paidAccess ? DEFAULT_COLUMNS : FREE_DEFAULT_COLUMNS;
    const metricOptions = useMemo(() => DISCOVERABLE_METRICS.map(value => ({ value, label: METRICS[value].label, group: METRICS[value].group })), []);
    const selectMetric = key => {
        if (!METRICS[key]) return;
        setDraftMetric(key);
        setDraftOperator(METRICS[key].type === "enum" ? "eq" : "gt");
        setDraftValue(METRICS[key].type === "enum" ? METRICS[key].options[0].value : "0");
    };
    useEffect(() => {
        const restore = () => {
            const state = restrictScreenerState(readScreenerQuery(window.location.search), paidAccess);
            setFilters(state.filters); setSegment(state.segment); setSector(state.sector);
            setColumns(state.columns); setSort(state.sort); setActivePreset(null); setQueryReady(true);
            setRestrictedQuery(state.restricted);
        };
        restore();
        window.addEventListener("popstate", restore);
        return () => window.removeEventListener("popstate", restore);
    }, [paidAccess]);
    useEffect(() => {
        if (!queryReady) return;
        const query = writeScreenerQuery(window.location.search, { filters, segment, sector, columns, sort });
        const url = window.location.pathname + (query ? "?" + query : "") + window.location.hash;
        window.history.replaceState(window.history.state, "", url);
    }, [queryReady, filters, segment, sector, columns, sort]);

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
            if (active && !document.hidden && !pendingResearch.current) load({ silent: true });
        }, REFRESH_MS);
        return () => {
            active = false;
            clearInterval(timer);
        };
    // The interval intentionally keeps the same unfiltered universe fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (meta?.profileStatus !== "pending" && meta?.insiderStatus !== "pending") return;
        const timer = setInterval(() => { if (!document.hidden) load({ silent: true }); }, 30_000);
        return () => clearInterval(timer);
    // Same whole-universe snapshot, independent of the current filter/page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [meta?.profileStatus, meta?.insiderStatus]);

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
            return filters.every(filter => matchesFilter(row, filter));
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
    const addFilter = (filter) => {
        if (!unlocked(filter.metric) || !validFilter(filter)) return;
        const normalized = { ...filter, value: METRICS[filter.metric].type === "enum" ? filter.value : Number(filter.value),
            ...(filter.operator === "between" ? { upper: Number(filter.upper) } : {}) };
        setColumns(current => current.includes(filter.metric) ? current : [...current, filter.metric]);
        setFilters((current) => [
            ...current.filter((item) => !(item.metric === normalized.metric && item.operator === normalized.operator)),
            normalized,
        ]);
        setActivePreset(null);
    };

    const addDraftFilter = () => {
        addFilter({ metric: draftMetric, operator: draftOperator, value: draftValue, ...(draftOperator === "between" ? { upper: draftUpper } : {}) });
    };

    const resetFilters = () => {
        setSegment("all");
        setSector("all");
        setFilters([]);
        setActivePreset(null);
    };

    const applyPreset = (preset) => {
        if (preset.filters.some(filter => !unlocked(filter.metric))) { setLockedPreset(preset); return; }
        if (activePreset === preset.id) {
            resetFilters();
            return;
        }
        setSegment("all");
        setSector("all");
        setFilters(preset.filters);
        setColumns(current => [...new Set([...current, ...preset.filters.map(filter => filter.metric)])]);
        setSort(preset.sort);
        setActivePreset(preset.id);
    };

    const hasFilters = Boolean(segment !== "all" || sector !== "all" || filters.length);

    const toggleSort = (key) => {
        if (key !== "company" && !unlocked(key)) return;
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
    const draftUnlocked = unlocked(draftMetric);
    const draftValid = draftUnlocked && validFilter({ metric: draftMetric, operator: draftOperator, value: draftValue, upper: draftUpper });
    const dataTime = meta?.dataAsOf ? new Date(meta.dataAsOf) : null;
    const validDataTime = dataTime && Number.isFinite(dataTime.getTime());
    const filterCount = filters.length + Number(segment !== "all") + Number(sector !== "all");
    const legacyRules = filters.filter(filter => isLegacyIntradayMetric(filter.metric));
    const legacyColumns = columns.filter(isLegacyIntradayMetric);
    const historyDates = [...new Set((items ?? []).map(historyDate).filter(Boolean))].sort();
    const dailyCoverage = (items ?? []).filter(row => historyDate(row) && valueFor(row, "dailyClose") !== null).length;
    const activeDailyMetrics = [...columns, ...filters.map(filter => filter.metric), sort.key].filter(key => METRICS[key]?.dailyField);
    const staleHistoryCount = (items ?? []).filter(row => row.daily?.status === "stale" && activeDailyMetrics.some(key => valueFor(row, key) !== null)).length;

    return (
        <section aria-label="Aktiescreener">
            <header className={styles.intro}>
                <Heading as="h1" size="page">Hitta bolag</Heading>
                <Text size="sm" tone="secondary">Avslutade dagskurser och rapporterade nyckeltal.</Text>
                {!paidAccess && <Inline className={styles.freeAccess}>
                    <Text size="xs" tone="secondary">6 nyckeltal ingår gratis. Fler filter med Plus och Pro.</Text>
                    <UpgradeLink tier="plus" inline />
                </Inline>}
            </header>
            {(legacyRules.length > 0 || legacyColumns.length > 0 || isLegacyIntradayMetric(sort.key)) && <Text size="sm" tone="secondary" className={styles.legacyNotice} role="status">
                Äldre intradagsurval har behållits: {legacyRules.length} villkor och {legacyColumns.length} kolumner{isLegacyIntradayMetric(sort.key) ? " samt intradagssortering" : ""}. Dessa använder pågående eller senast sparad marknadsdata, inte avslutade dagskurser. Villkor kan tas bort; Standardkolumner återställer dagliga kolumner och sortering. För nya intradagsurval, använd <Link href="/terminal">Terminalen</Link>.
            </Text>}
            {restrictedQuery && <Text size="sm" tone="secondary" role="status">Urvalet innehöll Plus-nyckeltal. Gratisfiltren visas här.</Text>}
            <Inline className={styles.presets} role="group" aria-label="Färdiga urval">
                {(paidAccess ? PRESETS : [...PRESETS].sort((a, b) => Number(a.filters.some(filter => !unlocked(filter.metric))) - Number(b.filters.some(filter => !unlocked(filter.metric))))).map((preset) => (
                    <Button
                        key={preset.id}
                        variant={activePreset === preset.id ? "primary" : "secondary"}
                        size="sm"
                        aria-pressed={activePreset === preset.id}
                        onClick={() => applyPreset(preset)}
                    >
                        {preset.label}
                        {preset.filters.some(filter => !unlocked(filter.metric)) && <Label className={styles.accessLabel} tone="accent" icon={<FiLock />}>Plus</Label>}
                    </Button>
                ))}
            </Inline>
            <Dialog open={Boolean(lockedPreset)} onOpenChange={open => { if (!open) setLockedPreset(null); }}
                title={lockedPreset?.label ?? "Fler filter med Plus"}
                footer={<UpgradeLink tier="plus" />}>
                <Stack gap={4}>
                    <Text size="sm">Kombinera fler nyckeltal med Plus eller Pro.</Text>
                    {lockedPreset?.filters.map(filter => <div key={filter.metric}>
                        <Text size="sm">{METRICS[filter.metric].label}</Text>
                        <Text size="xs" tone="secondary">{METRICS[filter.metric].description}</Text>
                    </div>)}
                </Stack>
            </Dialog>

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
                            <SearchableSelect label="Nyckeltal" placeholder="Sök exempelvis P/E, RSI, 1 månad eller insyn" value={draftMetric}
                                onValueChange={selectMetric} options={metricOptions} filter={(option, query) => matchesMetricSearch(option.value, query)}
                                renderOption={option => <span className={styles.metricOption}>
                                    <span>{option.label}<small>{option.group}</small></span>
                                    {!unlocked(option.value) && <Label tone="accent" icon={<FiLock />}>Plus</Label>}
                                </span>} />
                            <Text size="xs" tone="secondary">{METRICS[draftMetric].description}</Text>
                            {draftUnlocked ? <>
                            <Text size="xs" tone="secondary">Underlag för {items?.filter(row => valueFor(row, draftMetric) !== null).length ?? 0} av {items?.length ?? 0} bolag.</Text>
                            <div className={styles.fieldPair}>
                                {METRICS[draftMetric].type === "enum" ? <Select label="Position" value={draftValue} onValueChange={setDraftValue} options={METRICS[draftMetric].options} /> : <>
                                <Select label="Villkor" value={draftOperator} onValueChange={setDraftOperator} options={OPERATOR_OPTIONS} />
                                <TextField
                                    label={`Värde (${METRICS[draftMetric].unit})`}
                                    type="number"
                                    inputMode="decimal"
                                    step={METRICS[draftMetric].step}
                                    min={METRICS[draftMetric].min}
                                    max={METRICS[draftMetric].max}
                                    value={draftValue}
                                    onValueChange={setDraftValue}
                                    onKeyDown={(event) => { if (event.key === "Enter" && draftValid) addDraftFilter(); }}
                                />
                                {draftOperator === "between" && <TextField label={`Till (${METRICS[draftMetric].unit})`} type="number" inputMode="decimal" step={METRICS[draftMetric].step}
                                    value={draftUpper} onValueChange={setDraftUpper} min={METRICS[draftMetric].min} max={METRICS[draftMetric].max} />}
                                </>}
                            </div>
                            <Button variant="secondary" disabled={!draftValid} onClick={addDraftFilter}>
                                <FiPlus aria-hidden="true" /> Lägg till villkor
                            </Button>
                            </> : <Inline><Label tone="accent" icon={<FiLock />}>Plus</Label><UpgradeLink tier="plus" inline /></Inline>}
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
                <Dialog title="Välj kolumner" className={styles.filterDialog}
                    onOpenChange={open => setLegacyColumnChoices(open ? columns.filter(isLegacyIntradayMetric) : [])}
                    trigger={<Button variant="secondary" size="sm">Kolumner</Button>}
                    footer={<Button variant="secondary" onClick={() => { setColumns(defaultColumns); if (isLegacyIntradayMetric(sort.key)) setSort({ key: "marketCap", direction: "desc" }); }}>Standardkolumner</Button>}>
                    <Stack gap={4}>
                        <TextField label="Sök kolumn" value={columnSearch} onValueChange={setColumnSearch} />
                        <div className={styles.columnChoices}>
                            {DISCOVERABLE_METRICS.filter(key => matchesMetricSearch(key, columnSearch)).map(key =>
                                <Checkbox key={key} label={<Inline>{METRICS[key].label}{!unlocked(key) && <Label tone="accent">Plus</Label>}</Inline>} checked={columns.includes(key)} disabled={!unlocked(key)}
                                    onCheckedChange={checked => setColumns(current => checked ? [...current, key] : current.filter(item => item !== key))} />)}
                            {legacyColumnChoices.filter(key => matchesMetricSearch(key, columnSearch)).map(key =>
                                <Checkbox key={key} label={<Inline>Äldre intradag · {METRICS[key].label}</Inline>} checked={columns.includes(key)} disabled={!unlocked(key)}
                                    onCheckedChange={checked => setColumns(current => checked ? [...new Set([...current, key])] : current.filter(item => item !== key))} />)}
                            {![...DISCOVERABLE_METRICS, ...legacyColumnChoices].some(key => matchesMetricSearch(key, columnSearch)) && <Text size="sm" tone="secondary">Inga kolumner matchar.</Text>}
                        </div>
                        {!paidAccess && <UpgradeLink tier="plus" inline />}
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
                    {meta?.preview === true && <span> · Exempeldata</span>}
                </Text>
                <Text size="xs" tone="secondary">
                    {validDataTime
                        ? <>Marknadsdata <time dateTime={dataTime.toISOString()}>{dataTime.toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Stockholm" })}</time></>
                        : "Uppdateringstid saknas"}
                </Text>
            </div>
            {(filters.some(filter => filter.metric.startsWith("profile") || filter.metric.startsWith("insider_"))) && (
                <Text size="xs" tone="secondary" role="status">
                    {filters.some(filter => filter.metric.startsWith("profile")) && `Profiler: ${meta?.profileCount ?? 0} av ${items?.length ?? 0} bolag. ${meta?.profileStatus === "pending" ? "Underlaget hämtas i bakgrunden. " : ""}`}
                    {filters.some(filter => filter.metric.startsWith("insider_")) && (meta?.insiderStatus === "pending" ? "Insynsunderlaget hämtas i bakgrunden." : "Endast registrerade aktieaffärer; saknat underlag är inte noll.")}
                </Text>
            )}
            {meta?.count > (items?.length ?? 0) && <Text size="xs" tone="secondary">Urvalet omfattar {items?.length} av {meta.count} bolag i källan.</Text>}
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
                    title={hasFilters ? ((meta?.profileStatus === "pending" && filters.some(filter => filter.metric.startsWith("profile"))) || (meta?.insiderStatus === "pending" && filters.some(filter => filter.metric.startsWith("insider_"))) ? "Filterunderlaget hämtas" : "Inga bolag matchar urvalet") : "Ingen screenerdata att visa ännu"}
                    description={hasFilters ? "Saknade värden matchar inte filtret. Pågående hämtning uppdateras automatiskt; annars kan du bredda urvalet." : "Försök igen om en liten stund."}
                    action={hasFilters
                        ? <Button variant="secondary" onClick={resetFilters}>Visa alla bolag</Button>
                        : <Button variant="secondary" loading={refreshing} onClick={() => load({ silent: true })}>Försök igen</Button>}
                />
            ) : (
                <div className={styles.tableShell}>
                    <div ref={resultRegion} className={styles.tableScroll} role="region" tabIndex={0} aria-label="Screenerresultat, skrolla i sidled för fler nyckeltal">
                        <table className={styles.table} style={{ minWidth: 248 + columns.length * 104 }} aria-label="Bolag och nyckeltal">
                            <thead>
                                <tr>
                                    {columnDefinitions.map((column) => {
                                        const active = sort.key === column.key;
                                        return (
                                            <th scope="col" key={column.key}
                                                data-metric={column.key}
                                                className={column.key === "company" ? styles.companyColumn : undefined}
                                                aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
                                            >
                                                <Button variant="ghost" size="sm" className={styles.sortButton} title={METRICS[column.key]?.description} onClick={() => toggleSort(column.key)}>
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
                                            <Link href={`/aktie/${encodeURIComponent(row.symbol)}`} className={styles.companyLink}
                                                aria-haspopup="dialog" title={historyContext(row)} aria-description={historyContext(row)}
                                                onClick={event => openCompany(event, row.symbol)}>
                                                <CompanyProfileRadar
                                                    compact
                                                    companyName={row.name ?? row.symbol}
                                                    loading={!row.profile && meta?.profileStatus === "pending"}
                                                    profile={row.profile ?? null}
                                                />
                                                <span className={styles.companyCopy}>
                                                    <strong>{row.name ?? row.symbol}</strong>
                                                    <span>{row.nativeSymbol ?? row.symbol}{row.segment ? ` · ${segmentLabel(row.segment)}` : ""}</span>
                                                </span>
                                            </Link>
                                        </td>
                                        {columnDefinitions.slice(1).map((column) => {
                                            const value = valueFor(row, column.key);
                                            return (
                                                <td key={column.key} title={METRICS[column.key].dailyField ? historyContext(row) : METRICS[column.key].description} className={cx(
                                                    value == null && styles.missing,
                                                    METRICS[column.key].signed && signedClass(value),
                                                )}>
                                                    {screenerMetricText(row, column.key)}
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
                        {items !== null && <Text size="sm">
                            {historyDates.length ? `Historik till ${historyDates.at(-1)}${historyDates.length > 1 ? ` · vissa bolag till ${historyDates[0]}` : ""}. Stängning: ${dailyCoverage}/${items.length} bolag.` : "Dagskurshistorik saknas i det hämtade underlaget."}
                            {" "}Saknade historiska värden markeras med — och matchar inte filter.
                        </Text>}
                        <Text size="sm">Historiska tekniska mått använder enbart avslutade handelsdagar. Datum och underlag visas när du för muspekaren över bolaget eller ett historiskt värde; äldre eller kortare historik kan ge saknade värden. Kursgrund och täckning kommer från historikkällan, utan intradagskurser som reserv.</Text>
                        <Text size="sm">
                            {staleHistoryCount > 0 && `Äldre underlag används för ${staleHistoryCount} bolag i det hämtade underlaget. `}
                            Äldre underlag får användas för daglig bolagsresearch, men siffrorna gäller historikdatumet i bolagets underlag, inte senaste handelsdagen. Saknade eller för korta perioder ger inget värde; detta är inte historisk återspelning vid valfritt datum.
                        </Text>
                        <Text size="sm">Utveckling 1 månad avser 21 handelsdagar, inte 1 minut. 1 vecka, 3 månader, 6 månader och 1 år avser 5, 63, 126 respektive 252 handelsdagar. I år jämför med föregående års sista handelsdag. 52-veckorsnivåer kräver 365 kalenderdagars täckning.</Text>
                        <Text size="sm">Historiken använder leverantörens sparade dagskurser (provider_close, stored-yahoo). Justering för split och andra bolagshändelser är inte verifierad. Måtten är kursförändringar, inte totalavkastning med utdelningar.</Text>
                        <Text size="sm">Relativ volym, avslutad dag jämför en avslutad dags volym med 20 tidigare avslutade dagar. Detta skiljer sig från Terminalens pågående Day RVOL och RVOL vid samma klockslag.</Text>
                        <Text size="sm">Finansiella nyckeltal bygger på senast rapporterade helår. Värderingsmultiplar visas bara när kurs, antal aktier och jämförbar rapporteringsvaluta finns.</Text>
                        <Text size="sm">Börsvärde och värderingsmultiplar använder senast tillgängliga marknadskurs tillsammans med rapporterade helårsvärden, inte en historisk värdering vid valfritt datum. Äldre intradagsvillkor i delade länkar behåller sin ursprungliga betydelse. Tider visas i svensk tid. Saknade värden sorteras sist.</Text>
                        {meta?.financialCoverage != null && <Text size="sm">Helårsdata finns för {meta.financialCoverage} bolag.</Text>}
                        <Text size="sm">Bolag utan färska kurser finns kvar för fundamental screening. Saknade värden matchar inte ett filter. Alla villkor måste vara uppfyllda; Mellan inkluderar båda gränserna.</Text>
                        <Text size="sm">Insynsfilter summerar registrerade aktieförvärv och försäljningar efter transaktionsdatum, inte antalet nyhetsartiklar. Belopp kräver SEK. Underlaget kan vara ofullständigt; bolag utan registrerade affärer i underlaget visas som Saknas.</Text>
                        <Text size="sm">Bolagsprofilens sex axlar sammanfattar underliggande nyckeltal. Färgen visar genomsnittet av tillgängliga poäng, inte ett köp- eller säljråd. Saknade axlar får inga poäng.</Text>
                    </Stack>
                </Dialog>
                {shownItems.length < visibleItems.length && (
                    <Button variant="secondary" onClick={() => setResultLimit((value) => value + 50)}>Visa fler bolag</Button>
                )}
                <Text size="xs" tone="secondary" numeric>{items?.length ? `Visar ${shownItems.length} av ${visibleItems.length}` : ""}</Text>
            </div>
            {(selectedCompany || drawerVisited) && <ScreenerCompanyDrawer symbol={selectedCompany} row={items?.find(row => row.symbol === selectedCompany)}
                rows={visibleItems} columns={columns} cache={previewCache} onSelect={selectCompany} onClose={closeCompany}
                onClosed={() => { if (screenerScroll.current) window.scrollTo({ ...screenerScroll.current, behavior: "instant" }); }}
                finalFocus={() => {
                    const target = companyTrigger.current?.isConnected ? companyTrigger.current : resultRegion.current;
                    target?.focus({ preventScroll: true });
                    return false;
                }} />}
        </section>
    );
}

export default function ScreenerPage() {
    const { user, isPlusUser, accountError, refreshUser } = useAuthContext();
    const [login, setLogin] = useState(false);
    return (
        <Container as="main" className={styles.workspace}>
            <StockWorkspaceNav foundation />
            {accountError ? <EmptyState title="Kunde inte hämta ditt konto" action={<Button onClick={refreshUser}>Försök igen</Button>} />
                : !user ? <Skeleton className={styles.loadingRow} />
                : user.email ? <ScreenerTable key={`${user.email}:${isPlusUser ? "plus" : "free"}`} plus={Boolean(isPlusUser)} />
                : <ScreenerPreview onLogin={() => setLogin(true)} />}
            <Dialog open={login} onOpenChange={setLogin} title="Logga in på OMXsum"><LogInModal redirectTo="/aktier/screener" /></Dialog>
        </Container>
    );
}
