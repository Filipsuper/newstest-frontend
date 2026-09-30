"use client";

import { useEffect, useId, useMemo, useState } from 'react';
import { Bar, Cell, ComposedChart, LabelList, Line, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchValuation } from '../utils/api';
import { finite, VALUATION_METRICS, valuationChartData, valuationHistoryData } from '../utils/companyValuation';
import { safeSourceUrl } from '../utils/newsroom';
import { Button } from './ui/Button';
import { EmptyState, Skeleton } from './ui/data';
import { Label } from './ui/Label';
import { SegmentedControl } from './ui/SegmentedControl';
import { Heading, Inline, Stack, Surface, Text } from './ui/layout';
import styles from './company-valuation.module.css';
import { FiscalPeriodTick } from './ResearchPanelParts';
import ReviewedShareBasisNote from './ReviewedShareBasisNote';

const number = (value, digits = 1) => finite(value) ? value.toLocaleString('sv-SE', { maximumFractionDigits: digits }) : '–';
const multipleValue = value => finite(value) ? `${number(value)}×` : '–';
const estimateLabel = row => row.displayLabel ?? `${row.period.label}E`;
const compactAmount = (value, currency) => {
  const scale = Math.abs(value) >= 1e9 ? 1e9 : Math.abs(value) >= 1e6 ? 1e6 : 1;
  return `${number(value / scale, 2)} ${scale === 1e9 ? 'md ' : scale === 1e6 ? 'M' : ''}${currency ?? ''}`;
};
const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Datum saknas';
const formulas = {
  pe: 'Aktiekurs / vinst per aktie.', ps: 'Börsvärde / omsättning.',
  evEbit: '(Börsvärde + rapporterad nettoskuld) / EBIT.', evSales: '(Börsvärde + rapporterad nettoskuld) / omsättning.',
};
const missingHistory = {
  fx_unavailable: 'Växelkurshistorik saknas.', unknown_reporting_currency: 'Rapportvalutan saknas.',
  unknown_trading_currency: 'Handelsvalutan saknas.', no_usable_annual_period: 'Rapporterade helår saknas.',
};

function EstimateReferenceLabel({ viewBox, text }) {
  if (!viewBox) return null;
  // Keep the label in the chart's top margin, clear of both price paths.
  return <text x={viewBox.x + viewBox.width - 6} y={16} textAnchor="end"
    fill="var(--ui-text)" fontSize={12}>{text}</text>;
}

