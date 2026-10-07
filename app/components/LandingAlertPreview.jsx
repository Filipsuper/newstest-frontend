"use client";

import { useState } from 'react';
import { COMPANY_ALERT_LEVELS } from '../utils/companyAlerts';
import { Label } from './ui/Label';
import { Slider } from './ui/Slider';
import { Heading, Inline, Stack, Text } from './ui/layout';
import styles from './landing.module.css';

const explanations = {
  major: 'Bara de högst rankade nyheterna. För dig som vill bli avbruten mer sällan.',
  important: 'Viktiga besked, med ett bredare urval än bara de allra största.',
  relevant: 'Fler nyheter om dina bolag, även de som rankas lägre i betydelse.',
};
const examples = {
  major: 'Till exempel vinstvarningar och stora förvärv.',
  important: 'Till exempel rapporter, större order och finansiering.',
  relevant: 'Till exempel affärsnyheter och betydande insynsaffärer.',
};
const options = [...COMPANY_ALERT_LEVELS].reverse().map(option => ({
  ...option,
  label: { major: 'Bara viktigast', important: 'Viktiga', relevant: 'Fler relevanta' }[option.value],
  description: explanations[option.value],
  example: examples[option.value],
}));

/** An explicitly local demonstration, never an email opt-in or saved preference. */
export default function LandingAlertPreview() {
  const [level, setLevel] = useState('important');
  return <section aria-label="Förhandsvisning av mejlbevakning" className={styles.alertPreview}>
    <Inline className={styles.between}>
      <Label>Plus och Pro</Label>
    </Inline>
    <Stack gap={2}>
      <Heading as="h3" size="subsection">Mejl när något viktigt händer.</Heading>
      <Text size="sm" tone="secondary">Du väljer hur mycket som ska nå inkorgen.</Text>
    </Stack>
    <Slider label="Testa olika nyhetsnivåer" value={level} onValueChange={setLevel}
      options={options} helpPlacement="inline" />
    <Text size="xs" tone="secondary">
      Testa nivån här. Slå på mejlen i Mina bolag.
    </Text>
  </section>;
}
