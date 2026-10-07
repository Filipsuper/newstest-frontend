import { useId } from 'react';
import { Heading, Stack, Text, cx } from './layout';
import { Label } from './Label';
import styles from './preview-gate.module.css';

/** A visible, explicitly public sample. Never pass private/paid content here. */
export function PreviewGate({ children, title, description, label, action, note, fade = true, className }) {
  const id = useId();
  return <section className={cx(styles.gate, className)} aria-labelledby={id}>
    <div className={cx(styles.sample, fade && styles.fade)}>{children}</div>
    <Stack gap={3} className={styles.offer}>
      <Label tone="accent">{label}</Label>
      <Heading as="h3" size="subsection" id={id}>{title}</Heading>
      <Text size="sm" tone="secondary" className={styles.description}>{description}</Text>
      {action}
      {note && <Text size="xs" tone="secondary">{note}</Text>}
    </Stack>
  </section>;
}
