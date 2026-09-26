"use client";

import { useState } from 'react';
import CompanyPage from '../../components/CompanyPage';
import { Container, Inline, Text } from '../../components/ui/layout';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import styles from '../../components/company-briefing.module.css';

export default function BriefingPreview({ data, briefing }) {
  const [view, setView] = useState('briefing');
  return <>
    <Container className={styles.previewBar}><Inline className={styles.previewControls}>
      <Text size="sm" tone="secondary">Lokal prototyp · verkligt underlag från 25 sep 2026 · inte live</Text>
      <SegmentedControl label="Jämför bolagsöverblick" value={view} onValueChange={setView} options={[
        { value: 'briefing', label: 'Lägesbild' }, { value: 'previous', label: 'Nuvarande vy' },
      ]} />
    </Inline></Container>
    <CompanyPage symbol="NANEXA.ST" initialData={data} initialRange="1w" briefing={view === 'briefing' ? briefing : null} />
  </>;
}
