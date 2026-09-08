"use client";

import { reactionGeometry } from "../utils/reactionGeometry";
import { newsDate } from "../utils/newsroom";
import { Text } from "./ui/layout";
import styles from "./story-reader.module.css";

export default function ReactionChart({ series, publishedAt, markerLabel = "Publicering", caption, v2 = false }) {
  const geometry = reactionGeometry(series, publishedAt);
  if (!geometry) return <Text size="sm" tone="secondary">Kurskurvan visas när det finns tillräckligt med handel kring {v2 ? "mätperioden" : "publiceringen"}.</Text>;
  const { points, width, height, path, area, zero, marker } = geometry;
  const tone = points.at(-1).pct < 0 ? "var(--ui-negative)" : "var(--ui-positive)";
  return (
    <figure className={styles.chart}>
      <div className={styles.plot}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img"
          aria-label={v2 ? "Observerad kursförändring i procent mot mätningens utgångskurs" : "Kursutveckling runt publiceringen, procent mot senaste avslut före nyheten"}>
          <line x1="44" x2={width - 16} y1={zero} y2={zero} stroke="var(--ui-border)" />
          <path d={area} fill={tone} opacity="0.08" />
          <path d={path} fill="none" stroke={tone} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {marker !== null && <line x1={marker} x2={marker} y1="18" y2={height - 30} stroke="var(--ui-text-secondary)" strokeDasharray="4 5" />}
        </svg>
        <span className={styles.zeroLabel} style={{ top: `${(zero / height) * 100}%` }}>0%</span>
        {marker !== null && <span className={styles.publishLabel} style={{ left: `clamp(44px, ${(marker / width) * 100}%, calc(100% - 90px))` }}>{markerLabel}</span>}
      </div>
      <div className={styles.chartAxis}><span>{newsDate(points[0].t)}</span><span>{newsDate(points.at(-1).t)}</span></div>
      {caption !== false && <figcaption>{caption ?? "Baslinje: senaste avslut före publicering. Kurvan visar ett tidsmässigt samband, inte bevis på orsak."}</figcaption>}
    </figure>
  );
}
