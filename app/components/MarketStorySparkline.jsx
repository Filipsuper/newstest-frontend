"use client";

import { useEffect, useRef, useState } from "react";
import { fetchCompanyIntraday, fetchStockSpark } from "../utils/api";
import MiniPriceChart from "./MiniPriceChart";

const chartCache = new Map();
const stockholmClock = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Stockholm",
});

const stockholmContext = () => {
    const parts = Object.fromEntries(
        stockholmClock.formatToParts(new Date()).map((part) => [part.type, part.value]),
    );
    const weekday = parts.weekday;
    const weekdaySession = !["Sat", "Sun"].includes(weekday);
    const minute = Number(parts.hour) * 60 + Number(parts.minute);
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    if (!weekdaySession || minute < 9 * 60) {
        return { date, mode: "week", label: "Senaste veckan" };
    }
    if (minute <= 17 * 60 + 30) {
        return { date, mode: "session", label: "Idag hittills" };
    }
    return { date, mode: "session", label: "Dagens handel" };
};

const percentChange = (points, baseline = null) => {
    const latest = Number(points.at(-1)?.[1]);
    const first = Number(baseline ?? points[0]?.[1]);
    return Number.isFinite(latest) && Number.isFinite(first) && first !== 0
        ? ((latest - first) / first) * 100
        : null;
};

const weekChart = async (symbol) => {
    const spark = await fetchStockSpark(symbol);
    const points = (spark?.points ?? []).slice(-6);
    if (points.length < 2) return null;
    return {
        points,
        change: percentChange(points),
        label: "Senaste veckan",
    };
};

const sessionChart = async (symbol, context) => {
    try {
        const intraday = await fetchCompanyIntraday(symbol);
        const points = (intraday?.current ?? []).map((bar) => [bar.time, bar.close]);
        if (intraday?.sessionDate === context.date && points.length >= 2) {
            const quoteChange = intraday?.quote?.changePct;
            return {
                points,
                change: quoteChange !== null
                    && quoteChange !== undefined
                    && Number.isFinite(Number(quoteChange))
                    ? Number(quoteChange)
                    : percentChange(points, intraday.previousClose),
                label: context.label,
            };
        }
    } catch {
        // The daily fallback below remains useful if a thinly traded stock has
        // no minute bars or the intraday source is briefly unavailable.
    }
    return weekChart(symbol);
};

const loadChart = (symbol, context) => {
    const key = `${context.date}:${context.mode}:${symbol}`;
    if (!chartCache.has(key)) {
        const promise = context.mode === "session"
            ? sessionChart(symbol, context)
            : weekChart(symbol);
        chartCache.set(key, promise.catch(() => null));
    }
    return chartCache.get(key);
};

export default function MarketStorySparkline({ symbol, company, publishedAt }) {
    const rootRef = useRef(null);
    const [chart, setChart] = useState(undefined);

    useEffect(() => {
        if (!symbol) {
            setChart(null);
            return undefined;
        }
        let active = true;
        let observer = null;
        const load = () => {
            const context = stockholmContext();
            loadChart(symbol, context).then((result) => {
                if (active) setChart(result);
            });
        };

        if (typeof IntersectionObserver === "undefined") {
            load();
        } else {
            observer = new IntersectionObserver((entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) return;
                observer.disconnect();
                load();
            }, { rootMargin: "80px" });
            if (rootRef.current) observer.observe(rootRef.current);
        }

        return () => {
            active = false;
            observer?.disconnect();
        };
    }, [symbol]);

    return (
        <div
            ref={rootRef}
            className={`impact-story__spark ${chart === undefined ? "is-loading" : ""}`.trim()}
        >
            {chart && (
                <>
                    <span>{chart.label}</span>
                    <MiniPriceChart
                        points={chart.points}
                        change={chart.change}
                        markerTime={publishedAt}
                        label={`${company ?? symbol}, kursutveckling ${chart.label.toLowerCase()}`}
                    />
                </>
            )}
        </div>
    );
}
