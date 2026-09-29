"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuthContext } from "../providers/AuthProvider";
import { useCompanyAlerts } from "../hooks/useCompanyAlerts";
import { companyAlertsEnabled } from "../utils/companyAlerts";
import { getCompanies } from "../utils/companies";
import { onboardingHref, restoredOnboardingStep, safeOnboardingReturn } from "../utils/onboarding";
import LogInModal from "../modals/logInModal";
import NewsletterPreferences from "./NewsletterPreferences";
import OnboardingLetterPreview from "./OnboardingLetterPreview";
import OnboardingSummary from "./OnboardingSummary";
import PersonalizationSetup from "./PersonalizationSetup";
import OnboardingTopics from "./OnboardingTopics";
import PersonalPreview from "./PersonalPreview";
import CompanyAlertPreferences from "./CompanyAlertPreferences";
import MembershipTrial, { TrialStatus } from "./MembershipTrial";
import { Button } from "./ui/Button";
import { Container, Heading, Inline, Stack, Text } from "./ui/layout";
import { Skeleton } from "./ui/data";
import styles from "./onboarding.module.css";

function EmailStep({ user, onNext, onDraftStateChange, onTrialBusyChange, trialBusy }) {
  const alerts = useCompanyAlerts(user);
  const [companies, setCompanies] = useState([]);
  useEffect(() => { let active = true; getCompanies().then(value => { if (active) setCompanies(value); }); return () => { active = false; }; }, []);
  return <Stack gap={3}>
    <CompanyAlertPreferences alerts={alerts} user={user} companies={companies} compact onDraftStateChange={onDraftStateChange}
      onContinue={onNext} continuationDisabled={trialBusy}
      upgradeOffer={user.trial?.eligible ? <Stack gap={3}>
        <MembershipTrial context="email" disabled={trialBusy} onBusyChange={onTrialBusyChange} />
        {!alerts.resource?.delivery.available && <Text size="xs" tone="secondary">Mejlval kan sparas, men inga bolagsmejl skickas ännu.</Text>}
      </Stack> : undefined} />
    <TrialStatus trial={user.trial} compact />
  </Stack>;
}

