"use client";

import { useEffect, useState } from "react";
import { useCompanyAlerts } from "../hooks/useCompanyAlerts";
import { companyAlertsEnabled } from "../utils/companyAlerts";
import { getCompanies } from "../utils/companies";
import { requestNewsletterPreferences } from "../utils/newsletterPreferences";
import { onboardingEmailSummary } from "../utils/onboarding";
import { TOPIC_LABELS } from "../utils/topicLabels";
import { Stack, Surface, Text } from "./ui/layout";
import { TrialStatus } from "./MembershipTrial";
import styles from "./onboarding.module.css";

export default function OnboardingSummary({ user }) {
  const alerts = useCompanyAlerts(user);
  const [letters, setLetters] = useState(null);
  const [letterError, setLetterError] = useState(false);
  const [companies, setCompanies] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    requestNewsletterPreferences({ signal: controller.signal }).then(value => { if (!controller.signal.aborted) setLetters(value); })
      .catch(() => { if (!controller.signal.aborted) setLetterError(true); });
    let active = true;
    getCompanies().then(rows => { if (active) setCompanies(rows); });
    return () => { active = false; controller.abort(); };
  }, []);
  const names = (user.watchlist || []).map(symbol => companies.find(company => company.symbol === symbol)?.name || symbol);
  const topics = (user.topics || []).map(value => TOPIC_LABELS[value] || value);
  return <Stack gap={4}>
    <Surface className={styles.notice}>
      <dl className={styles.summary} aria-label="Dina sparade val">
        <div><Text as="dt" size="sm" tone="secondary">Dina bolag</Text><Text as="dd" size="sm">{names.length
          ? `${names.slice(0, 3).join(", ")}${names.length > 3 ? ` och ${names.length - 3} till` : ""}`
          : "Inga ännu – lägg till när du vill"}</Text></div>
        {topics.length > 0 && <div><Text as="dt" size="sm" tone="secondary">Ämnen</Text><Text as="dd" size="sm">{topics.slice(0, 3).join(", ")}{topics.length > 3 ? ` och ${topics.length - 3} till` : ""}</Text></div>}
        <div><Text as="dt" size="sm" tone="secondary">Brev på mejl</Text><Text as="dd" size="sm">{letters
          ? letters.selected.length ? letters.catalog.filter(letter => letters.selected.includes(letter.id)).map(letter => letter.title).join(", ") : "Inga valda"
          : letterError ? "Brevvalen kunde inte hämtas" : "Hämtar sparade brevval…"}</Text></div>
        {companyAlertsEnabled() && <div><Text as="dt" size="sm" tone="secondary">Bolagsmejl</Text><Text as="dd" size="sm">{alerts.loading ? "Hämtar mejlstatus…" : onboardingEmailSummary(alerts.error ? null : alerts.resource)}</Text></div>}
      </dl>
    </Surface>
    <TrialStatus trial={user.trial} />
  </Stack>;
}
