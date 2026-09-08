"use client";

import { useState } from "react";
import { Button } from "./ui/Button";
import { Select } from "./ui/Select";
import { SegmentedControl } from "./ui/SegmentedControl";
import { Badge, ChangeBadge } from "./ui/data";
import { Inline, Stack, Text } from "./ui/layout";
import { newsDate } from "../utils/newsroom";
import { volumeRatioLabel } from "../utils/newsMarketAttention";
import {
  completedReaction, preferredReactionPeriod, preferredVolumePeriod,
  REACTION_PERIODS, reactionPeriodLabel, reactionStatus,
  reactionSeriesFor, reactionV2For,
} from "../utils/reactionV2";
import ReactionChart from "./ReactionChart";
import styles from "./story-reaction.module.css";

const clockTime = value => newsDate(value, { day: undefined, month: undefined });
const shares = value => Number.isFinite(value) ? value.toLocaleString("sv-SE") + " aktier" : "Saknas";
const ratio = value => Number.isFinite(value) ? volumeRatioLabel(value) : "Saknas";
const startsAtOpen = measurement => ["before_open", "after_close", "non_trading_day"].includes(measurement?.timing);

export default function StoryReaction({ story, loading = false, error, onRefresh }) {
  const data = reactionV2For(story);
  const companies = story.companies ?? [];
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  if (!data) return null;
  const symbol = companies.some(company => company.symbol === selectedSymbol) ? selectedSymbol : companies[0]?.symbol;
  const measurement = data.measurements.find(item => item.symbol === symbol);
  const period = preferredReactionPeriod(measurement);
  const window = measurement?.windows?.[period];
  const complete = completedReaction(window);
  const pending = measurement?.status === "waiting_for_session" || window?.status === "pending";
  const label = reactionPeriodLabel(period, measurement);
  const shortPeriod = REACTION_PERIODS.find(([key]) => key === period)?.[1];
  const series = reactionSeriesFor(measurement, period);
  const hasChart = (series?.points ?? []).filter(point => Number.isFinite(point.pct)).length >= 3;
  const afterOpen = startsAtOpen(measurement);
  const status = measurement?.status === "measured" ? window?.status : measurement?.status;
  const volumePeriod = preferredVolumePeriod(measurement);
  const volume = measurement?.volume?.[volumePeriod];
  const post = volume?.post;
  const volumeComplete = post?.status === "complete" && Number.isFinite(post.volume) && post.volume >= 0;
  const normal = volumeComplete ? volume.relativeToNormal : null;
  const before = volumeComplete && volume.pre?.status === "complete" && volume.pre.volume > 0 ? volume.beforeAfterRatio : null;
  const provisional = Number.isFinite(normal) && !volume.baselineMature;
  const volumeFallback = post?.status === "pending" || measurement?.status === "waiting_for_session" ? "Väntar" : "Saknas";
  const volumeLabel = (afterOpen ? "Från öppning · " : "Första ") + volumePeriod.slice(1) + " min";
  const companyOptions = companies.map(company => ({ value: company.symbol, label: company.name || company.symbol }));

  return (
    <section className={styles.section} aria-label="Marknadens reaktion">
      {companies.length > 1 && (companies.length <= 3
        ? <SegmentedControl label="Bolag i nyheten" value={symbol} onValueChange={setSelectedSymbol} options={companyOptions} className={styles.companies} />
        : <Select label="Bolag i nyheten" value={symbol} onValueChange={setSelectedSymbol} options={companyOptions} />)}
      <dl className={styles.kpis} aria-label="Nyckeltal">
        <div className={styles.kpi}>
          <dt>Kursreaktion</dt>
          <dd>
            <ChangeBadge value={complete ? window.pct : null} fallback={pending ? "Väntar" : "Saknas"} label={label} className={styles.kpiValue} />
          </dd>
          <dd className={styles.period}>{afterOpen && !period.includes("close") ? shortPeriod + " från öppning" : shortPeriod}</dd>
        </div>
        <div className={styles.kpi}>
          <dt>Volym / normalt</dt>
          <dd>
            <Badge className={styles.kpiValue} aria-label={provisional ? "Volym mot normalt: " + ratio(normal) + ", preliminär jämförelse" : undefined}>
              {Number.isFinite(normal) ? ratio(normal) : volumeFallback}{provisional && <span aria-hidden="true">*</span>}
            </Badge>
          </dd>
          <dd className={styles.period}>{volumeLabel}</dd>
        </div>
        <div className={styles.kpi}>
          <dt>Volym / före</dt>
          <dd><Badge className={styles.kpiValue}>{Number.isFinite(before) ? ratio(before) : volumeFallback}</Badge></dd>
          <dd className={styles.period}>{volumeLabel}</dd>
        </div>
      </dl>
      {hasChart && <ReactionChart v2 series={series} publishedAt={measurement.anchorAt} markerLabel={afterOpen ? "Börsöppning" : "Publicering"} caption={false} />}
      {error && <Text role="alert" size="sm">{error}</Text>}
      <details className={styles.details}>
        <summary>Mätpunkter & underlag</summary>
        <Stack gap={4}>
          <Inline className={styles.between}>
            <Text size="sm">{label}</Text>
            {onRefresh && <Button variant="ghost" size="sm" disabled={loading} onClick={onRefresh}>{loading ? "Hämtar data…" : "Uppdatera data"}</Button>}
          </Inline>
          {measurement?.status === "waiting_for_session" && measurement.session?.open &&
            <Text size="sm" tone="secondary">Mätningen börjar vid börsöppning {newsDate(measurement.session.open)}.</Text>}
          {!complete && measurement?.status !== "waiting_for_session" && <Text size="sm" tone="secondary">{reactionStatus(status)}.</Text>}
          {complete && !hasChart && <Text size="sm" tone="secondary">Kurskurva saknas för den senaste mätperioden.</Text>}
          <dl className={styles.measurements} aria-label="Alla mätpunkter">
            {REACTION_PERIODS.map(([key]) => {
              const point = measurement?.windows?.[key];
              return <div key={key}>
                <dt>{reactionPeriodLabel(key, measurement)}</dt>
                <dd>{completedReaction(point)
                  ? <ChangeBadge value={point.pct} />
                  : <Text as="span" size="xs" tone="secondary">{point?.status === "pending" ? "Inväntar mätning" : reactionStatus(point?.status)}</Text>}</dd>
              </div>;
            })}
          </dl>
          <dl className={styles.provenance}>
            <div><dt>{measurement?.baseline?.kind === "previous_session_close_proxy" ? "Föregående stängning (minutkurs)" : "Utgångskurs före nyheten"}</dt><dd>{measurement?.baseline ? newsDate(measurement.baseline.priceAt) : "Saknas"}</dd></div>
            <div><dt>Önskad mättid</dt><dd>{window?.targetAt ? newsDate(window.targetAt) : "Saknas"}</dd></div>
            <div><dt>Faktisk avläsning</dt><dd>{window?.endpoint ? newsDate(window.endpoint.priceAt) : "Saknas"}</dd></div>
            <div><dt>Beräkning uppdaterad</dt><dd>{measurement?.asOf ? newsDate(measurement.asOf) : "Saknas"}</dd></div>
          </dl>
          {volumeComplete ? <Stack gap={2}>
            <Text size="sm" tone="secondary">{shares(post.volume)} · {newsDate(post.start)}–{clockTime(post.end)}</Text>
            <Text size="xs" tone="secondary">Volym: första {volumePeriod.slice(1)} hela minuterna · {post.observedBars} av {post.expectedBars} minuter.</Text>
            <Text size="xs" tone="secondary">{volume.baselineSessionCount >= 5
              ? (volume.baselineMature ? "Jämförelse med " : "* Preliminärt · ") + volume.baselineSessionCount + " jämförbara handelsdagar."
              : "För få jämförbara handelsdagar för en normalnivå."}</Text>
            {!Number.isFinite(normal) && volume.baselineSessionCount >= 5 && <Text size="xs" tone="secondary">Normalvolym saknas eller är noll.</Text>}
            {volume.pre?.status !== "complete" && <Text size="xs" tone="secondary">Före/efter: {reactionStatus(volume.pre?.status).toLowerCase()}.</Text>}
            {volume.pre?.volume === 0 && <Text size="xs" tone="secondary">Ingen kvot före/efter när volymen före är noll.</Text>}
          </Stack> : <Text size="sm" tone="secondary">{measurement?.status === "waiting_for_session"
            ? "Volymen mäts från börsöppning."
            : post ? reactionStatus(post.status) + "." : "Volymdata saknas."}</Text>}
          <Text size="xs" tone="secondary">Hela minuter jämförs med samma klockslag tidigare handelsdagar. Minuten som överlappar nyheten ingår inte. Volymen visar aktivitet kring nyheten, inte hur mycket handel den orsakade.</Text>
          <Text size="xs" tone="secondary">Yahoo Finance · minutdata, inte verifierad realtid. Endast avslutade minutstaplar används; avläsningen får ligga högst två minuter före mättiden.</Text>
          {afterOpen && <Text size="xs" tone="secondary">Perioden räknas från nästa börsöppning och jämförs med föregående börsdags sista tillgängliga minutkurs.</Text>}
          <Text size="xs" tone="secondary">Kurvan visar ett tidsmässigt samband, inte bevis på orsak. Andra nyheter och bolagshändelser som split eller utdelning är inte borträknade.</Text>
        </Stack>
      </details>
    </section>
  );
}
