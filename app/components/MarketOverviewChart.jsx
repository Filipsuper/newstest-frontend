"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

const INDEX_COPY = {
    omxspi: { shortName: "OMXSPI", description: "Hela Stockholmsbörsen" },
    omxs30: { shortName: "OMXS30", description: "30 stora och omsatta bolag" },
};

const formatNumber = (value) => Number(value).toLocaleString("sv-SE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
});

const formatPercent = (value) => `${value >= 0 ? "+" : ""}${Number(value).toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}%`;

const formatShortDate = (value) => new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Stockholm",
}).format(new Date(value));

const cleanBars = (benchmark) => (benchmark?.bars ?? [])
    .map((bar) => ({
        time: bar.time ?? Date.parse(`${bar.date}T12:00:00Z`),
        date: bar.date,
        close: Number(bar.close),
    }))
    .filter((bar) => Number.isFinite(bar.close) && Number.isFinite(bar.time));

export const benchmarkChange = (benchmark) => {
    const bars = cleanBars(benchmark);
    if (bars.length < 2) return null;
    const previous = bars.at(-2).close;
    return previous ? ((bars.at(-1).close - previous) / previous) * 100 : null;
};

function IndexTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    return (
        <div className="market-chart-tooltip">
            <strong>{new Intl.DateTimeFormat("sv-SE", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "Europe/Stockholm",
            }).format(new Date(point.time))}</strong>
            <span>Stängning: {formatNumber(point.close)}</span>
        </div>
    );
}

export default function MarketOverviewChart({ benchmarks = [], compact = false }) {
    const available = useMemo(
        () => benchmarks.filter((benchmark) => cleanBars(benchmark).length > 1),
        [benchmarks],
    );
    const [selectedId, setSelectedId] = useState(available[0]?.id ?? null);

    useEffect(() => {
        if (!available.some((benchmark) => benchmark.id === selectedId)) {
            setSelectedId(available[0]?.id ?? null);
        }
    }, [available, selectedId]);

    if (!available.length) {
        return (
            <div className="market-chart-empty">
                Indexhistoriken kunde inte hämtas just nu.
            </div>
        );
    }

    const selected = available.find((benchmark) => benchmark.id === selectedId) ?? available[0];
    const data = cleanBars(selected);
    const last = data.at(-1);
    const first = data[0];
    const periodChange = first.close ? ((last.close - first.close) / first.close) * 100 : null;

    return (
        <div className={`market-index-chart ${compact ? "market-index-chart--compact" : ""}`}>
            <div className="market-index-tabs" role="group" aria-label="Välj index">
                {available.map((benchmark) => {
                    const copy = INDEX_COPY[benchmark.id] ?? {
                        shortName: benchmark.shortName ?? benchmark.name,
                        description: benchmark.name,
                    };
                    const change = benchmarkChange(benchmark);
                    return (
                        <button
                            key={benchmark.id}
                            type="button"
                            aria-pressed={benchmark.id === selected.id}
                            className={benchmark.id === selected.id ? "is-active" : ""}
                            onClick={() => setSelectedId(benchmark.id)}
                        >
                            <span>
                                <strong>{copy.shortName}</strong>
                                <small>{copy.description}</small>
                            </span>
                            <span className={change == null ? "" : change >= 0 ? "market-positive" : "market-negative"}>
                                {change == null ? "Saknas" : formatPercent(change)}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="market-chart-heading">
                <div>
                    <span>{INDEX_COPY[selected.id]?.shortName ?? selected.shortName ?? selected.name}</span>
                    <strong>{formatNumber(last.close)}</strong>
                </div>
                {periodChange != null && (
                    <p>
                        <span className={periodChange >= 0 ? "market-positive" : "market-negative"}>
                            {formatPercent(periodChange)}
                        </span>{" "}
                        senaste 30 handelsdagarna
                    </p>
                )}
            </div>

            <div className="market-chart-canvas" aria-label={`${selected.name ?? selected.id}, kursutveckling senaste 30 handelsdagarna`}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--company-grid-line)" />
                        <XAxis
                            dataKey="time"
                            type="number"
                            scale="time"
                            domain={["dataMin", "dataMax"]}
                            tickFormatter={formatShortDate}
                            axisLine={false}
                            tickLine={false}
                            minTickGap={48}
                            tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                        />
                        <YAxis
                            domain={["auto", "auto"]}
                            orientation="right"
                            tickFormatter={formatNumber}
                            axisLine={false}
                            tickLine={false}
                            width={54}
                            tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                        />
                        <Tooltip
                            content={<IndexTooltip />}
                            cursor={{ stroke: "var(--color-text-muted)", strokeDasharray: "3 3", strokeOpacity: 0.45 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="close"
                            stroke="var(--company-yellow)"
                            strokeWidth={2.5}
                            fill="var(--market-chart-fill)"
                            fillOpacity={1}
                            dot={false}
                            activeDot={{ r: 4, fill: "var(--company-yellow)", stroke: "var(--market-workbench-panel)" }}
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <p className="market-source">
                {compact
                    ? `Yahoo · stängning ${last.date ?? formatShortDate(last.time)}`
                    : `Källa: Yahoo Finance via OMXsum Market API · Daglig stängningskurs · Senast ${last.date ?? formatShortDate(last.time)}`}
            </p>
        </div>
    );
}
