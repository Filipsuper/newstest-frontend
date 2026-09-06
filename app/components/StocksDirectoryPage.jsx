"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiInfo, FiSearch } from "react-icons/fi";
import { fetchCompanyDirectory, fetchCompanyList, fetchCompanyNews } from "../utils/api";
import { companySector, directoryQuote, discoverStocks, STOCK_PAGE_SIZE, STOCK_SEGMENTS, STOCK_SORTS, STOCK_VIEWS, stockFilters, stockFiltersHref, stockSegment, stockSegmentLabel } from "../utils/stockDiscovery";
import { newsDate, storyHref } from "../utils/newsroom";
import { StockWorkspaceNav } from "./WorkspaceNav";
import FollowCompanyButton from "./FollowCompanyButton";
import NewsTypeLabel from "./NewsTypeLabel";
import { Container, Heading, Inline, Stack, Surface, Text } from "./ui/layout";
import { Button, IconButton } from "./ui/Button";
import { TextField } from "./ui/TextField";
import { Select } from "./ui/Select";
import { SegmentedControl } from "./ui/SegmentedControl";
import { ChangeBadge, DataList, EmptyState } from "./ui/data";
import { Dialog } from "./ui/overlays";
import styles from "./stock-discovery.module.css";

function CompanyRow({ company, now, newsAvailable }) {
  const quote = directoryQuote(company, now);
  const story = company.story;
  const mainTag = story?.tags?.find(tag => tag !== "REGULATORY") ?? story?.tags?.[0];
  return <Surface as="li" className={styles.row}>
    <div className={styles.identity}>
      <Link className={styles.company} href={`/aktie/${encodeURIComponent(company.symbol)}`} prefetch={false}>{company.name}</Link>
      <Text size="xs" tone="secondary">{company.nativeSymbol || company.symbol.replace(/\.ST$/i, "")} · {stockSegmentLabel(company)}</Text>
      {companySector(company) && <Text size="xs" tone="secondary">{companySector(company)}</Text>}
    </div>
    <div className={styles.quote}>
      <Text size="sm" numeric>{quote.price}</Text>
      <ChangeBadge value={quote.change} label={`Dagsförändring, ${quote.period}`} />
      <Text size="xs" tone="secondary" as="time" dateTime={quote.dateTime}>{quote.period}</Text>
      {quote.currencyMissing && <Text size="xs" tone="secondary">Valuta saknas</Text>}
    </div>
    <div className={styles.story}>
      {story ? <>
        <Link href={storyHref(story.id)} scroll={false} prefetch={false} className={styles.headline}>{story.title}</Link>
        <Inline gap={2} className={styles.metadata}>
          {mainTag && <NewsTypeLabel type={mainTag} />}
          {story.source && <span>{story.source}</span>}
          <time dateTime={story.publishedAt}>{newsDate(story.publishedAt)}</time>
        </Inline>
      </> : <Text size="sm" tone="secondary">{newsAvailable ? "Ingen nyhet i urvalet" : "Nyhetsurvalet är inte tillgängligt"}</Text>}
    </div>
    <div className={styles.follow}><FollowCompanyButton symbol={company.symbol} name={company.name} /></div>
  </Surface>;
}

