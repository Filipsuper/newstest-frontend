import Link from "next/link";
import TerminalPreview from './TerminalPreview';
import {
  FiFileText,
  FiTrendingUp,
  FiStar,
  FiArrowUpRight,
  FiBarChart2,
  FiSliders,
} from "react-icons/fi";
import { BRAND_LABEL, LANDING_HEADLINE } from "../utils/brand";
import { LandingActions, LetterSignup } from "./LandingActions";
import { Button } from "./ui/Button";
import { Label } from "./ui/Label";
import { Container, Heading, Inline, Stack, Surface, Text } from "./ui/layout";
import { companyLimit } from '../utils/membership';
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
    text: "Samla nyheterna om dina bolag, ämnen och nyckelord. Se viktiga händelser du missat och läs ikapp bolag för bolag.",
    href: "/marknaden/bevakning",
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
              dig? Följ nyheterna om dina bolag och förstå hur företagen
              utvecklas — med sammanfattningar, grafer och källor på ett ställe.
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
            Börja med vad som hänt. Förstå reaktionen. Följ bolaget vidare.
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
          Följ upp till {companyLimit('free')} bolag med ett gratis konto. Kursreaktioner visar
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

      <section aria-labelledby="landing-research-title" className={styles.market}>
        <Stack gap={4}>
          <Inline><Label>Bolagsanalys · Plus</Label></Inline>
          <Heading id="landing-research-title">Lär känna bolaget bakom aktien.</Heading>
          <Text tone="secondary">
            Rubriken berättar vad som hänt. Aktieöversikten hjälper dig att
            förstå verksamheten. Se hur försäljning, resultat och kassaflöde
            utvecklas utan att börja i ett kalkylblad.
          </Text>
          <Text tone="secondary">
            Läs ett kort AI-sammandrag av VD-ordet, följ ledningens kommentarer
            och gå vidare till rapporten när du vill veta mer.
          </Text>
          <Link href="/aktier" className={styles.textLink}>
            Hitta ett bolag att utforska <span aria-hidden="true">→</span>
          </Link>
        </Stack>
        <Surface className={styles.research}>
          {[
            [FiBarChart2, 'Hur går verksamheten?', 'Omsättning, lönsamhet, kassaflöde och nettoskuld i tydliga grafer.'],
            [FiFileText, 'Vad säger ledningen?', 'VD-ord i korthet, med rapportperiod och originaltext nära till hands.'],
            [FiTrendingUp, 'Vad ligger framför bolaget?', 'Estimat och värdering, med prognoser tydligt skilda från rapporterade resultat.'],
          ].map(([Icon, title, text]) => <div key={title} className={styles.researchRow}>
            <Icon className={styles.benefitIcon} aria-hidden="true" />
            <Stack gap={2}>
              <Heading as="h3" size="subsection">{title}</Heading>
              <Text size="sm" tone="secondary">{text}</Text>
            </Stack>
          </div>)}
          <Text size="xs" tone="secondary">
            Även insyn, ägare, blankning och rapportkalender. Underlaget varierar
            mellan bolag och marknader; uppgifter visas när data finns.
          </Text>
        </Surface>
      </section>

      <section aria-labelledby="landing-screener-title" className={styles.market}>
        <Stack gap={4}>
          <Inline><FiSliders aria-hidden="true" /><Label>Bolagsscreener · Plus</Label></Inline>
          <Heading id="landing-screener-title">Hitta nästa bolag att läsa på om.</Heading>
        </Stack>
        <Stack gap={4}>
            <Text tone="secondary">
              Filtrera och jämför bolag efter de mått som intresserar dig.
              Gå från ett urval i screenern till bolagets nyheter och finansiella
              utveckling — och följ det när du vill hålla koll framåt.
            </Text>
            <Link href="/aktier/screener" className={styles.textLink}>
              Utforska screenern <span aria-hidden="true">→</span>
            </Link>
        </Stack>
      </section>

      <section aria-labelledby="landing-terminal-title" className={styles.market}>
        <Stack gap={4}>
            <Inline><Label tone="accent">Terminal · Pro</Label></Inline>
            <Heading id="landing-terminal-title">En egen arbetsyta för dig som vill gå längre.</Heading>
            <Text tone="secondary">
              För den avancerade användaren: flera bolagsgrafer, ett
              bolagskopplat nyhetsflöde, movers och relativ volym sida vid sida.
              Terminal ingår i Pro. All analys på vanliga sajten ingår redan i Plus.
            </Text>
            <Link href="/terminal" className={styles.textLink}>
              Upptäck Terminal <FiArrowUpRight aria-hidden="true" />
            </Link>
        </Stack>
        <TerminalPreview compact />
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
            Börja gratis med {companyLimit('free')} följda bolag. Plus ger dig
            hela nyhetsflödet, personlig brevdel, screener och bolagsanalys med
            upp till {companyLimit('plus')} följda bolag. Pro lägger till Terminal
            och upp till {companyLimit('premium')} bolag.
          </Text>
          <Link href="/pro" className={styles.textLink}>
            Jämför medlemskap <span aria-hidden="true">→</span>
          </Link>
          <Link href="/om-oss" className={styles.textLink}>
            Om OMXsum och vår nyhetsbevakning <span aria-hidden="true">→</span>
          </Link>
        </Stack>
      </section>
    </Container>
  );
}
