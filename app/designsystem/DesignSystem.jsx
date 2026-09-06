"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FiArrowLeft,
  FiArrowRight,
  FiArrowUpRight,
  FiBell,
  FiCheck,
  FiChevronDown,
  FiCopy,
  FiGrid,
  FiInfo,
  FiLayers,
  FiMoon,
  FiMoreHorizontal,
  FiPlus,
  FiSearch,
  FiSliders,
  FiSun,
  FiType,
  FiX,
} from "react-icons/fi";
import { useTheme } from "../providers/ThemeProvider";
import {
  Button,
  Checkbox,
  IconButton,
  SegmentedControl,
  Select,
  Switch,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  TextField,
} from "../components/ui/controls";
import {
  Badge,
  ChangeBadge,
  DataList,
  EmptyState,
  ListRow,
  Skeleton,
} from "../components/ui/data";
import {
  Container,
  Heading,
  Inline,
  Stack,
  Text,
  cx,
} from "../components/ui/layout";
import { Dialog, DialogClose, Menu, Tooltip } from "../components/ui/overlays";
import NewsRow from "../components/ui/NewsRow";
import ui from "../components/ui/ui.module.css";
import styles from "./design-system.module.css";

const EXAMPLE_STORIES = [
  {
    id: "atlas",
    company: "Atlas Copco",
    ticker: "ATCO A",
    title: "Orderingången över förväntan i kvartalets rapport",
    tag: "Rapport",
    change: 2.4,
    time: "09:42",
    followed: true,
  },
  {
    id: "volvo",
    company: "Volvo",
    ticker: "VOLV B",
    title: "Ny stororder på elektriska lastbilar",
    tag: "Order",
    change: 1.8,
    time: "09:28",
    followed: true,
  },
  {
    id: "ericsson",
    company: "Ericsson",
    ticker: "ERIC B",
    title: "Marginalen i fokus efter morgonens rapport",
    tag: "Rapport",
    change: -1.2,
    time: "09:14",
    followed: false,
  },
];
const MARKET_OPTIONS = [
  { value: "se", label: "Sverige" },
  { value: "nordic", label: "Norden" },
  { value: "us", label: "USA" },
];

function Section({ id, number, title, description, children }) {
  return (
    <section id={id} className={styles.section}>
      <div className={styles.sectionHeading}>
        <Text size="xs" tone="secondary">
          {number}
        </Text>
        <Heading>{title}</Heading>
        {description && (
          <Text size="sm" tone="secondary">
            {description}
          </Text>
        )}
      </div>
      <div className={styles.sectionContent}>{children}</div>
    </section>
  );
}

function Example({ title, name, children }) {
  return (
    <div className={styles.example}>
      <div className={styles.exampleHeading}>
        <Text as="h3" size="sm">
          {title}
        </Text>
        <code>{name}</code>
      </div>
      {children}
    </div>
  );
}