export default function StocksDirectoryPage({ companies = null, news = null, quotesAvailable = true, initialFilters, asOf }) {
  const [rows, setRows] = useState(companies);
  const [snapshot, setSnapshot] = useState(news);
  const [hasQuotes, setHasQuotes] = useState(quotesAvailable);
  const [filters, setFilters] = useState(initialFilters ?? stockFilters());
  const [now, setNow] = useState(asOf);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState(false);
  // URL updates do not refetch the full directory on each keystroke. The
  // mounted state also survives an intercepted story URL without resetting.
  useEffect(() => {
    const restore = () => {
      if (window.location.pathname === "/aktier") setFilters(stockFilters(new URLSearchParams(window.location.search)));
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  function update(patch) {
    const next = { ...filters, page: 1, ...patch };
    setFilters(next);
    window.history.replaceState(null, "", stockFiltersHref(next));
  }
  async function retry() {
    if (busy) return;
    setBusy(true);
    try {
      const [directory, nextNews] = await Promise.all([fetchCompanyDirectory(), fetchCompanyNews()]);
      const nextRows = directory ?? await fetchCompanyList();
      setRows(nextRows);
      setHasQuotes(directory !== null);
      setSnapshot(nextNews);
      setNow(Date.now());
    } finally { setBusy(false); }
  }
  const sectors = useMemo(() => [{ value: "all", label: "Alla sektorer" }, ...[...new Set((rows ?? []).map(companySector).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "sv-SE")).map(value => ({ value, label: value }))], [rows]);
  // Retain an unavailable URL filter so a reload never silently changes it.
  const sectorOptions = sectors.some(option => option.value === filters.sector) ? sectors : [...sectors, { value: filters.sector, label: filters.sector }];
  const segments = useMemo(() => {
    const present = new Set((rows ?? []).map(stockSegment));
    return STOCK_SEGMENTS.filter(option => option.value === "all" || option.value === filters.segment || present.has(option.value));
  }, [rows, filters.segment]);
  const filtered = useMemo(() => discoverStocks(rows, snapshot, filters), [rows, snapshot, filters]);
  const visible = filtered.slice(0, filters.page * STOCK_PAGE_SIZE);
  const unavailable = rows === null || (filters.view !== "all" && snapshot === null);
  const narrowed = Boolean(filters.q || filters.sector !== "all" || filters.segment !== "all");
  const truncated = snapshot?.coverage?.truncated?.[filters.view === "reports" ? "reports" : "news"];
  return <Container as="main" className={styles.workspace}>
    <StockWorkspaceNav foundation />
    <header className={styles.header}>
      <Heading as="h1" size="section">Aktier</Heading>
      <TextField className={styles.search} label="Sök bolag eller ticker" hideLabel type="search" maxLength={80} placeholder="Sök bolag eller ticker" leading={<FiSearch />} value={filters.q} onValueChange={q => update({ q })} />
    </header>
    <Stack gap={4}>
      <SegmentedControl className={styles.views} label="Utforska bolag" options={STOCK_VIEWS} value={filters.view} onValueChange={view => update({ view, sort: view === "all" ? "name" : "recent" })} />
      <div className={styles.filters}>
        <Select label="Lista" hideLabel options={segments} value={filters.segment} onValueChange={segment => update({ segment })} />
        <Select label="Sektor" hideLabel options={sectorOptions} value={filters.sector} onValueChange={sector => update({ sector })} />
        <Select label="Sortera" hideLabel options={STOCK_SORTS} value={filters.sort} onValueChange={sort => update({ sort })} />
        {narrowed && <Button variant="ghost" onClick={() => update({ q: "", segment: "all", sector: "all" })}>Rensa filter</Button>}
      </div>
    </Stack>
    <section className={styles.results} aria-label="Bolagsresultat" aria-busy={busy}>
      <Inline className={styles.resultsHeader}>
        <Text size="sm" tone="secondary" role="status">{unavailable ? "Urvalet kunde inte hämtas" : `${filtered.length} bolag${filters.view === "all" ? "" : ` · ${snapshot?.coverage?.hours ?? 96} senaste timmarna`}`}</Text>
        <IconButton variant="ghost" label="Om nyhetsurval och kurser" onClick={() => setInfo(true)}><FiInfo /></IconButton>
      </Inline>
      {(!hasQuotes || (filters.view === "all" && snapshot === null)) && rows !== null && <Inline className={styles.notice}>
        <Text size="sm" tone="secondary">{!hasQuotes ? "Kurserna kunde inte hämtas." : "Nyhetsurvalet kunde inte hämtas."}</Text>
        <Button variant="ghost" loading={busy} onClick={retry}>Försök igen</Button>
      </Inline>}
      {truncated && filters.view !== "all" && <Text className={styles.notice} size="xs" tone="secondary">Urvalet är begränsat till {snapshot.coverage.companyLimit} bolag före filtrering.</Text>}
      {unavailable ? <EmptyState title="Bolagsurvalet är inte tillgängligt" description="Försök igen, eller sök i hela bolagslistan." action={<Inline><Button loading={busy} onClick={retry}>Försök igen</Button>{rows !== null && <Button variant="secondary" onClick={() => update({ view: "all", sort: "name" })}>Visa alla bolag</Button>}</Inline>} />
        : filtered.length === 0 ? <EmptyState title={narrowed ? "Inga bolag matchar filtren" : "Inga bolag i det här nyhetsurvalet"} description={filters.view === "all" ? "Prova ett annat bolagsnamn eller ändra filtren." : "Sök bland alla bolag, även de som inte har en nyhet i urvalet."} action={<Inline>{narrowed && <Button variant="secondary" onClick={() => update({ q: "", sector: "all", segment: "all" })}>Rensa filter</Button>}{filters.view !== "all" && <Button onClick={() => update({ view: "all", sort: "name" })}>Visa alla bolag</Button>}</Inline>} />
          : <>
            <div className={styles.columns} aria-hidden="true"><span>Bolag</span><span>Kurs / dagsförändring</span><span>{filters.view === "reports" ? "Rapportnyhet" : "Nyhet i fokus"}</span><span>Bevakning</span></div>
            <DataList label="Bolag" className={styles.list}>{visible.map(company => <CompanyRow key={company.symbol} company={company} now={now} newsAvailable={snapshot !== null} />)}</DataList>
            <Inline className={styles.pagination}>
              <Text size="xs" tone="secondary">Visar {visible.length} av {filtered.length} bolag</Text>
              {visible.length < filtered.length && <Button variant="secondary" onClick={() => update({ page: filters.page + 1 })}>Visa fler bolag</Button>}
            </Inline>
          </>}
    </section>
    <Dialog open={info} onOpenChange={setInfo} title="Om nyhetsurval och kurser">
      <Stack gap={4}>
        <Text size="sm">En utvald nyhet per bolag från de senaste {snapshot?.coverage?.hours ?? 96} timmarna. Urvalet utgår från nyheternas befintliga viktighetsvärde, minst {snapshot?.coverage?.minImportance ?? 60} av 100. Vanliga insynsaffärer under 25 miljoner kronor och administrativa utskick filtreras bort. Det är inte ett köp- eller säljråd.</Text>
        <Text size="sm">Rapporter visar publicerade resultat, prognoser och vinstvarningar – inte en kalender över kommande rapporter. Högst {snapshot?.coverage?.companyLimit ?? 200} bolag per urval. Alla bolag finns kvar i bolagslistan.</Text>
        <Text size="sm">Kursen visar senaste tillgängliga notering. Procenten är handelsdagens förändring, inte reaktionen på nyheten. Datum anges för äldre kurser. Öppna nyheten för reaktionen sedan publicering.</Text>
        {snapshot?.coverage?.to && <Text size="xs" tone="secondary">Nyhetsurval hämtat {newsDate(snapshot.coverage.to)}.</Text>}
        <Link className={styles.textLink} href="/marknaden/nyheter">Till hela nyhetsflödet →</Link>
      </Stack>
    </Dialog>
  </Container>;
}
