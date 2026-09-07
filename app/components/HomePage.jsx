import Link from "next/link";
import {
  FiFileText,
  FiTrendingUp,
  FiStar,
  FiArrowUpRight,
} from "react-icons/fi";
import { BRAND_LABEL, LANDING_HEADLINE } from "../utils/brand";
import { LandingActions, LetterSignup } from "./LandingActions";
import { Button } from "./ui/Button";
import { Label } from "./ui/Label";
import { Container, Heading, Inline, Stack, Text } from "./ui/layout";
import styles from "./landing.module.css";

const benefits = [
  {
    icon: FiFileText,
    title: "Lägg mindre tid på att leta.",
    text: "Få ett urval av börsnyheter med korta AI-sammanfattningar. Originalkällan finns nära när du vill läsa vidare.",
    href: "/marknaden",
    link: "Få dagens överblick",
  },
  {
    icon: FiTrendingUp,
    title: "Sätt kursrörelsen i sammanhang.",
    text: "Se nyheten och aktiens utveckling kring publiceringen tillsammans. Du får mer att utgå från än bara en röd eller grön siffra.",
    href: "/aktier",
    link: "Utforska bolagen",
  },
  {
    icon: FiStar,
    title: "Håll koll på det som berör dig.",
    text: "Följ bolag, ämnen och nyckelord. Bevakning samlar matchande nyheter och visar varför de är relevanta för dina val.",
    href: "/bevakning",
    link: "Gör nyhetsflödet till ditt",
  },
];

export default function HomePage({ newsPreview, letterPreview }) {
  return (
    <Container as="main" className={styles.page}>
      <header className={styles.hero}>
        <Stack gap={6}>
          <Stack gap={4}>
            <Inline>
              <Label tone="accent">Välkommen till {BRAND_LABEL}</Label>
            </Inline>
            <Heading as="h1" size="page" className={styles.title}>
              {LANDING_HEADLINE.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </Heading>
            <Text tone="secondary" className={styles.intro}>
              Vad har hänt på börsen? Hur har aktierna reagerat? Och vad berör
              dig? OMXsum samlar nyheterna, reaktionerna och din bevakning på
              ett ställe.
            </Text>
          </Stack>
          <LandingActions />
        </Stack>
        <section
          aria-labelledby="landing-preview-title"
          className={styles.preview}
        >
          <Inline className={styles.between} gap={3}>
            <Heading id="landing-preview-title" size="subsection">
              Senaste brevet
            </Heading>
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              role="link"
              render={<Link href="/nyhetsbrev" />}
            >
              Fler brev <span aria-hidden="true">→</span>
            </Button>
          </Inline>
          {letterPreview}
        </section>
      </header>

      <section
        aria-labelledby="landing-benefits-title"
        className={styles.section}
      >
        <Stack gap={3}>
          <Heading id="landing-benefits-title">
            Mer sammanhang. Mindre letande.
          </Heading>
          <Text tone="secondary">
            Från en snabb överblick till nyheterna om just dina bolag.
          </Text>
        </Stack>
        <div className={styles.benefits}>
          {benefits.map(({ icon: Icon, title, text, href, link }) => (
            <Stack key={href} gap={3} className={styles.benefit}>
              <Icon className={styles.benefitIcon} aria-hidden="true" />
              <Heading as="h3" size="subsection">
                {title}
              </Heading>
              <Text size="sm" tone="secondary">
                {text}
              </Text>
              <Link href={href} className={styles.textLink}>
                {link} <span aria-hidden="true">→</span>
              </Link>
            </Stack>
          ))}
        </div>
        <Text size="xs" tone="secondary">
          Bevaka upp till fem bolag med ett gratis konto. Kursreaktioner visar
          observerade förändringar, inte säkra orsakssamband.
        </Text>
      </section>

      <section aria-labelledby="landing-market-title" className={styles.market}>
        <Stack gap={4}>
          <Inline>
            <Label>Efter Morgonbrevet</Label>
          </Inline>
          <Heading id="landing-market-title">Fortsätt följa börsdagen.</Heading>
          <Text tone="secondary">
            Brevet ger dig starten. På Marknaden hittar du nyheterna som
            tillkommer, aktiernas reaktioner och källorna bakom rubrikerna.
            Öppna en nyhet när du vill förstå mer.
          </Text>
          <Inline>
            <Button
              variant="secondary"
              nativeButton={false}
              role="link"
              render={<Link href="/marknaden" />}
            >
              Öppna Marknaden <span aria-hidden="true">→</span>
            </Button>
          </Inline>
        </Stack>
        <section
          aria-labelledby="landing-news-title"
          className={styles.preview}
        >
          <Heading id="landing-news-title" size="subsection">
            Ur Marknaden
          </Heading>
          {newsPreview}
        </section>
      </section>

      <section aria-labelledby="landing-letter-title" className={styles.next}>
        <Stack gap={4}>
          <Heading id="landing-letter-title">
            En enklare start på börsdagen.
          </Heading>
          <Text tone="secondary">
            Morgonbrevet samlar börsnyheterna inför dagen. I din inkorg varje
            vardag kl. 08.00, helt gratis. Kvällsbrevet summerar dagen på
            sajten.
          </Text>
          <LetterSignup />
          <Link href="/nyhetsbrev" className={styles.textLink}>
            Läs tidigare brev <span aria-hidden="true">→</span>
          </Link>
          <Text size="sm" tone="secondary">
            Med Plus får Morgonbrevet också en personlig del när nyheter matchar
            dina bevakningar.
          </Text>
        </Stack>
        <Stack gap={3} className={styles.more}>
          <Text size="sm" tone="secondary">
            Marknadsöversikten, aktiesidorna och breven är öppna. Plus ger dig
            hela nyhetsflödet, screenern och fördjupad bolagsanalys.
          </Text>
          <Link href="/pro" className={styles.textLink}>
            Jämför medlemskap <span aria-hidden="true">→</span>
          </Link>
          <Link href="/aktier/screener" className={styles.textLink}>
            Jämför bolag i screenern <Label>Plus</Label>
          </Link>
          <Link href="/terminal" className={styles.textLink}>
            För den avancerade användaren: Terminal{" "}
            <FiArrowUpRight aria-hidden="true" />
          </Link>
          <Link href="/om-oss" className={styles.textLink}>
            Om OMXsum och vår nyhetsbevakning <span aria-hidden="true">→</span>
          </Link>
        </Stack>
      </section>
    </Container>
  );
}