function NewsPreview() {
  const [view, setView] = useState("all");
  const [query, setQuery] = useState("");
  const [story, setStory] = useState(null);
  const [following, setFollowing] = useState(
    () =>
      new Set(
        EXAMPLE_STORIES.filter((item) => item.followed).map((item) => item.id),
      ),
  );
  const visible = EXAMPLE_STORIES.filter(
    (item) =>
      (view === "all" || following.has(item.id)) &&
      `${item.company} ${item.title}`
        .toLocaleLowerCase("sv-SE")
        .includes(query.toLocaleLowerCase("sv-SE")),
  );
  return (
    <div className={styles.productPreview}>
      <div className={styles.previewHeader}>
        <div>
          <Text size="xs" tone="secondary">
            Marknaden / Idag
          </Text>
          <Heading size="section">Det som driver dagen</Heading>
        </div>
        <Badge>Exempeldata</Badge>
      </div>
      <div className={styles.previewControls}>
        <SegmentedControl
          label="Exempelflöde"
          options={[
            { value: "all", label: "Alla nyheter" },
            { value: "mine", label: "För dig" },
          ]}
          value={view}
          onValueChange={setView}
        />
        <TextField
          label="Sök i exempelflödet"
          hideLabel
          placeholder="Sök bolag eller nyhet"
          value={query}
          onValueChange={setQuery}
          leading={<FiSearch />}
          trailing={
            query && (
              <IconButton
                label="Rensa exempelsökning"
                size="sm"
                onClick={() => setQuery("")}
              >
                <FiX />
              </IconButton>
            )
          }
        />
      </div>
      <div className={styles.previewGrid}>
        <div>
          <DataList label="Exempelnyheter">
            {visible.map((item) => (
              <NewsRow
                as="li"
                key={item.id}
                company={item.company}
                title={item.title}
                reaction={item.change}
                reactionLabel="Exempel på kursförändring"
                onOpen={() => setStory(item)}
                metadata={
                  <>
                    <span>{item.time}</span>
                    <span>{item.tag}</span>
                    {following.has(item.id) && <span>Din aktie</span>}
                  </>
                }
              />
            ))}
          </DataList>
          {!visible.length && (
            <EmptyState
              title="Inga nyheter i urvalet"
              description="Prova ett annat bolag eller rensa sökningen."
              action={
                <Button variant="secondary" onClick={() => setQuery("")}>
                  Rensa sökning
                </Button>
              }
            />
          )}
        </div>
        <aside className={styles.letter}>
          <div className={styles.letterTop}>
            <span className={styles.letterMark} aria-hidden="true">
              o.
            </span>
            <Text size="xs" tone="secondary">
              Morgonbrevet · exempel
            </Text>
          </div>
          <Heading as="h3" size="subsection">
            Rapporterna sätter tonen
          </Heading>
          <Text size="sm" tone="secondary">
            Industribolagen står i fokus. Det här följer vi inför en ny börsdag.
          </Text>
          <Button
            variant="ghost"
            onClick={() =>
              setStory({
                company: "Morgonbrevet",
                title: "Rapporterna sätter tonen",
                letter: true,
              })
            }
          >
            Läs brevet <FiArrowRight aria-hidden="true" />
          </Button>
        </aside>
      </div>
      <Text size="xs" tone="secondary">
        Illustrativa nyheter och värden. Inga aktuella kurser eller riktiga
        nyhetshändelser.
      </Text>
      <Dialog
        open={Boolean(story)}
        onOpenChange={(open) => {
          if (!open) setStory(null);
        }}
        title={story?.company ?? "Exempelnyhet"}
        description="Förhandsvisning av nyhetsdetalj · exempeldata"
        footer={
          <DialogClose render={<Button variant="secondary" />}>
            Stäng
          </DialogClose>
        }
      >
        <Stack>
          <Heading as="h3" size="subsection">
            {story?.title}
          </Heading>
          <Text size="sm" tone="secondary">
            Sammanfattning, källor och information om kursreaktionen hör hemma
            här. Flödet visar bara det som behövs för att välja vad du vill
            läsa.
          </Text>
          {!story?.letter && (
            <Button
              variant="secondary"
              onClick={() =>
                setFollowing((current) => {
                  const next = new Set(current);
                  if (next.has(story.id)) next.delete(story.id);
                  else next.add(story.id);
                  return next;
                })
              }
              aria-pressed={following.has(story?.id)}
            >
              {following.has(story?.id) ? <FiCheck /> : <FiPlus />}
              {following.has(story?.id)
                ? "Bevakas i exemplet"
                : "Bevaka i exemplet"}
            </Button>
          )}
        </Stack>
      </Dialog>
    </div>
  );
}