function Setup({ user, confirmedLetter = false, company, returnTo }) {
  const [step, setStep] = useState(confirmedLetter ? 2 : 1);
  const [restored, setRestored] = useState(false);
  const [draft, setDraft] = useState({ dirty: false, busy: false });
  const [following, setFollowing] = useState(false);
  const [savingTopics, setSavingTopics] = useState(false);
  const [trialBusy, setTrialBusy] = useState(false);
  const heading = useRef(null);
  const first = useRef(true);
  const hasCompanies = Boolean(user.watchlist?.length);
  const hasPreferences = Boolean(hasCompanies || user.topics?.length || user.keywords?.length);
  const mailStep = companyAlertsEnabled();
  const blocked = draft.dirty || draft.busy || following || savingTopics || trialBusy;
  const storageKey = `omxsum:onboarding-step:${confirmedLetter ? "letter" : "account"}:${user.email.toLowerCase()}`;
  useEffect(() => {
    try { setStep(restoredOnboardingStep(sessionStorage.getItem(storageKey), { hasCompanies, mailStep, confirmedLetter })); } catch {}
    setRestored(true);
    // Restore position once per account, never saved consent or draft values.
  }, [storageKey]);
  useEffect(() => {
    if (restored) { try { sessionStorage.setItem(storageKey, String(step)); } catch {} }
  }, [restored, storageKey, step]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    heading.current?.focus();
  }, [step]);
  const labels = ["Morgonbrevet", "Dina bolag", ...(mailStep ? ["Mejl"] : [])];
  const titles = { 1: "Vill du få börsmorgonen sammanfattad?", 2: "Vilka bolag vill du hålla koll på?", 3: "Håll koll på vad som händer i dina bolag", 4: hasPreferences ? "Din bevakning är klar" : "Du är igång" };
  if (!restored) return <Stack gap={3} role="status"><Text size="sm">Hämtar ditt steg…</Text><Skeleton /></Stack>;
  return <Stack gap={8}>
    <ol className={styles.steps} aria-label="Kom igång">
      {labels.map((label, index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined}>
        <span aria-hidden="true">{index + 1 < step ? "✓" : index + 1}</span>{label}
      </li>)}
    </ol>
    <Stack gap={3}>
      <Heading as="h1" size="page" tabIndex={-1} ref={heading}>{titles[step]}</Heading>
      {step === 1 && <Text size="sm" tone="secondary">Börsnyheter och sammanhang varje vardag. Morgonbrevet är gratis.</Text>}
      {step === 2 && <Text size="sm" tone="secondary">Börja med ett bolag. Du kan lägga till fler och ändra dina val senare.</Text>}
    </Stack>
    {step === 1 && <Stack gap={6}>
      <OnboardingLetterPreview />
      <NewsletterPreferences onContinue={() => setStep(2)} onDraftStateChange={setDraft} />
    </Stack>}
    {step === 2 && <Stack gap={6}>
      <PersonalizationSetup onboarding suggestedSymbol={company} onBusyChange={setFollowing} disabled={savingTopics} />
      {hasCompanies && <PersonalPreview companyOnly compact limit={1} />}
      <OnboardingTopics onBusyChange={setSavingTopics} disabled={following} />
      <Inline gap={3}>
        <Button disabled={following || savingTopics} onClick={() => setStep(mailStep && hasCompanies ? 3 : 4)}>
          {mailStep && hasCompanies ? "Fortsätt till mejl" : hasPreferences ? "Fortsätt" : "Välj bolag senare"}
        </Button>
      </Inline>
    </Stack>}
    {step === 3 && <EmailStep user={user} onDraftStateChange={setDraft} onTrialBusyChange={setTrialBusy} trialBusy={trialBusy}
      onNext={() => setStep(4)} />}
    {step === 4 && <Stack gap={6}>
      <OnboardingSummary user={user} />
      <Inline gap={3}>
        <Button nativeButton={false} role="link" render={<Link href={hasPreferences ? "/marknaden/bevakning" : "/marknaden"} />}>{hasPreferences ? hasCompanies ? "Se nyheterna för mina bolag" : "Se mina nyheter" : "Till Marknaden"}</Button>
        <Button variant="ghost" onClick={() => setStep(1)}>Ändra mina val</Button>
      </Inline>
      {hasPreferences && <PersonalPreview />}
      <Inline gap={4}>
        <Link href="/marknaden/bevakning/hantera" className={styles.link}>Lägg till ämnen och nyckelord</Link>
        <Link href="/settings#letters" className={styles.link}>Brev och inställningar</Link>
        <Link href="/morgonbrevet" className={styles.link}>Läs Morgonbrevet</Link>
        {returnTo !== "/marknaden/bevakning" && <Link href={returnTo} className={styles.link}>Tillbaka där du började</Link>}
      </Inline>
    </Stack>}
    {step > 1 && step < 4 && <Inline><Button variant="ghost" disabled={blocked} onClick={() => setStep(step - 1)}>Tillbaka</Button></Inline>}
  </Stack>;
}

function AccountRetry() {
  const { accountLoading, refreshUser } = useAuthContext();
  return <Stack gap={3}>
    <Text role="alert" size="sm">Kontot kunde inte hämtas. Försök igen.</Text>
    <Inline><Button variant="secondary" loading={accountLoading} onClick={refreshUser}>Hämta kontot igen</Button></Inline>
  </Stack>;
}

export function OnboardingSetup({ confirmedLetter = false }) {
  const { user, accountError } = useAuthContext();
  const params = useSearchParams();
  return user?.email ? <Stack gap={4}>
    {accountError && <AccountRetry />}
    <fieldset className={styles.search} disabled={Boolean(accountError)}>
      <Setup key={user.email} user={user} confirmedLetter={confirmedLetter}
        company={params.get("company")} returnTo={safeOnboardingReturn(params.get("returnTo"))} />
    </fieldset>
  </Stack> : accountError ? <AccountRetry /> : null;
}

export default function AccountOnboarding() {
  const { user, accountError } = useAuthContext();
  const params = useSearchParams();
  return <Container as="main" reading className={styles.page}>
    {accountError && !user?.email ? <AccountRetry /> : !user ? <Stack gap={4}><Text role="status">Hämtar ditt konto…</Text><Skeleton /></Stack>
      : user.email ? <OnboardingSetup /> : <Stack gap={6}>
        <Stack gap={3}>
          <Heading as="h1" size="page">Få koll på nyheterna om dina bolag</Heading>
          <Text size="md" tone="secondary">Följ dina bolag och förstå nyheterna bakom kursrörelserna. Börja gratis med två bolag.</Text>
        </Stack>
        <LogInModal createAccount redirectTo={onboardingHref({ company: params.get("company"), returnTo: params.get("returnTo") })} />
        <Link href="/marknaden" className={styles.link}>Utforska utan konto</Link>
      </Stack>}
  </Container>;
}
