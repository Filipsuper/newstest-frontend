"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiArrowRight, FiBookOpen, FiGrid, FiSearch } from "react-icons/fi";
import { getCompanies } from "../utils/companies";
import { onboardingCompanies } from "../utils/onboarding";
import { hasTerminalPlan, memberPlan } from "../utils/membership";
import ActiveTrial from "./ActiveTrial";
import OnboardingSummary from "./OnboardingSummary";
import PersonalPreview from "./PersonalPreview";
import { Button } from "./ui/Button";
import { DataList, ListRow } from "./ui/data";
import { Heading, Inline, Stack, Text } from "./ui/layout";
import styles from "./onboarding.module.css";

export default function OnboardingComplete({ user, onEdit, returnTo }) {
  const [directory, setDirectory] = useState([]);
  useEffect(() => {
    let active = true;
    if (user.watchlist?.length) getCompanies().then(rows => { if (active) setDirectory(rows); });
    return () => { active = false; };
  }, [user.email, user.watchlist?.length]);
  const companies = onboardingCompanies(user.watchlist, directory);
  const hasCompanies = companies.length > 0;
  const hasPreferences = hasCompanies || user.topics?.length || user.keywords?.length;
  const paid = ["plus", "pro"].includes(memberPlan(user));
  const nextSteps = [
    { href: "/morgonbrevet", title: "Läs Morgonbrevet", description: "Börsdagen sammanfattad.", icon: FiBookOpen },
    paid ? { href: "/aktier/screener", title: "Hitta fler bolag", description: "Filtrera och jämför i Screener.", icon: FiSearch }
      : { href: "/aktier", title: "Utforska börsens bolag", description: "Hitta nästa bolag att följa.", icon: FiSearch },
    ...(hasTerminalPlan(user) ? [{ href: "/terminal", title: "Öppna Terminal", description: "Nyheter och grafer i samma arbetsyta.", icon: FiGrid }] : []),
  ];

  return <Stack gap={8}>
    <Stack gap={4}>
      <ActiveTrial trial={user.trial} />
      <Inline gap={3}>
        <Button nativeButton={false} role="link" render={<Link href={hasPreferences ? "/marknaden/bevakning" : "/marknaden"} />}>
          {hasPreferences ? hasCompanies ? "Se nyheterna för mina bolag" : "Se mina nyheter" : "Till Marknaden"}
          <FiArrowRight aria-hidden="true" />
        </Button>
      </Inline>
    </Stack>

    {hasCompanies && <Stack as="section" gap={4} aria-labelledby="onboarding-companies-title">
      <Inline className={styles.between}>
        <Heading id="onboarding-companies-title" size="subsection">Utforska dina bolag</Heading>
        <Text size="xs" tone="secondary">{user.watchlist.length} följda</Text>
      </Inline>
      <DataList label="Dina bolag att utforska">
        {companies.map(company => <ListRow key={company.symbol} className={styles.exploreCompany}
          trailing={<Button variant="secondary" size="sm" nativeButton={false} role="link"
            render={<Link href={company.href} />} aria-label={`Utforska ${company.name}`}>
            Utforska <FiArrowRight aria-hidden="true" />
          </Button>}>
          <Stack gap={1}>
            <Text size="md" className={styles.companyName}>{company.name}</Text>
            <Text size="xs" tone="secondary">{company.ticker}</Text>
          </Stack>
        </ListRow>)}
      </DataList>
      {user.watchlist.length > companies.length && <Inline>
        <Link href="/marknaden/bevakning/hantera" className={styles.link}>Visa alla {user.watchlist.length} bolag</Link>
      </Inline>}
    </Stack>}

    <Stack as="section" gap={4} aria-labelledby="onboarding-next-title">
      <Heading id="onboarding-next-title" size="subsection">Vad vill du göra nu?</Heading>
      <DataList label="Nästa steg">
        {nextSteps.map(({ href, title, description, icon: Icon }) => <ListRow key={href} className={styles.nextStep}
          leading={<Icon aria-hidden="true" />} trailing={<FiArrowRight aria-hidden="true" />}>
          <Link href={href} className={styles.nextLink}><Text as="span" size="sm" className={styles.companyName}>{title}</Text></Link>
          <Text size="xs" tone="secondary">{description}</Text>
        </ListRow>)}
      </DataList>
    </Stack>

    {hasPreferences && <PersonalPreview />}

    <Stack as="section" gap={4} aria-labelledby="onboarding-saved-title">
      <Heading id="onboarding-saved-title" size="subsection">Dina sparade val</Heading>
      <OnboardingSummary user={user} />
      <Inline gap={3}>
        <Button variant="ghost" onClick={onEdit}>Ändra mina val</Button>
        <Link href="/settings#letters" className={styles.link}>Brev och inställningar</Link>
        {returnTo !== "/marknaden/bevakning" && <Link href={returnTo} className={styles.link}>Tillbaka där du började</Link>}
      </Inline>
    </Stack>
  </Stack>;
}
