"use client";
import { useState } from "react";
import Link from "next/link";
import { Tooltip } from "./ui/overlays";
import { finiteNumber } from "../utils/newsroom";
import { formatChange } from "./ui/format";
import styles from "./ticker-link.module.css";

const cache = new Map();
async function getSpark(symbol) {
  if (!cache.has(symbol))
    cache.set(
      symbol,
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/feed/spark/${encodeURIComponent(symbol)}`,
      )
        .then((response) => {
          if (!response.ok) throw new Error("Unavailable");
          return response.json();
        })
        .catch(() => {
          cache.delete(symbol);
          return null;
        }),
    );
  return cache.get(symbol);
}

function MiniChart({ points, news = [] }) {
  const rows = points.filter(
    (point) =>
      finiteNumber(point?.[0]) !== null && finiteNumber(point?.[1]) !== null,
  );
  if (rows.length < 2) return null;
  const values = rows.map((point) => Number(point[1]));
  const min = Math.min(...values),
    max = Math.max(...values),
    span = max - min || 1;
  const xy = (index) => [
    (index * 208) / (rows.length - 1),
    52 - ((values[index] - min) / span) * 48,
  ];
  const coords = rows.map((_, index) => xy(index).join(",")).join(" ");
  const color =
    values.at(-1) >= values[0] ? "var(--ui-positive)" : "var(--ui-negative)";
  const markers = [
    ...new Set(
      news
        .filter((ts) => finiteNumber(ts) !== null)
        .map((ts) =>
          rows.reduce(
            (nearest, point, index) =>
              Math.abs(point[0] - ts) < Math.abs(rows[nearest][0] - ts)
                ? index
                : nearest,
            0,
          ),
        ),
    ),
  ];
  return (
    <svg
      viewBox="0 0 208 56"
      role="img"
      aria-label="Kursutveckling senaste månaden"
    >
      <polygon points={`0,56 ${coords} 208,56`} fill={color} opacity="0.08" />
      <polyline
        points={coords}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {markers.map((index) => (
        <circle
          key={index}
          cx={xy(index)[0]}
          cy={xy(index)[1]}
          r="2.5"
          fill="var(--ui-accent)"
        />
      ))}
    </svg>
  );
}

export default function TickerLink({ symbol, children }) {
  const [spark, setSpark] = useState(undefined);
  const [busy, setBusy] = useState(false);
  async function load() {
    if (busy || spark !== undefined) return;
    setBusy(true);
    setSpark(await getSpark(symbol));
    setBusy(false);
  }
  const change = finiteNumber(spark?.changePct);
  return (
    <Tooltip
      trigger={
        <Link
          href={`/aktie/${encodeURIComponent(symbol)}`}
          className={styles.link}
          onPointerEnter={load}
          onFocus={load}
        >
          {children}
        </Link>
      }
    >
      <span className={styles.preview}>
        <span className={styles.header}>
          <span>{symbol.replace(".ST", "").replaceAll("-", " ")}</span>
          <span
            className={
              change === null
                ? ""
                : change < 0
                  ? styles.negative
                  : styles.positive
            }
          >
            {formatChange(change)}
          </span>
        </span>
        {spark?.points?.length >= 2 ? (
          <MiniChart points={spark.points} news={spark.news} />
        ) : (
          <span>
            {spark === undefined ? "Hämtar kursdata…" : "Kursdata saknas"}
          </span>
        )}
        <span className={styles.footer}>1 månad · Visa bolaget →</span>
      </span>
    </Tooltip>
  );
}
