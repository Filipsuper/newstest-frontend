import Image from "next/image";
import terminalPreview from "../../public/images/terminal-showcase-2026-09-07.png";
import { FiArrowUpRight } from "react-icons/fi";
import { Button } from "./ui/Button";
import { Heading, Inline, Stack, Text } from "./ui/layout";
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
        <Inline className={styles.previewHeader}>
          <Heading id="terminal-preview" size="subsection">
            En titt in i Terminal
          </Heading>
          <Button
            variant="ghost"
            nativeButton={false}
            role="link"
            render={
              <a
                href={terminalPreview.src}
                target="_blank"
                rel="noreferrer"
              />
            }
            aria-label="Visa större bild av Terminal (öppnas i ny flik)"
          >
            Visa större bild <FiArrowUpRight aria-hidden="true" />
          </Button>
        </Inline>
        <figure className={styles.preview}>
          <Image
            src={terminalPreview}
            alt="Terminal med flera bolagsgrafer, ett bolagskopplat nyhetsflöde och en lista över aktier med stora kursrörelser."
            sizes="(max-width: 600px) calc(100vw - 32px), (max-width: 1344px) calc(100vw - 64px), 1280px"
            quality={90}
            className={styles.screenshot}
          />
          <Text as="figcaption" size="xs" tone="secondary">
            Skärmbild från Terminal. Visar inte aktuella kurser.
          </Text>
        </figure>
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
