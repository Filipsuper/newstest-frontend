import { ChangeBadge } from "./ui/data";
import { finiteNumber } from "../utils/newsroom";
import styles from "./workspace.module.css";

// Index and commodity widgets share geometry, typography and real-price curves.
export default function MarketQuote({ name, subtitle, change, points = [], period, chartLabel, details }) {
  const rows = (Array.isArray(points) ? points : []).filter(point => Array.isArray(point)
    && finiteNumber(point[0]) !== null && finiteNumber(point[1]) !== null);
  const values = rows.map(point => Number(point[1]));
  const min = Math.min(...values), max = Math.max(...values);
  const first = Number(rows[0]?.[0]), last = Number(rows.at(-1)?.[0]);
  const path = rows.map(([time, value], i) =>
    `${i ? "L" : "M"}${((Number(time) - first) / (last - first || 1)) * 72},${22 - ((Number(value) - min) / (max - min || 1)) * 20}`).join(" ");
  return <div className={styles.index} aria-label={name} title={details}>
    <div className={styles.indexText}>
      <strong>{name}</strong>
      <small>{subtitle}</small>
    </div>
    <ChangeBadge value={change} label={`${name}, ${period}`} />
    {rows.length > 1 && <svg viewBox="0 0 72 24" className={styles.indexChart}
      role="img" aria-label={`${name}, kursförlopp ${chartLabel || period}`}>
      <path d={path} fill="none"
        stroke={change === null ? "var(--ui-text-secondary)" : change < 0 ? "var(--ui-negative)" : "var(--ui-positive)"}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>}
  </div>;
}
