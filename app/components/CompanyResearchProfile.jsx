"use client";

import { useEffect, useState } from 'react';
import { FiAlertCircle, FiStar } from 'react-icons/fi';
import CompanyProfileRadar, { COMPANY_PROFILE_AXES } from './CompanyProfileRadar';
import { fetchCompanyProfiles } from '../utils/api';
import { companyProfileInsights } from '../utils/companyProfileInsights';
import { Button } from './ui/Button';
import { EmptyState, Skeleton } from './ui/data';
import { Heading, Stack, Text } from './ui/layout';
import styles from './company-research.module.css';

const scoreLabel = score => Number.isFinite(score) && score >= 0 && score <= 5 ? `${score} / 5` : 'Saknas';

function ReportPerspective({ title, entries, empty, opportunity = false }) {
  const Icon = opportunity ? FiStar : FiAlertCircle;
  return <Stack as="section" gap={3} aria-label={title}>
    <Heading as="h3" size="subsection">{title}</Heading>
    {entries?.length ? <Stack as="ul" gap={3} className={styles.profileInsightsList}>
      {entries.map((entry, index) => <li key={`${entry.pdfPage}-${index}`} className={styles.profileInsightRow}>
        <span className={`${styles.profileInsightIcon} ${opportunity ? styles.profileOpportunity : styles.profileRisk}`} aria-hidden="true"><Icon /></span>
        <Text>{entry.text}</Text>
      </li>)}
    </Stack> : <Text tone="secondary">{empty}</Text>}
  </Stack>;
}

/** Public research profile; deferred by the report shell, never gated by Plus. */
export default function CompanyResearchProfile({ symbol, companyName }) {
  const [state, setState] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    fetchCompanyProfiles([symbol]).then(response => {
      if (!active) return;
      const profile = response.items?.find(item => item.symbol === symbol);
      setState(response.unavailable ? { status: 'error' } : { status: 'ready', profile });
    }).catch(() => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [symbol, attempt]);

  if (state.status === 'loading') return <div className={styles.profileLoading} role="status" aria-label="Hämtar bolagsprofil">
    <Skeleton className={styles.profilePlaceholder} />
    <Text size="sm" tone="secondary">Hämtar bolagsprofil…</Text>
  </div>;
  if (state.status === 'error') return <EmptyState title="Bolagsprofilen kunde inte hämtas" action={<Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>Försök igen</Button>} />;
  const profile = state.profile;
  if (!profile || !Array.isArray(profile.axes) || !profile.axes.length) return <EmptyState title="Bolagsprofil saknas" description="Det finns inget profilunderlag för bolaget ännu." />;
  const axes = COMPANY_PROFILE_AXES.map(axis => {
    const data = profile.axes.find(item => item.key === axis.key);
    return { ...data, ...axis };
  });
  const missing = axes.filter(axis => scoreLabel(axis.score) === 'Saknas').map(axis => axis.label);
  const insights = companyProfileInsights(profile, symbol);
  return <Stack gap={3} className={styles.profile}>
    <div className={styles.profileOverview}>
      <Stack as="figure" gap={3} className={styles.profileFigure}>
        <CompanyProfileRadar companyName={companyName} profile={profile} perimeterLabels showPoints={false} />
        <Stack as="figcaption" gap={1}>
          {Number.isFinite(profile.coveragePct) && <Text size="sm" tone="secondary" numeric>{Math.round(profile.coveragePct)} % underlag</Text>}
          {missing.length > 0 && <Text size="sm" tone="secondary">Underlag saknas: {missing.join(', ')}</Text>}
        </Stack>
      </Stack>
      <Stack gap={3} className={styles.profileInsights}>
        <div className={styles.profilePerspectives}>
          <ReportPerspective title="Risker" entries={insights?.risks} empty="Rapportunderlag för risker saknas ännu." />
          <ReportPerspective title="Möjligheter" entries={insights?.opportunities} empty="Rapportunderlag för möjligheter saknas ännu." opportunity />
        </div>
        {insights && (insights.risks.length > 0 || insights.opportunities.length > 0) && <details className={styles.original}>
          <summary>Källor</summary>
          <Stack gap={3}>
            <Text size="sm" tone="secondary">{insights.source.title} · {insights.fiscalPeriod.replace('-FY', '')}</Text>
            <ul className={styles.profileSources}>
              {[["Risker", insights.risks], ["Möjligheter", insights.opportunities]].flatMap(([title, entries]) => entries.map((entry, index) => <li key={`${title}-${index}`}>
                <Text size="sm">{entry.text}</Text>
                <a className={styles.profileSource} href={entry.href} target="_blank" rel="noreferrer" aria-label={`${title}: ${entry.text} — PDF-sida ${entry.pdfPage}`}>PDF-sida {entry.pdfPage}</a>
              </li>))}
            </ul>
          </Stack>
        </details>}
      </Stack>
    </div>
    <details className={styles.original}>
      <summary>Så beräknas bolagsprofilen</summary>
      <Stack gap={3}>
        <dl className={styles.profileAxes}>
          {axes.map(axis => <div key={axis.key} className={styles.profileAxis}>
            <dt>{axis.label}</dt><dd>{scoreLabel(axis.score)}</dd>
          </div>)}
        </dl>
        <Text size="sm" tone="secondary">Varje perspektiv får 0–5 poäng utifrån andelen uppfyllda kontroller. Minst hälften måste ha underlag för att ge en poäng. Saknat underlag räknas inte som ett negativt utfall. Profilen är inte en köp- eller säljsignal.</Text>
        <Text size="sm" tone="secondary">Underlag visar andelen kontroller som går att utvärdera. Färgen speglar snittet av tillgängliga poäng: rött under 1,75, gult däremellan och grönt från 3,25. Saknade poäng står som Saknas. Formen sluts med snittet av kända poäng för dessa axlar, utan att tilldela dem en poäng.</Text>
        <Text size="sm" tone="secondary">Medurs från toppen: Värdering, Tillväxt, Historik, Hälsa, Insyn och Utdelning. Möjligheter och risker är separata rapportutdrag, inte slutsatser från profilpoängen eller köp- och säljråd.</Text>
        <Text size="xs" tone="secondary">Källa: OMXsum bolagsprofil{Number.isInteger(profile.version) ? ` · modellversion ${profile.version}` : ''}. Underliggande kontrollvärden ingår inte i den här vyn.</Text>
      </Stack>
    </details>
  </Stack>;
}
