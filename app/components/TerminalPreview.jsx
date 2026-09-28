import Image from 'next/image';
import { FiArrowUpRight } from 'react-icons/fi';
import trading from '../../public/images/terminal-trading-2026-09-28.png';
import financials from '../../public/images/terminal-financials-2026-09-28.png';
import { Tabs, TabList, Tab, TabPanel } from './ui/Tabs';
import { Button } from './ui/Button';
import { Inline, Text } from './ui/layout';
import styles from './terminal-preview.module.css';

const views = [
  { id: 'trading', label: 'Trading', image: trading,
    alt: 'Terminalens tradingvy med bevakningslista, Cibus kursgraf, bolagsnyheter, screener och avslutsflöde.' },
  { id: 'financials', label: 'Bolagsanalys', image: financials,
    alt: 'Terminalens analysvy med CombinedX finansiella grafer, bolagsöversikt, kursgraf, nyheter och bevakningslista.' },
];

export default function TerminalPreview({ compact = false }) {
  return <Tabs defaultValue="trading" className={styles.preview}>
    <TabList label="Förhandsvisning av Terminal">
      {views.map(view => <Tab key={view.id} value={view.id}>{view.label}</Tab>)}
    </TabList>
    {views.map(view => <TabPanel key={view.id} value={view.id} className={styles.panel}>
      <figure className={styles.figure}>
        <Image src={view.image} alt={view.alt} quality={90} className={styles.image}
          sizes={compact
            ? '(max-width: 760px) calc(100vw - 32px), (max-width: 1344px) 45vw, 608px'
            : '(max-width: 600px) calc(100vw - 32px), (max-width: 1344px) calc(100vw - 64px), 1280px'} />
        <Inline as="figcaption" className={styles.caption}>
          <Text as="span" size="xs" tone="secondary">Skärmbild 28 sep. 2026. Visar inte aktuella kurser.</Text>
          <Button variant="ghost" nativeButton={false} role="link"
            render={<a href={view.image.src} target="_blank" rel="noreferrer" />}
            aria-label="Visa större bild av Terminal (öppnas i ny flik)">
            Visa större bild <FiArrowUpRight aria-hidden="true" />
          </Button>
        </Inline>
      </figure>
    </TabPanel>)}
  </Tabs>;
}
