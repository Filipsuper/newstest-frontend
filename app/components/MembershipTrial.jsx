"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useAuthContext } from "../providers/AuthProvider";
import { startMembershipTrial } from "../utils/membershipTrial";
import { Button } from "./ui/Button";
import { Heading, Inline, Stack, Surface, Text } from "./ui/layout";
import { TrialLabel } from "./ActiveTrial";
import styles from "./membership-trial.module.css";

export function TrialStatus({ trial, subscribe = false, compact = false }) {
  if (trial?.status !== "active") return null;
  return <Inline role="status">
    <TrialLabel trial={trial} details={!compact} />
    {subscribe && <Button variant="secondary" nativeButton={false} render={<Link href="/pro" />}>Se betalplaner</Button>}
  </Inline>;
}

export default function MembershipTrial({ disabled = false, onBusyChange, context }) {
  const { user, refreshUser } = useAuthContext();
  const [busy, setBusy] = useState(null);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(null);
  const active = user?.trial?.status === "active" ? user.trial
    : ["expired", "converted"].includes(user?.trial?.status) ? null : started;

  async function start(tier) {
    if (pending.current || disabled) return;
    pending.current = true; setBusy(tier); onBusyChange?.(true); setError("");
    try {
      const trial = await startMembershipTrial(tier);
      setStarted(trial);
      if (!await refreshUser()) setError("Provperioden har startat. Hämta din plan igen för att se tillgången.");
    } catch (err) { setError(err.name === "AbortError" ? "Svaret dröjde. Hämta din plan innan du försöker igen." : err.message); }
    finally { pending.current = false; setBusy(null); onBusyChange?.(false); }
  }
  if (!user?.trial?.eligible && !active && !error) return null;
  return <Stack as="section" gap={4} aria-label="Prova en plan">
    {active ? <TrialStatus trial={active} /> : <>
      <Stack gap={2}>
        <Heading size="subsection">Prova mer i 7 dagar</Heading>
        <Text size="sm" tone="secondary">Inget kort. Ingen automatisk betalning.</Text>
      </Stack>
      <div className={styles.options}>
        {[{ id: "plus", name: "Plus", price: 49, description: context === "email" ? "Mejlbevakning, 20 bolag och hela nyhetsflödet." : "20 bolag, hela nyhetsflödet och fördjupad bolagsanalys." },
          { id: "pro", name: "Pro", price: 99, description: "Allt i Plus, 100 bolag och OMXsum Terminal." }].map(tier =>
          <Surface key={tier.id} className={styles.option}>
            <Stack gap={3}>
              <Heading as="h3" size="subsection">{tier.name}</Heading>
              <Text size="sm" tone="secondary">{tier.description}</Text>
              <Text size="xs" tone="secondary">{tier.price} kr/mån om du senare väljer att prenumerera.</Text>
              <Button variant={tier.id === "plus" ? "primary" : "secondary"} disabled={disabled || Boolean(busy)} loading={busy === tier.id}
                onClick={() => start(tier.id)}>Prova {tier.name} gratis</Button>
            </Stack>
          </Surface>)}
      </div>
    </>}
    {error && <Stack gap={2}><Text size="sm" role="alert">{error}</Text>
      <Inline><Button variant="ghost" disabled={Boolean(busy)} onClick={async () => {
        setBusy("refresh"); onBusyChange?.(true); const account = await refreshUser();
        if (account) { setStarted(null); setError(""); }
        setBusy(null); onBusyChange?.(false);
      }}>Hämta min plan</Button></Inline></Stack>}
  </Stack>;
}