function PreferencesExample() {
  const [market, setMarket] = useState("se");
  const [keyword, setKeyword] = useState("");
  const [reports, setReports] = useState(true);
  const [notifications, setNotifications] = useState(false);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  function save(event) {
    event.preventDefault();
    if (!keyword.trim()) {
      setError("Skriv ett nyckelord att bevaka.");
      return;
    }
    setError("");
    setSaved(
      `“${keyword.trim()}” sparat i exemplet. Inga riktiga bevakningar eller aviseringar har skapats.`,
    );
    setOpen(false);
  }
  return (
    <>
      <Inline>
        <Dialog
          trigger={
            <Button>
              <FiPlus aria-hidden="true" />
              Ny bevakning
            </Button>
          }
          open={open}
          onOpenChange={setOpen}
          title="Vad vill du följa?"
          description="Testa formuläret. Inget sparas till ditt konto."
        >
          <form onSubmit={save} noValidate>
            <Stack gap={6}>
              <TextField
                label="Nyckelord"
                placeholder="Till exempel halvledare"
                value={keyword}
                onValueChange={(value) => {
                  setKeyword(value);
                  setError("");
                }}
                error={error}
                name="keyword"
                required
              />
              <Select
                label="Marknad"
                options={MARKET_OPTIONS}
                value={market}
                onValueChange={setMarket}
              />
              <Checkbox
                label="Inkludera rapporter"
                checked={reports}
                onCheckedChange={setReports}
              />
              <Switch
                label="Aviseringar"
                description="Att följa och att få aviseringar är olika val."
                checked={notifications}
                onCheckedChange={setNotifications}
              />
              <Inline className={styles.formActions}>
                <DialogClose render={<Button variant="ghost" />}>
                  Avbryt
                </DialogClose>
                <Button type="submit">Spara exempel</Button>
              </Inline>
            </Stack>
          </form>
        </Dialog>
        <Text size="sm" tone="secondary">
          Dialog med validering och fokusåterställning.
        </Text>
      </Inline>
      <Text size="sm" role="status" aria-live="polite">
        {saved}
      </Text>
    </>
  );
}

