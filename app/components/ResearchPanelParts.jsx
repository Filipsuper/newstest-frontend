"use client";

import { useEffect, useState } from 'react';
import { Button } from './ui/Button';
import { EmptyState, Skeleton } from './ui/data';
import styles from './company-research-panels.module.css';

export function useResearchRequest(symbol, fetcher) {
  const [request, setRequest] = useState({ symbol: null, data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setRequest({ symbol, data: null, error: null });
    fetcher(symbol, { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      if (!data || data.symbol !== symbol) throw new Error('Bolagsunderlaget kunde inte verifieras.');
      setRequest({ symbol, data, error: null });
    }).catch(cause => {
      if (!controller.signal.aborted) setRequest({ symbol, data: null, error: /timeout/i.test(cause.name) ? 'Hämtningen tog för lång tid.' : cause.message });
    });
    return () => controller.abort();
  }, [symbol, fetcher, attempt]);
  return { data: request.symbol === symbol ? request.data : null, error: request.symbol === symbol ? request.error : null, retry: () => setAttempt(value => value + 1) };
}

export function ResearchState({ title, request }) {
  if (request.error) return <EmptyState title={`${title} kunde inte hämtas`} description={request.error} action={<Button variant="secondary" onClick={request.retry}>Försök igen</Button>} />;
  return <div role="status" aria-label={`Hämtar ${title.toLowerCase()}`} className={styles.loading}><Skeleton /><Skeleton /><Skeleton /></div>;
}

export function ResearchStats({ items }) {
  return <dl className={styles.stats}>{items.map(item => <div key={item.label}><dt>{item.label}</dt><dd className={item.tone ? styles[item.tone] : undefined}>{item.value}</dd></div>)}</dl>;
}

export function ResearchBars({ rows, label, max = 100 }) {
  return <ul className={styles.bars} aria-label={label}>{rows.map((row, index) => <li key={`${row.label}-${index}`}>
    <div className={styles.barLabel}><span>{row.label}</span><strong>{row.valueLabel}</strong></div>
    {Number.isFinite(row.value) && row.value >= 0 && max > 0 && <div className={styles.track} data-tone={row.tone} aria-hidden="true"><span style={{ '--bar-width': `${Math.min(100, row.value / max * 100)}%` }} /></div>}
    {row.detail && <span className={styles.legend}>{row.detail}</span>}
  </li>)}</ul>;
}

// Two lines keep every fiscal period readable on narrow financial charts.
// E stays attached to the quarter; year remains explicit, never omitted to fit.
export function FiscalPeriodTick({ x, y, payload }) {
  const label = String(payload?.value ?? '');
  const quarter = /^Q([1-4]) (\d{4})(E?)$/.exec(label);
  return <g transform={`translate(${x},${y})`}><text textAnchor="middle" fill="var(--ui-text-secondary)" fontFamily="var(--ui-font)" fontSize={12}>
    {quarter ? <><tspan x="0" dy="12">Q{quarter[1]}{quarter[3]}</tspan><tspan x="0" dy="14">{quarter[2]}</tspan></> : <tspan x="0" dy="12">{label}</tspan>}
  </text></g>;
}
