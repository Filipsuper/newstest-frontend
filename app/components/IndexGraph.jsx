"use client";

import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

import { getGraphData } from '../utils/api';
import dayjs from "dayjs";

const UP_COLOR = "var(--market-positive)";
const DOWN_COLOR = "var(--market-negative)";

const formatPrice = (value) =>
    Number(value).toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function ChartTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const bar = payload[0].payload;
    const change = ((bar.c - bar.o) / bar.o) * 100;
    const up = change >= 0;
    return (
        <div className="bg-foreground rounded-xl shadow-lg px-3 py-2 font-sans text-xs">
            <p className="font-semibold text-text mb-1">{dayjs(bar.date).format("D MMM YYYY")}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-text-muted">
                <span>Öppning</span><span className="text-right text-text">{formatPrice(bar.o)}</span>
                <span>Högsta</span><span className="text-right text-text">{formatPrice(bar.h)}</span>
                <span>Lägsta</span><span className="text-right text-text">{formatPrice(bar.l)}</span>
                <span>Stängning</span><span className="text-right text-text">{formatPrice(bar.c)}</span>
            </div>
            <p className={`mt-1 font-semibold ${up ? "market-positive" : "market-negative"}`}>
                {up ? "+" : ""}{change.toFixed(2).replace(".", ",")}% under dagen
            </p>
        </div>
    );
}

function IndexGraph() {
    const [graphData, setGraphData] = useState([]);

    useEffect(() => {
        const fetchGraph = async () => {
            const res = await getGraphData();
            setGraphData(res);
        };
        fetchGraph();
    }, []);

    const renderCandlestick = (props) => {
        const { cx, payload, yAxis } = props;
        const { o, c, h, l } = payload;

        const isGrowing = c > o;
        const color = isGrowing ? UP_COLOR : DOWN_COLOR;

        const highY = yAxis.scale(h);
        const lowY = yAxis.scale(l);
        const openY = yAxis.scale(o);
        const closeY = yAxis.scale(c);

        const bodyHeight = Math.max(Math.abs(openY - closeY), 1);
        const bodyTop = Math.min(openY, closeY);

        return (
            <g>
                <line x1={cx} y1={highY} x2={cx} y2={lowY} stroke={color} strokeWidth={1} />
                <rect x={cx - 2.5} y={bodyTop} width={5} height={bodyHeight} fill={color} rx={1} />
            </g>
        );
    };

    if (graphData.length === 0) {
        return <div className="h-full flex items-center justify-center text-text-muted font-sans text-sm">Laddar graf…</div>;
    }

    // Pad the domain slightly so wicks never touch the plot edges
    const allPrices = graphData.flatMap(d => [d.o, d.c, d.h, d.l]);
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const pad = (max - min) * 0.06 || 1;
    const yDomain = [min - pad, max + pad];

    const firstPrice = graphData[0].c;
    const lastPrice = graphData[graphData.length - 1].c;
    const percentageChange = ((lastPrice - firstPrice) / firstPrice) * 100;
    const up = percentageChange >= 0;

    return (
        <div className="w-full h-full flex flex-col font-sans">
            <div className="flex flex-row justify-between items-baseline text-sm mb-1">
                <span className="font-bold text-text">OMXS30 <span className="font-normal text-text-muted">· 30 dagar</span></span>
                <div className="space-x-2">
                    <span className="text-text font-semibold">{formatPrice(lastPrice)}</span>
                    <span className={`font-semibold ${up ? "market-positive" : "market-negative"}`}>
                        {up ? "+" : ""}{percentageChange.toFixed(2).replace(".", ",")}%
                    </span>
                </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 0, bottom: 0, left: 8 }}>
                    <CartesianGrid horizontal vertical={false} stroke="var(--color-border)" strokeOpacity={0.5} />
                    <XAxis
                        dataKey="date"
                        stroke="var(--color-text-muted)"
                        tickFormatter={(tick) => dayjs(tick).format("D MMM")}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={40}
                        interval="preserveStartEnd"
                        fontSize={11}
                        tickMargin={6}
                    />
                    <YAxis
                        type="number"
                        domain={yDomain}
                        orientation="right"
                        tickCount={4}
                        tickFormatter={formatPrice}
                        axisLine={false}
                        tickLine={false}
                        stroke="var(--color-text-muted)"
                        fontSize={11}
                        width={44}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--color-border)", strokeDasharray: "3 3" }} />
                    <Scatter data={graphData} shape={renderCandlestick} isAnimationActive={false} />
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
}

export default IndexGraph;