function HistoryChart({ multiple, forecasts, valuation }) {
  const { series, chartData, reference, estimateEnd, ticks, displayMax } = useMemo(() => valuationHistoryData(multiple, forecasts), [multiple, forecasts]);
  const referenceLabel = reference ? `${estimateLabel(reference)} · ${multipleValue(reference.multiple.value)}` : '';
  const stats = multiple?.stats;
  if (!multiple?.available || !series.length) return <EmptyState title="Historik saknas" description="Nyckeltalet kräver positiva, jämförbara rapporterade siffror." />;
  return <>
    <dl className={styles.stats}>
      <div><dt>Senast</dt><dd>{multipleValue(stats?.current)}</dd></div>
      <div><dt>Historisk median</dt><dd>{multipleValue(stats?.median)}</dd></div>
      <div><dt>Mitten 50 %</dt><dd>{number(stats?.p25)}–{number(stats?.p75)}×</dd></div>
    </dl>
    <div className={styles.chart} role="img" aria-label={`${multiple.label} historiskt. Senast ${multipleValue(stats?.current)}, median ${multipleValue(stats?.median)}.${reference ? ` Prickad linje: ${referenceLabel}, ${reference.sourceLabel}, vid kurs ${number(valuation.latestClose, 2)} ${valuation.tradingCurrency} från ${date(valuation.asOf)}.` : ''}`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart aria-hidden="true" data={chartData} margin={{ top: 28, right: 8, bottom: 0, left: -8 }}>
          {finite(stats?.p25) && finite(stats?.p75) && <ReferenceArea x1={series[0].time} x2={series.at(-1).time} y1={stats.p25} y2={stats.p75} fill="var(--ui-text-secondary)" fillOpacity={0.09} stroke="none" />}
          {finite(stats?.median) && <ReferenceLine segment={[{ x: series[0].time, y: stats.median }, { x: series.at(-1).time, y: stats.median }]} stroke="var(--ui-text-secondary)" strokeDasharray="4 5" />}
          <XAxis dataKey="time" type="number" scale="linear" domain={['dataMin', 'dataMax']} ticks={ticks} interval="preserveEnd" tickCount={4} minTickGap={32} axisLine={false} tickLine={false}
            tickFormatter={value => reference && value === estimateEnd ? estimateLabel(reference) : new Date(value).toLocaleDateString('sv-SE', { month: 'short', year: '2-digit' })} />
          <YAxis width={44} domain={[0, displayMax ?? 'auto']} allowDataOverflow axisLine={false} tickLine={false} tickCount={5} tickFormatter={value => number(value)} />
          <Tooltip content={({ active, payload }) => active && payload?.length ? <div className={styles.tooltip}>
            <Text size="xs" tone="secondary">{payload[0].payload.forecast ? `${estimateLabel(reference)} · ${reference.sourceLabel}` : date(payload[0].payload.date)}</Text>
            <Text numeric>{multiple.label} {multipleValue(payload[0].payload.forecast ? reference.multiple.value : payload[0].payload.value)}</Text>
            {payload[0].payload.forecast && <Text size="xs" tone="secondary">Vid kurs {number(valuation.latestClose, 2)} {valuation.tradingCurrency} · {date(valuation.asOf)}</Text>}
          </div> : null} />
          <Line type="linear" dataKey="plotted" stroke="var(--ui-chart-1)" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
          {reference && <Line type="linear" dataKey="estimated" stroke="var(--ui-chart-1)" strokeWidth={2}
            strokeDasharray="1 6" strokeLinecap="round" dot={false} connectNulls={false} isAnimationActive={false} />}
          {reference && <ReferenceDot x={estimateEnd} y={reference.multiple.value} r={3} fill="var(--ui-chart-1)" stroke="var(--ui-surface)"
            label={<EstimateReferenceLabel text={referenceLabel} />} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    <Inline className={styles.legend} gap={4}>
      <Text as="span" size="xs" tone="secondary"><i className={styles.lineMark} />{valuation.basis === 'r12_reported' ? 'R12 · rapporterat' : 'Rapporterade helår'}</Text>
      <Text as="span" size="xs" tone="secondary"><i className={styles.bandMark} />Historiskt spann</Text>
      {reference && <Text as="span" size="xs" tone="secondary"><i className={styles.forwardMark} />{estimateLabel(reference)} · {reference.sourceLabel}</Text>}
    </Inline>
    {reference && <Text size="xs" tone="secondary">Estimatlinje vid kurs {number(valuation.latestClose, 2)} {valuation.tradingCurrency} · {date(valuation.asOf)}</Text>}
    <Text size="xs" tone="secondary">{date(multiple.from)} – {date(multiple.to)}{!multiple.reliable ? ' · Begränsad historik' : ''}</Text>
  </>;
}

function FinancialChart({ model, patternId }) {
  const values = model.bars.filter(row => finite(row.value));
  const max = Math.max(0, ...values.map(row => Math.abs(row.value)));
  const scale = model.config.metric === 'eps' ? 1 : max >= 1e9 ? 1e9 : max >= 1e6 ? 1e6 : max >= 1e3 ? 1e3 : 1;
  const unit = `${scale === 1e9 ? 'md ' : scale === 1e6 ? 'M' : scale === 1e3 ? 't' : ''}${model.currency ?? ''}${model.config.metric === 'eps' ? '/aktie' : ''}`;
  if (!values.length) return <EmptyState title="Underlag saknas" description="Jämförbara rapporterade värden och estimat visas här när de finns." />;
  return <>
    <Inline gap={3} className={styles.legend}>
      <Text as="span" size="xs" tone="secondary">{model.frequency === 'annual' ? 'Helår' : 'Kvartal'} · {unit}</Text>
      <Text as="span" size="xs" tone="secondary"><i className={styles.barMark} />Rapporterat</Text>
      {model.forecasts.length > 0 && <Text as="span" size="xs" tone="secondary"><i className={styles.estimateMark} />Estimat</Text>}
    </Inline>
    <div className={`${styles.chart} ${styles.bars}`} role="img" aria-label={`${model.config.title}: ${model.bars.map(row => `${row.label}: ${number(row.value == null ? null : row.value / scale)} ${unit}, ${row.sourceLabel}`).join('; ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart aria-hidden="true" data={model.bars.map(row => ({ ...row, plotted: finite(row.value) ? row.value / scale : null }))} margin={{ top: 28, right: 4, bottom: 8, left: 4 }}>
          <defs><pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--ui-accent-soft)" /><line x1="0" x2="0" y1="0" y2="6" stroke="var(--ui-chart-1)" strokeWidth="2" />
          </pattern></defs>
          <XAxis dataKey="label" axisLine={false} tickLine={false} interval={0} height={38} tick={<FiscalPeriodTick />} />
          <YAxis hide domain={[minimum => Math.min(0, minimum * 1.12), maximum => Math.max(0, maximum * 1.12)]} />
          <ReferenceLine y={0} stroke="var(--ui-border)" />
          <Tooltip cursor={false} content={({ active, payload }) => active && payload?.length ? <div className={styles.tooltip}>
            <Text size="xs" tone="secondary">{payload[0].payload.label} · {payload[0].payload.sourceLabel}</Text>
            <Text numeric>{number(payload[0].value, 2)} {unit}</Text>
          </div> : null} />
          <Bar dataKey="plotted" maxBarSize={52} radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {model.bars.map(row => <Cell key={row.label} fill={row.source === 'reported' ? 'var(--ui-chart-1)' : `url(#${patternId})`} />)}
            <LabelList dataKey="plotted" position="top" formatter={value => number(value)} fill="var(--ui-text)" fontSize={12} />
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </>;
}

export default function CompanyValuation({ symbol, financials, estimates, estimateAvailability }) {
  const [request, setRequest] = useState({ symbol: null, data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState('pe');
  const [estimateSelection, setEstimateSelection] = useState({ symbol: null, period: null });
  const patternId = `valuation-estimate-${useId().replace(/:/g, '')}`;
  const data = request.symbol === symbol ? request.data : null;
  const error = request.symbol === symbol ? request.error : null;
  useEffect(() => {
    const controller = new AbortController();
    setEstimateSelection(current => current.symbol === symbol ? current : { symbol, period: null });
    setRequest({ symbol, data: null, error: null });
    fetchValuation(symbol, { signal: controller.signal }).then(body => {
      if (controller.signal.aborted) return;
      if (body?.symbol !== symbol || !Array.isArray(body.multiples)) throw new Error('Värderingsunderlaget kunde inte verifieras.');
      setRequest({ symbol, data: body, error: null });
    }).catch(cause => {
      if (!controller.signal.aborted) setRequest({ symbol, data: null, error: /timeout/i.test(cause.name) ? 'Hämtningen tog för lång tid.' : cause.message });
    });
    return () => controller.abort();
  }, [symbol, attempt]);
  const estimatePeriod = estimateSelection.symbol === symbol ? estimateSelection.period : null;
  const model = useMemo(() => valuationChartData({ id: selected, symbol, financials, estimates, availability: estimateAvailability, valuation: data, estimatePeriod }), [selected, symbol, financials, estimates, estimateAvailability, data, estimatePeriod]);
  const history = model.historyValuation ?? data;
  const active = history?.multiples?.find(row => row.id === selected);
  if (error) return <EmptyState title="Värderingen kunde inte hämtas" description={error} action={<Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>Försök igen</Button>} />;
  if (!data) return <div role="status" aria-label="Hämtar värdering" className={styles.loading}><Skeleton /><div className={styles.grid}><Skeleton /><Skeleton /></div></div>;
  return <Stack className={styles.root} gap={4}>
    <Inline className={styles.controlRow} gap={4}>
      <SegmentedControl label="Värderingsmått" options={VALUATION_METRICS} value={selected} onValueChange={setSelected} className={styles.controls} />
      {model.frequency === 'annual' && model.forecasts.length > 1 && <Inline gap={2}>
        <Text as="span" size="xs" tone="secondary">Estimatår</Text>
        <SegmentedControl label="Estimatår" options={model.forecasts.map(row => ({ value: row.period.key, label: `${row.period.label}E` }))}
          value={model.selectedForecast.period.key} onValueChange={period => setEstimateSelection({ symbol, period })} className={styles.controls} />
      </Inline>}
    </Inline>
    <div className={styles.grid}>
      <Surface className={styles.panel}>
        <Inline className={styles.panelHeader}><Heading as="h3" size="subsection">{model.config.label} över tid</Heading><Label>{model.r12 ? 'R12 → R12E' : 'Historik'}</Label></Inline>
        {history.unavailableReason ? <EmptyState title="Historik saknas" description={missingHistory[history.unavailableReason] ?? 'Jämförbart underlag saknas.'} /> : <HistoryChart multiple={active} forecasts={model.historyForecasts} valuation={history} />}
      </Surface>
      <Surface className={styles.panel}>
        <Heading as="h3" size="subsection">{model.config.title}</Heading>
        <FinancialChart model={model} patternId={patternId} />
        {model.forecasts.length ? <>
          <ul className={styles.forecasts} aria-label="Framåtblickande värden">
            {model.forecasts.map(row => <li key={row.period.key}>
              <div><Text as="span" size="sm">{row.period.label}E</Text><Label>{row.sourceLabel}</Label></div>
              <Text as="span" numeric size="md">{row.period.frequency === 'annual' ? (finite(row.multiple.value) ? `${model.config.label} ${multipleValue(row.multiple.value)}` : row.multiple.reason === 'not_meaningful' ? 'Ej meningsfull' : 'Multipel saknas') : `${compactAmount(row.value, model.currency)}${model.config.metric === 'eps' ? '/aktie' : ''}`}</Text>
            </li>)}
          </ul>
          {model.r12 && <Inline className={styles.panelHeader}><Text size="sm">R12E · {model.config.label}</Text><Text numeric>{finite(model.r12.multiple.value) ? multipleValue(model.r12.multiple.value) : model.r12.multiple.reason === 'not_meaningful' ? 'Ej meningsfull' : 'Multipel saknas'}</Text></Inline>}
          <Text size="xs" tone="secondary">{model.r12 ? `3 rapporterade kvartal + ${model.r12.period.label}E` : model.frequency === 'quarterly' ? 'Kvartalsestimat · R12E-underlag saknas' : `Vid kurs ${number(data.latestClose, 2)} ${data.tradingCurrency} · ${date(data.asOf)}`}</Text>
        </> : <Text size="sm" tone="secondary">{estimateAvailability === 'unavailable' || !estimates ? 'Estimat kunde inte hämtas.' : 'Inget jämförbart estimat för detta mått.'}</Text>}
      </Surface>
    </div>
    <details className={styles.details}>
      <summary>Beräkning & underlag</summary>
      <Stack gap={4}>
        <Text size="sm">{formulas[selected]} Historiken använder {model.r12 ? 'fyra sammanhängande rapporterade kvartal (R12)' : 'rapporterade helår'} med en antagen publiceringsfördröjning på {history.method?.publicationLagDays ?? '–'} dagar, inte verifierade publiceringsdatum. Mitten 50 % är historisk spridning, inte ett intervall för rimligt värde. Estimat ingår aldrig i spannet.</Text>
        {model.r12 && <Text size="sm">R12E ersätter {model.r12.droppedQuarter} med estimatet för {model.r12.period.label}. Övriga tre kvartal är rapporterade: {model.r12.retainedQuarters.join(', ')}. Det är inte en prognos för de kommande tolv månaderna. Den raka prickade linjen visar multipeln vid oförändrad kurs och upptar 10 % av grafbredden, inte en kalenderperiod. Ingen riktkurs.</Text>}
        {active && !active.reliable && <Text size="sm">{active.unreliableReason === 'mostly_not_meaningful' ? 'Resultatet är ofta nära noll. Vinstmultipeln saknar därför meningsfull historik.' : 'Historiken är kort. Median och spann bör läsas med försiktighet.'}</Text>}
        {active?.outliersAbove > 0 && <Text size="sm">{active.outliersAbove} observationer över historikens visningsgräns har utelämnats ur kurvan. De ingår fortfarande i statistiken.</Text>}
        {model.frequency === 'annual' && model.forecasts.length > 0 && <Text size="sm">Den prickade förlängningen förbinder senaste historiska multipeln med det valda helårsestimatets multipel ({model.selectedForecast.period.label}E) vid den angivna kursen. Närmaste estimatår är förvalt. Estimatdelen upptar 10 % av grafbredden, inte en kalenderperiod. Det är ingen riktkurs eller prognos för aktiekursens väg. Estimatet ingår inte i historisk median eller spann och visas inte om en jämförbar multipel eller historisk slutpunkt saknas.</Text>}
        <Text size="sm">Konsensus prioriteras per mått och period, därefter ett kvalificerat OMXsum-estimat. Konsensus får vara högst 90 dagar gammalt, modellen 30 dagar. Justerade resultat blandas inte med rapporterade. {selected === 'pe' ? `Vinstgrafen använder ${model.epsBasis === 'dilutedEps' ? 'utspädd' : 'outspädd'} vinst per aktie. Generiskt EPS utan angiven aktiebas används inte som estimat.` : ''}</Text>
        {model.forecasts.some(row => row.source === 'model' && !row.annualModel) && <Text size="sm">OMXsum-modellen skattar nästa kvartal från samma kvartal föregående år, medianen av senare årstillväxt och en blandning av säsongs- och senaste marginaler. En kvartalsprognos multipliceras aldrig med fyra.</Text>}
        {model.forecasts.some(row => row.annualModel) && <Text size="sm">Helårsmodellen väger samman kvartalshistorik och tidigare årsrapporter. Vikterna är preliminära och prognosprecisionen är ännu inte validerad. Mått med granskningsflaggor får ingen estimatlinje.</Text>}
        {selected === 'pe' && model.forecasts.some(row => row.source === 'model' && !row.shareBasis) && <Text size="sm">EPS-estimatet använder vinst hänförlig till stamaktieägarna och verifierade EPS-/aktieantalsfält. Beräkningen antar oförändrat aktieantal och utspädning sedan senaste rapporten; senare emissioner och återköp är inte prognostiserade. Saknat underlag eller oförklarade förändringar i aktieantalet spärrar modellen.</Text>}
        {selected === 'pe' && model.forecasts.filter(row => row.shareBasis).map(row => <ReviewedShareBasisNote key={row.period.key} basis={row.shareBasis} />)}
        {(model.frequency === 'annual' || model.r12) && model.forecasts.length > 0 && <Text size="sm">Framåtblickande multiplar använder kursen från {date(data.asOf)} och senaste rapporterade aktieantal. EV använder också rapporterad nettoskuld per {date(history.capitalization?.current?.basisPeriodEnd)} — inte prognostiserad skuld. Negativa eller nollresultat och vinstmultiplar över {data.method?.notMeaningfulAbove ?? 200} visas inte som en värdering.</Text>}
        {data.fx && <Text size="sm">Rapportvaluta {data.reportingCurrency}, handelsvaluta {data.tradingCurrency}. Historiken använder respektive dags valutakurs. Framåtblickande multiplar använder {data.fx.pair}: {number(data.fx.rateNow, 4)}.</Text>}
        <div className={styles.tableScroll} role="region" aria-label="Finansiellt underlag" tabIndex={0}>
          <table className={styles.table}>
            <caption>{model.config.title} · {model.currency}</caption>
            <thead><tr><th>Period</th><th>Värde</th><th>Underlag</th><th>Datum</th></tr></thead>
            <tbody>{model.bars.map(row => <tr key={row.label}><th>{row.label}</th><td>{number(row.value, 2)}</td><td>{row.sourceLabel}{row.publisher && ` · ${row.publisher}`}{finite(row.contributors) && ` · ${row.contributors} bidragsgivare`}{safeSourceUrl(row.url) && <a href={safeSourceUrl(row.url)} target="_blank" rel="noreferrer">Öppna källa ↗</a>}</td><td>{date(row.asOf)}</td></tr>)}</tbody>
          </table>
        </div>
        <div className={styles.tableScroll} role="region" aria-label="Historiskt värderingsunderlag" tabIndex={0}>
          <table className={styles.table}>
            <caption>{model.r12 ? 'R12 · rapporterat' : 'Rapporterade helår'} · {data.reportingCurrency ?? 'Valuta saknas'}</caption>
            <thead><tr><th>Periodslut</th><th>Antaget från</th><th>Vinst/aktie</th><th>Omsättning</th><th>EBIT</th><th>Nettoskuld</th><th>Aktier</th></tr></thead>
            <tbody>{(history.periods ?? []).map(row => <tr key={row.periodEnd}><th>{row.periodEnd}</th><td>{row.effectiveFrom}</td><td>{number(row.eps, 2)}</td><td>{number(row.revenue, 0)}</td><td>{number(row.ebit, 0)}</td><td>{number(row.netDebt, 0)}</td><td>{number(row.sharesOutstanding, 0)}</td></tr>)}</tbody>
          </table>
        </div>
        <Text size="xs" tone="secondary">Dagliga stängningskurser och rapportunderlag. Ingen riktkurs eller rekommendation.</Text>
      </Stack>
    </details>
  </Stack>;
}
