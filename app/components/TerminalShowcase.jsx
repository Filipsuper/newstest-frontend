import TerminalPreview from './TerminalPreview';
import { Heading, Stack, Text } from "./ui/layout";
import styles from "./terminal-gateway.module.css";

const features = [
  [
    "Nyheter med bolagskoppling",
    "Filtrera nyhetsflödet och följ rapporter, order och andra händelser tillsammans med bolagets kursgraf.",
  ],
  [
    "Rörelse och relativ volym",
    "Använd movers och intradagsscreener för att hitta ovanlig handelsaktivitet och aktier med nyheter.",
  ],
  [
    "Bolagsanalys utan sidbyte",
    "Öppna finansiell historik, estimat och rapportkalender i samma arbetsyta som dina grafer.",
  ],
];

export default function TerminalShowcase() {
  return (
    <section aria-labelledby="terminal-preview">
      <Stack gap={4}>
          <Heading id="terminal-preview" size="subsection">
            En titt in i Terminal
          </Heading>
        <TerminalPreview />
        <div className={styles.features}>
          {features.map(([title, text]) => (
            <Stack as="section" gap={3} key={title}>
              <Heading as="h3" size="subsection">
                {title}
              </Heading>
              <Text size="sm" tone="secondary">
                {text}
              </Text>
            </Stack>
          ))}
        </div>
      </Stack>
    </section>
  );
}
