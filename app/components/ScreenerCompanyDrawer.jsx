"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiChevronLeft, FiChevronRight, FiExternalLink } from 'react-icons/fi';
import { Dialog } from './ui/overlays';
import { Button, IconButton } from './ui/Button';
import { Heading, Inline, Stack, Text, cx } from './ui/layout';
import { EmptyState, Skeleton } from './ui/data';
import { CompanyChart } from './CompanyPage';
import CompanyProfileRadar, { COMPANY_PROFILE_AXES } from './CompanyProfileRadar';
import FollowCompanyButton from './FollowCompanyButton';
import NewsFeedItem from './NewsFeedItem';
import { fetchCompanyOverview } from '../utils/api';
import { chronologicalNews } from '../utils/newsroom';
import { storyToItem } from '../utils/storyToItem';
import { SCREENER_METRICS, screenerMetricText, screenerDetailColumns } from '../utils/screener';
import { COMPANY_PREVIEW_TTL, cacheCompanyPreview, matchingCompanyOverview } from '../utils/screenerCompany';
import reportStyles from './company-report.module.css';
import styles from './screener-company-drawer.module.css';

function CompanyPreview({ symbol, row, columns, cache }) {
  const [state, setState] = useState(() => {
    const saved = cache.get(symbol);
    return saved && Date.now() - saved.at < COMPANY_PREVIEW_TTL ? { data: saved.data } : {};
  });
  const [attempt, setAttempt] = useState(0);
  const [newsCount, setNewsCount] = useState(3);
  useEffect(() => {
    const saved = cache.get(symbol);
    if (!attempt && saved && Date.now() - saved.at < COMPANY_PREVIEW_TTL) return;
    const controller = new AbortController();
    setState({});
    fetchCompanyOverview(symbol, '', { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      if (!matchingCompanyOverview(data, symbol)) throw new Error('Mismatched company');
      cacheCompanyPreview(cache, symbol, data);
      setState({ data });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ error: error?.status === 404 ? 'Bolaget kunde inte hittas' : 'Bolagsvyn kunde inte hämtas' });
    });
    return () => controller.abort();
  }, [symbol, cache, attempt]);
  const data = state.data;
  const name = row?.name ?? data?.summary?.profile?.name ?? symbol;
  const news = chronologicalNews((data?.news ?? []).map(storyToItem));
  const metrics = screenerDetailColumns(columns);
  const profile = row?.profile;
  const missingAxes = COMPANY_PROFILE_AXES.filter(axis => !Number.isFinite(profile?.axes?.find(value => value.key === axis.key)?.score));

  return <Stack gap={8} className={cx(reportStyles.report, styles.preview)}>
    <Inline className={styles.identity}>
      <Text size="sm" tone="secondary">{[row?.nativeSymbol ?? symbol, row?.sector].filter(Boolean).join(' · ')}</Text>
      <FollowCompanyButton symbol={symbol} name={name} />
    </Inline>
    {state.error ? <EmptyState role="alert" title={state.error}
      action={<Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>Försök igen</Button>} />
      : !data ? <Stack gap={3} role="status" aria-label={`Hämtar bolagsvy för ${name}`}>
        <Skeleton className={styles.quotePlaceholder} />
        <Skeleton className={styles.chartPlaceholder} />
      </Stack> : <CompanyChart compact key={symbol} symbol={symbol} companyName={name}
        summary={data.summary} chart={data.chart} news={data.news} reports={data.reports} />}

    <Stack as="section" gap={3} aria-label="Bolagsnyheter">
      <Heading size="subsection">Senaste nytt</Heading>
      {!data && !state.error ? <Stack gap={2} aria-hidden="true"><Skeleton className={styles.newsPlaceholder} /><Skeleton className={styles.newsPlaceholder} /></Stack>
        : !data ? <Text size="sm" tone="secondary">Nyheterna kunde inte hämtas.</Text>
        : !news.length ? <Text size="sm" tone="secondary">Inga nyheter i det hämtade urvalet.</Text>
        : <Stack gap={2}>
          {news.slice(0, newsCount).map(item => <NewsFeedItem key={item.id} item={item} variant="brief" showSummary={false} />)}
          {news.length > newsCount && <Inline><Button variant="secondary" onClick={() => setNewsCount(value => value + 3)}>Visa fler nyheter</Button></Inline>}
        </Stack>}
    </Stack>

    {row && metrics.length > 0 && <Stack as="section" gap={3} aria-label="Nyckeltal i ditt urval">
      <Heading size="subsection">Nyckeltal i ditt urval</Heading>
      <dl className={styles.metrics}>
        {metrics.map(key => <div key={key}><dt>{SCREENER_METRICS[key].label}</dt><dd>{screenerMetricText(row, key)}</dd></div>)}
      </dl>
      {row.fundamentals?.periodEnd && <Text size="xs" tone="secondary">Helårsdata · {row.fundamentals.periodEnd}</Text>}
    </Stack>}

    <Stack as="section" gap={3} aria-label="Bolagsprofil">
      <Heading size="subsection">Bolagsprofil</Heading>
      <figure className={styles.profile}>
        <CompanyProfileRadar companyName={name} profile={profile ?? null} perimeterLabels showPoints={false} />
        <figcaption>
          {Number.isFinite(profile?.coveragePct) && <Text size="sm" tone="secondary">{Math.round(profile.coveragePct)} % underlag</Text>}
          {missingAxes.length > 0 && <Text size="xs" tone="secondary">Underlag saknas: {missingAxes.map(axis => axis.label).join(', ')}</Text>}
        </figcaption>
      </figure>
    </Stack>
    {data?.summary?.profile?.description && <details className={styles.about}>
      <summary>Om bolaget</summary><Text size="sm" tone="secondary">{data.summary.profile.description}</Text>
    </details>}
    <Inline><Button nativeButton={false} role="link" variant="secondary" render={<Link href={`/aktie/${encodeURIComponent(symbol)}`} />}>
      Hela bolagssidan <FiExternalLink aria-hidden="true" />
    </Button></Inline>
  </Stack>;
}

