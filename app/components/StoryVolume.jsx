"use client";

import { newsMarketContext, volumeRatioLabel } from "../utils/newsMarketAttention";
import { newsDate } from "../utils/newsroom";
import { Text } from "./ui/layout";
import styles from "./story-reader.module.css";

const missing = {
  outside_session: "Jämförelsen kräver handel både före och efter publicering inom samma börssession.",
  incomplete_minute_coverage: "Minutdata saknas för delar av jämförelseperioden.",
  ambiguous_company_or_time: "Ett entydigt bolag och publiceringstid behövs för jämförelsen.",
};
export default function StoryVolume({ story, comparison }) {
  const context = newsMarketContext(story);
  if (!context && !comparison) return null;
  return (
    <details className={styles.details}>
      <summary>Handelsvolym</summary>
      {context && <>
        <dl className={styles.metrics}>
          <div><dt>RVOL · mot normal heldag</dt><dd>{context.dailyRvol === null ? "Saknas" : volumeRatioLabel(context.dailyRvol)}</dd></div>
          <div><dt>RVOL vid denna tid</dt><dd>{context.rvolAtTime === null ? "Saknas" : volumeRatioLabel(context.rvolAtTime)}{context.rvolAtTime !== null && !context.baselineMature && " · preliminärt"}</dd></div>
        </dl>
        <Text size="xs" tone="secondary">Bolagets handelsvolym per {newsDate(context.asOf)}. RVOL jämför dagens volym hittills med snittet för 20 hela handelsdagar. RVOL vid denna tid jämför med medianen vid samma klockslag{context.baselineSessionCount ? ` under ${context.baselineSessionCount} tidigare sessioner` : ""}.</Text>
      </>}
      {comparison?.status === "ready" ? <>
        <dl className={styles.metrics}>
          <div><dt>30 hela minuter före</dt><dd>{comparison.beforeShares.toLocaleString("sv-SE")} aktier</dd></div>
          <div><dt>30 hela minuter efter</dt><dd>{comparison.afterShares.toLocaleString("sv-SE")} aktier</dd></div>
          <div><dt>Efter / före</dt><dd>{comparison.ratio === null ? "Ingen jämförbar volym före" : volumeRatioLabel(comparison.ratio)}</dd></div>
        </dl>
        <Text size="xs" tone="secondary">{newsDate(comparison.beforeStart)}–{newsDate(comparison.beforeEnd, { day: undefined, month: undefined })} jämfört med {newsDate(comparison.afterStart)}–{newsDate(comparison.afterEnd, { day: undefined, month: undefined })}. Minutstapeln som överlappar publiceringen ingår inte.</Text>
      </> : comparison && <Text size="sm" tone="secondary">{comparison.status === "pending"
        ? "Jämförelsen visas när 30 hela minuter efter publicering har passerat."
        : missing[comparison.reason] || "Volymjämförelsen är inte tillgänglig."}</Text>}
      <Text size="xs" tone="secondary">Volymen visar handel kring nyheten, inte hur mycket handel nyheten orsakade. Jämförelsen före/efter är inte tidsjusterad RVOL.</Text>
    </details>
  );
}
