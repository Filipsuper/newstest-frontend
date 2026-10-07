import Link from 'next/link';
import { FiArrowUpRight, FiCheck } from 'react-icons/fi';
import TerminalPreview from './TerminalPreview';
import LandingAlertPreview from './LandingAlertPreview';
import LandingResearchPreview from './LandingResearchPreview';
import UpgradeLink from './UpgradeLink';
import { BRAND_LABEL, LANDING_HEADLINE } from '../utils/brand';
import { LandingActions, LetterSignup } from './LandingActions';
import { Button } from './ui/Button';
import { Label } from './ui/Label';
import { Container, Heading, Inline, Stack, Surface, Text } from './ui/layout';
import { companyLimit, membershipPlans } from '../utils/membership';
import { LANDING_TESTIMONIALS } from '../utils/landingTestimonials';
import styles from './landing.module.css';

const planFeatures = {
  free: ['Morgonbrevet och breven på sajten', 'Marknadens nyhetsurval och aktieöversikter', `${companyLimit('free')} följda bolag, ämnen och nyckelord`, 'Sex grundnyckeltal i screenern'],
  plus: [`Allt i Gratis, med ${companyLimit('plus')} följda bolag`, 'Hela nyhetsflödet och personlig brevdel', 'Mejlbevakning av valda bolag', 'Alla screenerfilter och fördjupad bolagsanalys'],
  pro: ['Allt i Plus', `Upp till ${companyLimit('premium')} följda bolag`, 'OMXsum Terminal', 'Flera grafer, nyheter och handelsdata i samma arbetsyta'],
};
const questions = [
  { question: 'Behöver jag vara en erfaren investerare?', answer: 'Nej. Börja med Morgonbrevet eller dagens nyheter i Marknaden. Följ ett par bolag och lär känna dem i din egen takt. Screenern och Terminal finns när du vill fördjupa dig.' },
  { question: 'Är Morgonbrevet samma sak som ett konto?', answer: 'Nej. Morgonbrevet är gratis och kräver inget konto. Med ett konto kan du också följa bolag, ämnen och nyckelord på sajten.' },
  { question: 'Får jag automatiskt mejl när jag följer ett bolag?', answer: 'Nej. Med Plus eller Pro väljer du själv om du vill slå på mejlbevakning. Ämnen och nyckelord matchar nyheter på sajten, men är inte separata mejllarm.' },
  { question: 'Vad betyder procenten vid en nyhet?', answer: 'Den visar aktiens observerade kursförändring under den angivna mätperioden. Det kan vara efter publiceringen eller under börsdagen. Siffran visar inte säkert vad som orsakade rörelsen.' },
  { question: 'Kan jag testa Plus eller Pro utan att betala?', answer: 'Ja, om du har ett bekräftat gratiskonto och inte redan har använt en provperiod eller har en betalprenumeration. Du får sju dagar utan kort och utan automatisk betalning.' },
  { question: 'Var kommer informationen ifrån?', answer: 'Bland annat bolagens pressmeddelanden, rapporter och insynshandel. Originalkällor finns i nyhetsläsaren och bolagsanalysen. AI-sammanfattningar hjälper dig att läsa; täckningen varierar mellan bolag och datatyper.' },
];
function TextLink({ href, children }) {
  return <Link href={href} className={styles.textLink}>{children}<span aria-hidden="true">→</span></Link>;
}
export default function HomePage({ newsPreview, letterPreview, screenerPreview }) {
  return <Container as="main" className={styles.page}>
    <header className={styles.hero}>
      <Stack gap={8} className={styles.heroCopy}>
        <Stack gap={6}>
          <Text size="sm" tone="secondary">Välkommen till {BRAND_LABEL}</Text>
          <Heading as="h1" size="page" className={styles.title}>{LANDING_HEADLINE.map(line => <span key={line}>{line}</span>)}</Heading>
          <Text tone="secondary" className={styles.intro}>Börsnyheterna, kursreaktionerna och bolagen du följer. Börja dagen med överblick. Läs vidare när något fångar ditt intresse.</Text>
        </Stack>
        <LandingActions />
      </Stack>
      <section aria-labelledby="landing-preview-title" className={styles.letterPreview}>
        <Inline className={styles.between}>
          <Heading id="landing-preview-title" size="subsection">Senaste brevet</Heading>
          <TextLink href="/nyhetsbrev">Fler brev</TextLink>
        </Inline>
        {letterPreview}
      </section>
    </header>

    <section aria-label="Så har läsare reagerat." className={styles.readerNotes}>
      <Text size="xs" tone="secondary">Läsare om Morgonbrevet · Reddit</Text>
      <div className={styles.testimonials}>{LANDING_TESTIMONIALS.map(quote => <figure key={quote.url} className={styles.testimonial}>
        <blockquote><Text size="sm">“{quote.text}”</Text></blockquote>
        <figcaption><a href={quote.url} target="_blank" rel="noopener noreferrer" className={styles.quoteSource}
          aria-label={`Läs ${quote.name}s kommentar på Reddit (öppnas i ny flik)`}>{quote.name}<FiArrowUpRight aria-hidden="true" /></a></figcaption>
      </figure>)}</div>
    </section>

    <section aria-labelledby="landing-market-title" className={styles.section}>
      <Stack gap={4} className={styles.centered}>
        <Text size="sm" tone="secondary">Nyheten först. Reaktionen bredvid.</Text>
        <Heading id="landing-market-title" className={styles.sectionTitle}>Fortsätt följa börsdagen.</Heading>
        <Text tone="secondary">Se vad som har hänt, läs en kort sammanfattning och följ aktiens reaktion. Allt i samma vy.</Text>
      </Stack>
      <section aria-label="Ur Marknaden" className={styles.newsPreview}>{newsPreview}</section>
      <Inline className={styles.centeredActions} gap={6}>
        <Button nativeButton={false} role="link" render={<Link href="/marknaden" />}>Öppna Marknaden <span aria-hidden="true">→</span></Button>
        <TextLink href="/marknaden/nyheter">Se hela nyhetsflödet</TextLink>
      </Inline>
    </section>

    <section aria-labelledby="landing-personal-title" className={`${styles.feature} ${styles.personal}`}>
      <Stack gap={4} className={styles.featureCopy}>
        <Text size="sm" tone="secondary">Mina bolag</Text>
        <Heading id="landing-personal-title" className={styles.sectionTitle}>Det viktiga i dina bolag. På ett ställe.</Heading>
        <Text tone="secondary">Följ bolag, ämnen och nyckelord. Få en personlig överblick med kursgrafer och nyheterna som berör dig.</Text>
        <TextLink href="/marknaden/bevakning">Öppna Mina bolag</TextLink>
        <Text size="xs" tone="secondary">Följ upp till {companyLimit('free')} bolag med ett gratis konto.</Text>
      </Stack>
      <LandingAlertPreview />
    </section>

    <section aria-labelledby="landing-research-title" className={`${styles.feature} ${styles.research}`}>
      <Stack gap={4} className={styles.featureCopy}>
        <Text size="sm" tone="secondary">Bolagsanalys</Text>
        <Heading id="landing-research-title" className={styles.sectionTitle}>Lär känna bolaget bakom aktien.</Heading>
        <Text tone="secondary">Hur går verksamheten? Följ omsättning, resultat och kassaflöde över tid. Läs VD-ord i korthet och öppna rapporten när du vill veta mer.</Text>
        <TextLink href="/aktier">Hitta ett bolag att utforska</TextLink>
        <Text size="xs" tone="secondary">Fördjupad analys i Plus. Underlaget varierar mellan bolag.</Text>
      </Stack>
      <LandingResearchPreview />
    </section>

    <section aria-labelledby="landing-screener-title" className={styles.feature}>
      <Stack gap={4} className={styles.featureCopy}>
        <Text size="sm" tone="secondary">Screener</Text>
        <Heading id="landing-screener-title" className={styles.sectionTitle}>Hitta nästa bolag att läsa på om.</Heading>
        <Text tone="secondary">Leta efter lönsamhet, tillväxt eller insynsköp. Jämför bolagen som matchar och öppna dem direkt, utan att tappa ditt urval.</Text>
        <TextLink href="/aktier/screener">Utforska screenern</TextLink>
        <Text size="xs" tone="secondary">Sex grundnyckeltal gratis. Alla filter i Plus och Pro.</Text>
      </Stack>
      {screenerPreview}
    </section>

    <section aria-labelledby="landing-terminal-title" className={styles.section}>
      <div className={styles.sectionHeader}>
        <Stack gap={4}>
          <Inline><Label>Terminal · Pro</Label></Inline>
          <Heading id="landing-terminal-title" className={styles.sectionTitle}>En egen arbetsyta för dig som vill gå längre.</Heading>
        </Stack>
        <Stack gap={3}>
          <Text tone="secondary">Flera bolagsgrafer, nyheter och handelsdata sida vid sida. Terminal ingår i Pro; den vanliga sajtens bolagsanalys finns redan i Plus.</Text>
          <TextLink href="/terminal">Upptäck Terminal</TextLink>
        </Stack>
      </div>
      <TerminalPreview />
    </section>

    <section aria-labelledby="landing-plans-title" className={styles.section}>
      <Stack gap={4} className={styles.centered}>
        <Heading id="landing-plans-title" className={styles.sectionTitle}>Börja gratis. Fördjupa dig när du vill.</Heading>
        <Text tone="secondary">Testa Plus eller Pro i 7 dagar, utan kort och utan automatisk betalning.</Text>
      </Stack>
      <div className={styles.plans}>{membershipPlans.map(plan => <Surface as="section" key={plan.id} aria-label={`${plan.name} medlemskap`} className={`${styles.plan} ${plan.id === 'plus' ? styles.plus : ''}`}>
        <Stack gap={3}>
          <Inline className={styles.between}>
            <Heading as="h3" size="subsection">{plan.name}</Heading>
            {plan.id === 'plus' && <Label tone="accent">Nyheter och analys</Label>}
          </Inline>
          <Text numeric className={styles.planPrice}>{plan.price} kr<Text as="span" size="sm" tone="secondary"> / mån</Text></Text>
        </Stack>
        <ul className={styles.featureList}>{planFeatures[plan.id].map(feature => <li key={feature}><FiCheck aria-hidden="true" /><Text size="sm">{feature}</Text></li>)}</ul>
        <div className={styles.planAction}>{plan.id === 'free'
          ? <Button variant="secondary" nativeButton={false} role="link" render={<Link href="/kom-igang" />}>Skapa gratis konto</Button>
          : <UpgradeLink tier={plan.id} variant={plan.id === 'plus' ? 'primary' : 'secondary'} fallback={`Se ${plan.name}`} />}</div>
      </Surface>)}</div>
      <Inline className={styles.centeredActions}><TextLink href="/pro">Jämför allt som ingår</TextLink></Inline>
    </section>

    <section aria-labelledby="landing-faq-title" className={`${styles.section} ${styles.faq}`}>
      <Heading id="landing-faq-title" className={`${styles.sectionTitle} ${styles.centered}`}>Bra att veta innan du börjar.</Heading>
      <div className={styles.questions}>{questions.map(({ question, answer }) => <details key={question} className={styles.question}>
        <summary>{question}</summary><Text size="sm" tone="secondary">{answer}</Text>
      </details>)}</div>
    </section>

    <section aria-labelledby="landing-letter-title" className={styles.next}>
      <Stack gap={6} className={styles.centered}>
        <Heading id="landing-letter-title" className={styles.sectionTitle}>En enklare start på börsdagen.</Heading>
        <Text tone="secondary">Morgonbrevet i inkorgen varje vardag kl. 08.00. Gratis.</Text>
        <LetterSignup />
        <TextLink href="/nyhetsbrev">Läs tidigare brev</TextLink>
      </Stack>
    </section>
  </Container>;
}