export default function DesignSystem() {
  const { theme, setTheme } = useTheme();
  const [market, setMarket] = useState("se");
  const [sort, setSort] = useState("latest");
  const [checked, setChecked] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState("empty");

  return (
    <div className={cx(ui.scope, styles.root)}>
      <aside className={styles.rail}>
        <Link href="/" className={styles.brand}>
          <span aria-hidden="true" />
          omxsum
          <Text as="span" size="xs" tone="secondary">
            / ui
          </Text>
        </Link>
        <div className={styles.railLabel}>
          Designsystem <Badge>01</Badge>
        </div>
        <nav aria-label="Designsystemets avsnitt" className={styles.railNav}>
          <a href="#overview">
            <FiGrid aria-hidden="true" />
            Överblick
          </a>
          <a href="#foundations">
            <FiType aria-hidden="true" />
            Grunder
          </a>
          <a href="#components">
            <FiLayers aria-hidden="true" />
            Komponenter
          </a>
          <a href="#patterns">
            <FiSliders aria-hidden="true" />
            Mönster
          </a>
          <a href="#resources">
            <FiArrowUpRight aria-hidden="true" />
            Plan & resurser
          </a>
        </nav>
        <div className={styles.railBottom}>
          <Text size="xs" tone="secondary">
            Byggt med Base UI.
            <br />
            Formgivet för OMXsum.
          </Text>
          <Link href="/marknaden">
            <FiArrowLeft aria-hidden="true" />
            Till sajten
          </Link>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.topbar}>
          <Text size="xs" tone="secondary">
            OMXsum / Public web
          </Text>
          <Inline gap={3}>
            <Text size="xs" tone="secondary">
              Foundation v1
            </Text>
            <IconButton
              label="Växla ljust eller mörkt tema"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <FiSun className={styles.sun} aria-hidden="true" />
              <FiMoon className={styles.moon} aria-hidden="true" />
            </IconButton>
          </Inline>
        </div>
        <Container className={styles.content}>
          <header id="overview" className={styles.intro}>
            <Inline gap={3}>
              <Badge tone="accent">OMXsum UI</Badge>
              <Text size="xs" tone="secondary">
                Interaktivt komponentbibliotek · v1
              </Text>
            </Inline>
            <Heading as="h1" size="page">
              En gemensam grund.
            </Heading>
            <Text tone="secondary">
              Samma språk för nyheter, bolag och bevakning. Färre visuella
              beslut på varje sida, mer utrymme för det som betyder något.
            </Text>
          </header>
          <NewsPreview />

          <Section
            id="foundations"
            number="01"
            title="Grunder"
            description="En begränsad skala. Samma regler överallt."
          >
            <Example title="Ytor & färger" name="--ui-*">
              <div className={styles.swatches}>
                {[
                  ["canvas", "Canvas"],
                  ["surface", "Yta"],
                  ["inset", "Infälld"],
                  ["text", "Text"],
                  ["accent", "Identitet"],
                ].map(([token, label]) => (
                  <div key={token}>
                    <span style={{ background: `var(--ui-${token})` }} />
                    <Text size="xs" tone="secondary">
                      {label}
                    </Text>
                  </div>
                ))}
              </div>
              <Inline gap={3}>
                <ChangeBadge value={2.4} />
                <ChangeBadge value={-1.2} />
                <ChangeBadge value={0} />
                <ChangeBadge value={null} />
                <Text size="xs" tone="secondary">
                  Färg kompletterar alltid ett värde eller en etikett.
                </Text>
              </Inline>
            </Example>
            <Example title="Typografi" name="Heading · Text">
              <div className={styles.typeScale}>
                <div>
                  <Heading as="p" size="page">
                    Marknaden idag
                  </Heading>
                  <code>32 / 38 · Sidtitel</code>
                </div>
                <div>
                  <Heading as="p">Det som driver dagen</Heading>
                  <code>24 / 29 · Sektion</code>
                </div>
                <div>
                  <Heading as="p" size="subsection">
                    Dina bevakningar
                  </Heading>
                  <code>20 / 24 · Underrubrik</code>
                </div>
                <div>
                  <Text>Nyheter med sammanhang.</Text>
                  <code>16 / 24 · Brödtext</code>
                </div>
                <div>
                  <Text size="sm">Atlas Copco får en ny stororder</Text>
                  <code>14 / 21 · UI & listor</code>
                </div>
                <div>
                  <Text size="xs" tone="secondary">
                    09:42 · Rapport · Din aktie
                  </Text>
                  <code>12 / 18 · Metadata</code>
                </div>
              </div>
            </Example>
            <div className={styles.twoColumns}>
              <Example title="Avstånd" name="Stack · Inline">
                <div className={styles.spacing}>
                  {[4, 8, 12, 16, 24, 32, 48, 64].map((n) => (
                    <div key={n}>
                      <span style={{ height: n }} />
                      <code>{n}</code>
                    </div>
                  ))}
                </div>
              </Example>
              <Example title="Radier" name="--ui-radius-*">
                <div className={styles.radii}>
                  {[
                    ["sm", "8"],
                    ["md", "12"],
                    ["lg", "16"],
                    ["pill", "Pill"],
                  ].map(([token, label]) => (
                    <div key={token}>
                      <span
                        style={{ borderRadius: `var(--ui-radius-${token})` }}
                      />
                      <code>{label}</code>
                    </div>
                  ))}
                </div>
              </Example>
            </div>
          </Section>

          <Section
            id="components"
            number="02"
            title="Komponenter"
            description="Testa med mus, touch och tangentbord."
          >
            <Example title="Knappar" name="Button · IconButton">
              <Inline gap={3}>
                <Button
                  onClick={() => setMessage("Primär handling aktiverad.")}
                >
                  Bevaka bolag <FiPlus aria-hidden="true" />
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setMessage("Sekundär handling aktiverad.")}
                >
                  Visa alla
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setMessage("Lågprioriterad handling aktiverad.")
                  }
                >
                  Avbryt
                </Button>
                <Button
                  variant="danger"
                  onClick={() =>
                    setMessage(
                      "Exempel på en destruktiv handling. Ingenting togs bort.",
                    )
                  }
                >
                  Ta bort
                </Button>
                <Tooltip
                  trigger={
                    <IconButton label="Om bevakningar">
                      <FiInfo aria-hidden="true" />
                    </IconButton>
                  }
                >
                  Bevakningar anpassar flödet. Aviseringar väljs separat.
                </Tooltip>
              </Inline>
              <Inline gap={3}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setMessage(
                      "Kompakt knapp: 36 px på desktop, 44 px med touch.",
                    )
                  }
                >
                  Kompakt
                </Button>
                <Button disabled>Inaktiverad</Button>
                <Button
                  loading={demoLoading}
                  variant="secondary"
                  onClick={() => {
                    setDemoLoading(true);
                    setTimeout(() => {
                      setDemoLoading(false);
                      setMessage("Exemplet är sparat.");
                    }, 1200);
                  }}
                >
                  {demoLoading ? "Sparar…" : "Testa laddning"}
                </Button>
              </Inline>
              <Text size="xs" tone="secondary" role="status">
                {message ||
                  "En primär handling per sammanhang. Ikonknappar har alltid ett tillgängligt namn."}
              </Text>
            </Example>
            <div className={styles.twoColumns}>
              <Example title="Fält & validering" name="TextField">
                <Stack>
                  <TextField
                    label="E-postadress"
                    type="email"
                    autoComplete="email"
                    placeholder="namn@exempel.se"
                    value={email}
                    onValueChange={setEmail}
                  />
                  <TextField
                    label="Nyckelord"
                    defaultValue=""
                    placeholder="Lägg till nyckelord"
                    error="Skriv minst ett nyckelord."
                  />
                </Stack>
              </Example>
              <Example title="Dropdown & meny" name="Select · Menu">
                <Stack>
                  <Select
                    label="Marknad"
                    options={MARKET_OPTIONS}
                    value={market}
                    onValueChange={setMarket}
                  />
                  <Inline>
                    <Menu
                      label="Exempelåtgärder"
                      trigger={
                        <Button variant="secondary">
                          Fler åtgärder <FiChevronDown aria-hidden="true" />
                        </Button>
                      }
                      items={[
                        {
                          id: "follow",
                          label: "Bevaka bolag",
                          icon: <FiBell aria-hidden="true" />,
                          onClick: () =>
                            setMessage("Bolaget bevakas i exemplet."),
                        },
                        {
                          id: "link",
                          label: "Visa bolagslänk",
                          icon: <FiCopy aria-hidden="true" />,
                          onClick: () =>
                            setMessage("Exempellänk: /aktie/ATCO-A.ST"),
                        },
                        {
                          id: "disabled",
                          label: "Export kommer senare",
                          disabled: true,
                        },
                      ]}
                    />
                    <Text size="xs" tone="secondary">
                      Val ändrar värde. Menyer utför handlingar.
                    </Text>
                  </Inline>
                </Stack>
              </Example>
            </div>
            <div className={styles.twoColumns}>
              <Example title="Val & inställningar" name="Checkbox · Switch">
                <Stack>
                  <Checkbox
                    label="Kvartalsrapporter"
                    description="Inkludera rapporter i ditt urval."
                    checked={checked}
                    onCheckedChange={setChecked}
                  />
                  <Switch
                    label="E-postaviseringar"
                    description="Av tills du själv väljer att aktivera dem."
                    checked={enabled}
                    onCheckedChange={setEnabled}
                  />
                </Stack>
              </Example>
              <Example title="Sortering" name="SegmentedControl">
                <Stack>
                  <Inline>
                    <SegmentedControl
                      label="Exempelsortering"
                      value={sort}
                      onValueChange={setSort}
                      options={[
                        { value: "latest", label: "Senaste" },
                        { value: "reaction", label: "Kursreaktion" },
                      ]}
                    />
                  </Inline>
                  <Text size="xs" tone="secondary">
                    Valt: {sort === "latest" ? "Senaste" : "Kursreaktion"}. Ett
                    val är alltid aktivt.
                  </Text>
                </Stack>
              </Example>
            </div>
            <Example title="Flikar" name="Tabs · TabList · Tab · TabPanel">
              <Tabs defaultValue="news">
                <TabList label="Exempel på bolagsflikar">
                  <Tab value="news">Nyheter</Tab>
                  <Tab value="company">Om bolaget</Tab>
                  <Tab value="calendar">Kalender</Tab>
                </TabList>
                <TabPanel value="news">
                  <Text size="sm" tone="secondary">
                    Nyheter och rapporter för det valda bolaget.
                  </Text>
                </TabPanel>
                <TabPanel value="company">
                  <Text size="sm" tone="secondary">
                    Verksamhet, sektor och finansiell översikt.
                  </Text>
                </TabPanel>
                <TabPanel value="calendar">
                  <Text size="sm" tone="secondary">
                    Kommande rapporter och bolagshändelser.
                  </Text>
                </TabPanel>
              </Tabs>
            </Example>
          </Section>

          <Section
            id="patterns"
            number="03"
            title="Mönster"
            description="Komponenter som fungerar tillsammans."
          >
            <Example
              title="Bolagslista"
              name="DataList · ListRow · ChangeBadge"
            >
              <DataList label="Exempelbolag">
                {EXAMPLE_STORIES.map((item) => (
                  <ListRow
                    key={item.id}
                    leading={
                      <span
                        className={styles.companyMonogram}
                        aria-hidden="true"
                      >
                        {item.company.slice(0, 1)}
                      </span>
                    }
                    trailing={
                      <Inline gap={3}>
                        <ChangeBadge value={item.change} label="Exempelvärde" />
                        <Menu
                          label={`Åtgärder för ${item.company}`}
                          trigger={
                            <IconButton label={`Åtgärder för ${item.company}`}>
                              <FiMoreHorizontal aria-hidden="true" />
                            </IconButton>
                          }
                          items={[
                            {
                              id: "open",
                              label: "Öppna bolag",
                              render: (
                                <Link
                                  href={`/aktie/${item.id === "atlas" ? "ATCO-A.ST" : item.id === "volvo" ? "VOLV-B.ST" : "ERIC-B.ST"}`}
                                />
                              ),
                            },
                            {
                              id: "watch",
                              label: "Bevaka i exemplet",
                              onClick: () =>
                                setMessage(
                                  `${item.company} bevakas i exemplet.`,
                                ),
                            },
                          ]}
                        />
                      </Inline>
                    }
                  >
                    <Text size="sm">{item.company}</Text>
                    <Text size="xs" tone="secondary">
                      {item.ticker} · Exempeldata
                    </Text>
                  </ListRow>
                ))}
              </DataList>
            </Example>
            <Example
              title="Bevakningsdialog"
              name="Dialog · TextField · Select"
            >
              <Stack>
                <PreferencesExample />
              </Stack>
            </Example>
            <Example title="Tomt, laddar & fel" name="EmptyState · Skeleton">
              <Stack>
                <Inline>
                  <SegmentedControl
                    label="Exempel på innehållsstatus"
                    value={state}
                    onValueChange={setState}
                    options={[
                      { value: "empty", label: "Tomt" },
                      { value: "loading", label: "Laddar" },
                      { value: "error", label: "Fel" },
                    ]}
                  />
                </Inline>
                <div className={styles.statePreview}>
                  {state === "empty" ? (
                    <EmptyState
                      icon={<FiBell />}
                      title="Ditt flöde börjar här"
                      description="Följ ett bolag, ett ämne eller ett nyckelord."
                      action={
                        <Button
                          variant="secondary"
                          onClick={() => {
                            document
                              .getElementById("components")
                              .scrollIntoView({ behavior: "instant" });
                          }}
                        >
                          Utforska komponenter{" "}
                          <FiArrowRight aria-hidden="true" />
                        </Button>
                      }
                    />
                  ) : state === "loading" ? (
                    <Stack aria-busy="true" aria-label="Laddar exempelnyheter">
                      {[1, 2, 3].map((n) => (
                        <Skeleton key={n} />
                      ))}
                    </Stack>
                  ) : (
                    <EmptyState
                      role="alert"
                      title="Nyheterna kunde inte hämtas"
                      description="Dina bevakningar finns kvar. Försök igen om en stund."
                      action={
                        <Button
                          variant="secondary"
                          onClick={() => setState("empty")}
                        >
                          Försök igen
                        </Button>
                      }
                    />
                  )}
                </div>
              </Stack>
            </Example>
          </Section>

          <Section
            id="resources"
            number="04"
            title="Plan & resurser"
            description="Låna hantverket, behåll OMXsum-idén."
          >
            <div className={styles.roadmap}>
              {[
                [
                  "01",
                  "Grund & komponenter",
                  "Tokens, tillgängliga kontroller, listor, teman och den här referenssidan.",
                  "Denna version",
                ],
                [
                  "02",
                  "Navigation & nyheter",
                  "Gemensamt skal, kompakt sök, nyhetsledd marknadsöversikt och personliga flöden.",
                  "Implementerat lokalt",
                ],
                [
                  "03",
                  "Bolag & upptäckt",
                  "Nyhetsvägar och synlig screener är på plats. Fler analysvyer ska få samma komponenter.",
                  "Delvis migrerat",
                ],
                [
                  "04",
                  "Läsning & konto",
                  "Delbar nyhetsläsare, sociala bilder, brevarkiv och följfunktion. Kontots äldre vyer återstår.",
                  "Delvis migrerat",
                ],
              ].map(([number, title, detail, status]) => (
                <div key={number}>
                  <Text size="xs" tone="secondary">
                    {number}
                  </Text>
                  <Stack gap={1}>
                    <Text>{title}</Text>
                    <Text size="sm" tone="secondary">
                      {detail}
                    </Text>
                  </Stack>
                  <Badge>{status}</Badge>
                </div>
              ))}
            </div>
            <div className={styles.resourceLinks}>
              <a
                href="https://performance.dev/wealthsimple-year-one"
                target="_blank"
                rel="noreferrer"
              >
                <span>
                  Wealthsimple: one year post-acquisition
                  <Text as="span" size="xs" tone="secondary">
                    Dennis Brotzky · arbetssätt, designsystem och prestanda
                  </Text>
                </span>
                <FiArrowUpRight aria-hidden="true" />
              </a>
              <a href="https://tcosta.com/" target="_blank" rel="noreferrer">
                <span>
                  Thiago Costa
                  <Text as="span" size="xs" tone="secondary">
                    Formgivaren bakom Fey · förstahandsreferens
                  </Text>
                </span>
                <FiArrowUpRight aria-hidden="true" />
              </a>
              <a
                href="https://base-ui.com/react/overview/quick-start"
                target="_blank"
                rel="noreferrer"
              >
                <span>
                  Base UI
                  <Text as="span" size="xs" tone="secondary">
                    Primitiver, tangentbord, fokus och tillgänglighet
                  </Text>
                </span>
                <FiArrowUpRight aria-hidden="true" />
              </a>
            </div>
            <Text size="sm" tone="secondary">
              Implementationsregler finns i UI.md. Källor, avgränsning och
              migreringsplan finns i docs/design-system.md.
            </Text>
          </Section>
          <footer className={styles.footer}>
            <Text size="xs" tone="secondary">
              OMXsum UI · Egen identitet, gemensamma byggstenar.
            </Text>
            <a href="#overview">Till toppen ↑</a>
          </footer>
        </Container>
      </main>
    </div>
  );
}
