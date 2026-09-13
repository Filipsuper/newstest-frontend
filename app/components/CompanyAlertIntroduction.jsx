"use client";

import { useEffect, useRef, useState } from "react";
import { FiX } from "react-icons/fi";
import { companyAlertsEnabled } from "../utils/companyAlerts";
import WatchPreferencesButton from "./WatchPreferencesButton";
import { Inline, Text } from "./ui/layout";
import { IconButton } from "./ui/Button";

/** One contextual introduction per account on this device, never a delivery opt-in. */
export default function CompanyAlertIntroduction({ user }) {
  const previous = useRef(null);
  const [shownFor, setShownFor] = useState(null);
  useEffect(() => {
    const email = user?.email;
    if (!companyAlertsEnabled() || !email) { previous.current = null; return; }
    const count = user.watchlist?.length ?? 0;
    const before = previous.current;
    previous.current = { email, count };
    if (before?.email !== email || before.count !== 0 || count === 0) return;
    const storageKey = `omxsum:company-alert-intro:${email}`;
    try {
      if (localStorage.getItem(storageKey)) return;
      localStorage.setItem(storageKey, "shown");
      setShownFor(email);
    } catch { /* Keep the persistent entry point; avoid repeated hints without storage. */ }
  }, [user?.email, user?.watchlist]);
  if (!companyAlertsEnabled() || !user?.email || shownFor !== user.email) return null;
  return <Inline aria-label="Tips om mejlbevakning">
    <Text size="sm" tone="secondary">Du kan också välja mejlbevakning för dina bolag.</Text>
    <WatchPreferencesButton variant="ghost" size="sm" initialSection="email">Se mejlval</WatchPreferencesButton>
    <IconButton label="Dölj mejltips" onClick={() => setShownFor(null)}><FiX aria-hidden="true" /></IconButton>
  </Inline>;
}