export default function ScreenerCompanyDrawer({ symbol, row, rows, columns, cache, onSelect, onClose, finalFocus, onClosed }) {
  // The intercepted reader is a sibling route, not a nested Dialog root. Let
  // it own focus/dismissal while retaining the drawer and its scroll underneath.
  const readerOpen = usePathname()?.startsWith('/nyhet/');
  // A lazily loaded Root must mount closed before opening; Base UI otherwise
  // treats its initial open state like static/SSR content and skips the entrance.
  const [initialized, setInitialized] = useState(false);
  useEffect(() => { setInitialized(true); }, []);
  const title = useRef(null);
  const body = useRef(null);
  const retainedCompany = useRef(null);
  useEffect(() => {
    if (symbol) retainedCompany.current = { symbol, row };
  }, [symbol, row]);
  // Keep the same content and reading position throughout the exit animation.
  const displayedSymbol = symbol ?? retainedCompany.current?.symbol;
  const displayedRow = symbol ? row : retainedCompany.current?.row;
  useEffect(() => { if (symbol && body.current) body.current.scrollTop = 0; }, [symbol]);
  const index = rows.findIndex(value => value.symbol === displayedSymbol);
  const previous = index > 0 ? rows[index - 1] : null;
  const next = index >= 0 ? rows[index + 1] : null;
  return <Dialog variant="drawer" open={initialized && Boolean(symbol)} modal={!readerOpen} disablePointerDismissal={readerOpen}
    onOpenChange={(open, details) => { if (!open) { if (readerOpen) details.cancel(); else onClose(); } }}
    onOpenChangeComplete={open => { if (!open) onClosed?.(); }}
    title={<span ref={title} tabIndex={-1} className={styles.title}>{displayedRow?.name ?? displayedSymbol ?? 'Bolagsvy'}</span>}
    initialFocus={() => {
      // Focusing an offscreen, translated heading must not scroll its viewport
      // to the right and cancel out the slide transform frame by frame.
      title.current?.focus({ preventScroll: true });
      return false;
    }} finalFocus={finalFocus} bodyRef={body}
    headerActions={<>
      <IconButton label="Föregående bolag" disabled={!previous} onClick={() => onSelect(previous.symbol)}><FiChevronLeft aria-hidden="true" /></IconButton>
      <Text size="xs" numeric tone="secondary" aria-live="polite">{index < 0 ? 'Utanför urvalet' : `${index + 1} / ${rows.length}`}</Text>
      <IconButton label="Nästa bolag" disabled={!next} onClick={() => onSelect(next.symbol)}><FiChevronRight aria-hidden="true" /></IconButton>
    </>}>
    {displayedSymbol && <CompanyPreview key={displayedSymbol} symbol={displayedSymbol} row={displayedRow} columns={columns} cache={cache} />}
  </Dialog>;
}
