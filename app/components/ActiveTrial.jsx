"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { activeTrialPresentation, trialEndLabel } from "../utils/membershipTrial";
import { Button } from "./ui/Button";
import { cx, Heading, Inline, Stack, Surface, Text } from "./ui/layout";
import { Label } from "./ui/Label";
import { Tooltip } from "./ui/overlays";
import styles from "./membership-trial.module.css";

function useActiveTrial(trial) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (trial?.status !== "active") return;
    const update = () => setNow(Date.now());
    const timer = setInterval(update, 60000);
    document.addEventListener("visibilitychange", update);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, [trial?.status, trial?.endsAt]);
  return activeTrialPresentation(trial, now);
}

function TrialLabelContent({ active }) {
  return <Label tone="accent" data-trial-label>
    {active.name} · Provperiod · {active.shortRemainingLabel}
  </Label>;
}

export function TrialLabel({ trial, details = false, fallback = null }) {
  const active = useActiveTrial(trial);
  if (!active) return fallback;
  const label = <TrialLabelContent active={active} />;
  if (!details) return label;
  return <Tooltip touchable trigger={<Button variant="ghost" className={styles.labelTrigger}
    aria-label={`${active.name}-provperiod · ${active.remainingLabel}. Visa villkor`}>{label}</Button>}>
    Provperiod till {trialEndLabel(trial)}. När provperioden är slut fortsätter du
    med gratisversionen. Ingen automatisk betalning.
  </Tooltip>;
}

export function ActiveTrialBadge({ trial, className }) {
  const active = useActiveTrial(trial);
  if (!active) return null;
  return <Link href="/settings#plan" className={cx(styles.badgeLink, className)}
    aria-label={`${active.name}-provperiod · ${active.remainingLabel}. Se din plan`}
    title={`Provperiod till ${trialEndLabel(trial)}. Ingen automatisk betalning.`}>
    <TrialLabelContent active={active} />
  </Link>;
}

export default function ActiveTrial({ trial }) {
  const active = useActiveTrial(trial);
  if (!active) return null;
  return <Surface as="section" className={styles.active} aria-label="Din provperiod">
    <Stack gap={4}>
      <Inline className={styles.statusLine}>
        <Label tone="accent">{active.name} · Aktiv provperiod</Label>
        <Text size="xs" tone="secondary">{active.remainingLabel}</Text>
      </Inline>
      <Stack gap={2}>
        <Heading size="subsection">Din {active.name}-provperiod är igång</Heading>
        <Text size="sm" tone="secondary">Hela nyhetsflödet, kursreaktioner och fördjupad bolagsanalys.
          {trial.plan === "pro" ? " Du har också tillgång till Terminal." : " Du kan följa upp till 20 bolag."}</Text>
      </Stack>
      <Inline>
        <Link href="/settings#plan" className={styles.planLink}>Se min plan</Link>
      </Inline>
    </Stack>
  </Surface>;
}
