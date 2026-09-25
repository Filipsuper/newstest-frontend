"use client";

import { useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { upcomingCompanyEvents, calendarEventLabel } from '../utils/companyResearchViews';
import { Button, IconButton } from './ui/Button';
import { EmptyState } from './ui/data';
import { Label } from './ui/Label';
import { Inline, Stack, Text } from './ui/layout';
import styles from './company-research-panels.module.css';

export default function CompanyCalendar({ calendar }) {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });
  const events = upcomingCompanyEvents(calendar, today);
  const [count, setCount] = useState(6);
  const [month, setMonth] = useState(() => `${today.slice(0, 7)}-01`);
  const visibleMonth = new Date(`${month}T12:00:00Z`);
  const moveMonth = amount => {
    const date = new Date(visibleMonth);
    date.setUTCMonth(date.getUTCMonth() + amount);
    setMonth(date.toISOString().slice(0, 10));
  };
  const monthLabel = visibleMonth.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const offset = (visibleMonth.getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth() + 1, 0)).getUTCDate();
  const days = Array.from({ length: Math.ceil((length + offset) / 7) * 7 }, (_, index) => {
    const date = new Date(visibleMonth); date.setUTCDate(1 - offset + index);
    return date.toISOString().slice(0, 10);
  });
  const nextReport = events.find(event => event.type === 'earnings');
  if (!events.length) return <EmptyState title="Inga kommande datum i underlaget" description="Rapporter, utdelningar och andra bolagshändelser visas här när datum finns." />;
  return <Stack className={styles.root} gap={4}>
    <ol className={styles.agenda} aria-label="Kommande bolagshändelser">{events.slice(0, count).map((event, index) => {
      const date = new Date(`${event.date}T12:00:00Z`);
      return <li className={styles.event} key={`${event.type}-${event.date}`}>
        <time dateTime={event.date} className={styles.eventDate} aria-label={date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}><span>{date.toLocaleDateString('sv-SE', { month: 'short', timeZone: 'UTC' })}</span><strong>{date.getUTCDate()}</strong><span>{date.getUTCFullYear()}</span></time>
        <Stack gap={2}><Inline gap={2}>{index === 0 && <Label>Nästa händelse</Label>}{event === nextReport && index !== 0 && <Label>Nästa rapport</Label>}</Inline><span className={styles.eventName}>{calendarEventLabel(event.type)}{event.fiscalPeriod ? ` · ${event.fiscalPeriod}` : ''}</span>{event.title && event.title !== calendarEventLabel(event.type) && <Text size="sm" tone="secondary">{event.title}</Text>}</Stack>
      </li>;
    })}</ol>
    {count < events.length && <Button variant="secondary" onClick={() => setCount(value => value + 6)}>Visa fler datum</Button>}
    <details className={styles.details}><summary>Visa månadskalender</summary>
      <div className={styles.month}>
        <Inline className={styles.toolbar}><IconButton label="Föregående månad" disabled={month <= `${today.slice(0, 7)}-01`} onClick={() => moveMonth(-1)}><FiChevronLeft /></IconButton><Text>{monthLabel}</Text><IconButton label="Nästa månad" onClick={() => moveMonth(1)}><FiChevronRight /></IconButton></Inline>
        <div className={styles.monthGrid} role="group" aria-label={monthLabel}>
          {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map(day => <span className={styles.weekday} key={day}>{day}</span>)}
          {days.map(day => <div key={day} className={styles.day} data-outside={day.slice(0, 7) !== month.slice(0, 7)} data-today={day === today}><time dateTime={day}>{Number(day.slice(8))}</time>{events.filter(event => event.date === day).map(event => <span key={event.type}>{calendarEventLabel(event.type)}</span>)}</div>)}
        </div>
      </div>
    </details>
  </Stack>;
}
