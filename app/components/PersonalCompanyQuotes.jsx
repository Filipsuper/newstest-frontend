"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { getCompanies } from '../utils/companies';
import { fetchPersonalQuoteSnapshot, mergePersonalQuoteSnapshot, personalCompanySparkGeometry,
  personalQuotePage, personalQuoteSymbols, PERSONAL_QUOTE_REFRESH_MS } from '../utils/personalCompanyQuotes';
import { Button, IconButton } from './ui/Button';
import { ChangeBadge, DataList, Skeleton } from './ui/data';
import { changeTone } from './ui/format';
import { Inline, Stack, Surface, Text } from './ui/layout';
import styles from './personal-company-quotes.module.css';

function CompanyQuote({ symbol, company, snapshot, busy, paused }) {
  const quote = snapshot?.quote;
  const history = snapshot?.history;
  const geometry = personalCompanySparkGeometry(history?.points);
  const loading = !snapshot && busy;
  const price = quote ? `${quote.price.toLocaleString('sv-SE', {
    minimumFractionDigits: 2, maximumFractionDigits: quote.price < 1 ? 4 : 2,
  })}${quote.currency ? ` ${quote.currency === 'SEK' ? 'kr' : quote.currency}` : ''}` : null;
  const name = company?.name || symbol;
  // The badge and curve share the daily reference. First-to-last intraday
  // movement can have the opposite sign after an opening gap.
  const curveTone = changeTone(quote?.change);
  const curveColor = curveTone === 'positive' ? 'var(--ui-positive)'
    : curveTone === 'negative' ? 'var(--ui-negative)' : 'var(--ui-text-secondary)';
  return <Surface as="li" tone="inset" className={styles.card} aria-label={name} aria-busy={loading || undefined} data-nosnippet="">
    <Link href={`/aktie/${encodeURIComponent(symbol)}`} prefetch={false} className={styles.cardLink} aria-label={name}>
    <div className={styles.identity}>
      <div className={styles.companyDetails}>
        <Text as="span" size="sm" className={styles.company}>{name}</Text>
        {loading ? <Skeleton className={styles.priceSkeleton} /> : <Text as="span" size="xs" tone="secondary" numeric>
          {price || (snapshot?.quoteStatus === 'unavailable' ? 'Kursen kunde inte hämtas' : !snapshot && paused ? 'Kurser pausade' : 'Kurs saknas')}
        </Text>}
      </div>
      {quote && <ChangeBadge className={styles.change} value={quote.change} label={`Dagsförändring, ${quote.period}`} />}
    </div>
    <div className={styles.values}>
      {geometry ?
        <svg viewBox="2 0 68 24" preserveAspectRatio="none" className={styles.curve} role="img" aria-label={`${name}, ${history.period.toLowerCase()}`}>
          {geometry.dot ? <circle cx={geometry.dot.x} cy={geometry.dot.y} r="2" fill={curveColor} />
            : <path d={geometry.path} fill="none" stroke={curveColor} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
        : loading || snapshot?.historyStatus === 'loading' ? <Text as="span" size="xs" tone="secondary">{paused ? 'Kurvan är pausad' : 'Hämtar kurva…'}</Text>
        : <Text as="span" size="xs" tone="secondary">{snapshot?.historyStatus === 'unavailable' ? 'Kurvan kunde inte hämtas' : 'Kurvhistorik saknas'}</Text>}
    </div>
    </Link>
    {(snapshot?.quoteRetained || snapshot?.historyRetained) && <Text as="span" size="xs" tone="secondary">Uppdateringen misslyckades · visar tidigare data</Text>}
  </Surface>;
}

export default function PersonalCompanyQuotes({ watchlist = [], paused = false, accountKey = '' }) {
  const symbolsKey = JSON.stringify(personalQuoteSymbols(watchlist));
  const accountScope = JSON.stringify([accountKey, symbolsKey]);
  const symbols = useMemo(() => JSON.parse(symbolsKey), [symbolsKey]);
  const [pageState, setPage] = useState({ scope: accountScope, index: 0 });
  const page = personalQuotePage(symbols, pageState.scope === accountScope ? pageState.index : 0);
  const visibleKey = JSON.stringify(page.symbols);
  const scope = JSON.stringify([accountScope, visibleKey]);
  const [companies, setCompanies] = useState([]);
  const [data, setData] = useState({ scope, rows: {} });
  const [pendingScope, setPendingScope] = useState(null);
  const [retry, setRetry] = useState(0);
  const retryCount = useRef(0);
  const activeScope = useRef(scope);
  activeScope.current = scope;
  const snapshots = data.scope === scope ? data.rows : {};
  const busy = pendingScope === scope;

  useEffect(() => {
    if (!symbols.length || paused) return undefined;
    let active = true, requested = false;
    function loadIdentity() {
      if (requested || document.visibilityState === 'hidden') return;
      requested = true;
      getCompanies().then(rows => { if (active) setCompanies(rows); });
    }
    loadIdentity();
    document.addEventListener('visibilitychange', loadIdentity);
    return () => { active = false; document.removeEventListener('visibilitychange', loadIdentity); };
  }, [Boolean(symbols.length), paused]);

  useEffect(() => {
    if (!page.symbols.length || paused) {
      setPendingScope(previous => previous === scope ? null : previous);
      return undefined;
    }
    let active = true, controller = null, running = false;
    const visible = JSON.parse(visibleKey);
    function update(symbol, snapshot) {
      if (!active || controller?.signal.aborted || activeScope.current !== scope) return;
      setData(previous => {
        const rows = previous.scope === scope ? previous.rows : {};
        return { scope, rows: { ...rows, [symbol]: mergePersonalQuoteSnapshot(rows[symbol], snapshot) } };
      });
    }
    async function refresh() {
      if (!active || running || document.visibilityState === 'hidden') return;
      running = true;
      controller = new AbortController();
      const request = controller;
      const force = retryCount.current !== retry;
      retryCount.current = retry;
      setPendingScope(scope);
      try {
        await Promise.allSettled(visible.map(async symbol => {
          const snapshot = await fetchPersonalQuoteSnapshot(symbol, { signal: request.signal, force,
            onPartial: partial => update(symbol, partial) });
          update(symbol, snapshot);
        }));
      } finally {
        running = false;
        if (active && activeScope.current === scope) setPendingScope(null);
      }
    }
    function visibilityChanged() {
      if (document.visibilityState === 'hidden') controller?.abort();
      else void refresh();
    }
    void refresh();
    const timer = setInterval(refresh, PERSONAL_QUOTE_REFRESH_MS);
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => { active = false; controller?.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', visibilityChanged); };
  }, [scope, visibleKey, paused, retry]);

  if (!symbols.length) return null;
  const companyBySymbol = new Map(companies.map(company => [company.symbol, company]));
  const hasFailure = Object.values(snapshots).some(snapshot => snapshot.quoteStatus === 'unavailable' || snapshot.historyStatus === 'unavailable');
  return <Stack as="section" gap={3} className={styles.strip} aria-label="Dina bolagskurser">
    <DataList label="Följda bolag med kurser" className={styles.grid}>
      {page.symbols.map(symbol => <CompanyQuote key={symbol} symbol={symbol} company={companyBySymbol.get(symbol)} snapshot={snapshots[symbol]} busy={!paused && (busy || !snapshots[symbol])} paused={paused} />)}
    </DataList>
    {(page.total > 4 || hasFailure) && <Inline className={styles.footer}>
      {page.total > 4 && <>
        <Text as="span" size="xs" tone="secondary" role="status">Bolag {page.start + 1}–{page.start + page.symbols.length} av {page.total}</Text>
        <Inline gap={1}>
          <IconButton label="Föregående bolag" disabled={page.page === 0} onClick={() => setPage({ scope: accountScope, index: page.page - 1 })}><FiChevronLeft /></IconButton>
          <IconButton label="Nästa bolag" disabled={page.page === page.lastPage} onClick={() => setPage({ scope: accountScope, index: page.page + 1 })}><FiChevronRight /></IconButton>
        </Inline>
      </>}
      {hasFailure && <Button variant="ghost" disabled={paused} loading={busy} onClick={() => setRetry(value => value + 1)}>Försök igen med kurserna</Button>}
    </Inline>}
  </Stack>;
}
