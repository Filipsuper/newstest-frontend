"use client";

import { Bar, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { Heading, Inline, Stack, Text, cx } from './ui/layout';
import { FINANCIAL_GROUPS, availableFinancialGroups, cashFlowBridge, cashFlowValue, financialComparison, financialMargin, financialPeriodLabel, financialScale, financialSource, netDebtBridge, netDebtPosition, reportedFinancialValue, researchPeriods } from '../utils/companyResearch';
import { safeSourceUrl } from '../utils/newsroom';
import CompanySegmentRevenue from './CompanySegmentRevenue';
import CompanyGeographicRevenue from './CompanyGeographicRevenue';
import styles from './company-research.module.css';

const number = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1 });
const decimal = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const exact = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 });
const colors = ['var(--ui-accent)', 'var(--ui-text-secondary)'];
const amount = (value, currency) => Number.isFinite(value) ? `${exact.format(value)} ${currency || '(valuta saknas)'}` : 'Saknas';
const percent = value => Number.isFinite(value) ? `${decimal.format(value)} %` : 'Saknas';

function ResultChart({ actual, scale, currency, source }) {
  const data = actual.map(period => ({ ...period, ebitMargin: financialMargin(period) }));
  return <Stack gap={1}>
    <Inline gap={3} className={styles.between}>
      <Text size="xs" tone="secondary">{scale.label}</Text>
      <Text size="xs" tone="secondary">%</Text>
    </Inline>
    <div className={styles.resultChart} role="img" aria-label={`Omsättning och EBIT i ${scale.label}, ebit-marginal i procent per period. Värden och källor finns i underlaget nedan.`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} accessibilityLayer>
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: 'var(--ui-text-secondary)', fontSize: 12 }} tickFormatter={label => label.replace(/ (\d{2})(\d{2})$/, ' $2')} />
          <YAxis yAxisId="amount" width={40} tickCount={4} tickFormatter={value => number.format(value / scale.divisor)} tickLine={false} axisLine={false} tick={{ fill: 'var(--ui-text-secondary)', fontSize: 12 }} />
          <YAxis yAxisId="margin" orientation="right" width={40} tickCount={4} domain={[min => Math.min(0, min), max => Math.max(0, max)]} tickFormatter={value => number.format(value)} tickLine={false} axisLine={false} tick={{ fill: 'var(--ui-text-secondary)', fontSize: 12 }} />
          <ReferenceLine yAxisId="amount" y={0} stroke="var(--ui-border)" />
          <Tooltip cursor={{ fill: 'var(--ui-inset)' }} content={({ active, payload }) => {
            const point = payload?.[0]?.payload;
            return active && point ? <div className={styles.tooltip}>
              <Text size="sm">{point.label}</Text>
              <Text size="xs">Omsättning: {amount(point.revenue, currency)}</Text>
              <Text size="xs">EBIT: {amount(point.ebit, currency)}</Text>
              <Text size="xs">EBIT-marginal: {percent(point.ebitMargin)} · beräknad</Text>
              <Text size="xs" tone="secondary">{financialSource(point.source ?? source)}{point.frequency === 'ttm' ? ' · R12, beräknat' : ''}</Text>
            </div> : null;
          }} />
          <Bar yAxisId="amount" dataKey="revenue" fill={colors[0]} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          <Bar yAxisId="amount" dataKey="ebit" fill={colors[1]} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          <Line yAxisId="margin" dataKey="ebitMargin" type="linear" stroke="var(--ui-text)" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: 'var(--ui-surface)', strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    <Inline gap={3} className={styles.legend}>
      {['Omsättning', 'EBIT'].map((label, i) => <Text key={label} size="xs" tone="secondary"><span className={styles.legendMark} style={{ background: colors[i] }} />{label}</Text>)}
      <Text size="xs" tone="secondary"><span className={styles.legendLine} />EBIT-marginal (%)</Text>
    </Inline>
    {!data.some(period => period.ebitMargin !== null) && <Text size="xs" tone="secondary">Underlag för ebit-marginal saknas.</Text>}
  </Stack>;
}

function Change({ value, unit = '%' }) {
  if (!Number.isFinite(value)) return null;
  return <Text size="xs" numeric className={value > 0 ? styles.positive : value < 0 ? styles.negative : undefined}>
    {value > 0 ? '+' : ''}{decimal.format(value)} {unit}
  </Text>;
}

function Metric({ label, value, change, percent = false }) {
  return <Stack gap={1} className={styles.metric}>
    <Text size="xs" tone="secondary" className={styles.metricLabel}>{label}</Text>
    <Text numeric className={styles.figure}>{Number.isFinite(value) ? `${percent ? decimal.format(value) : number.format(value)}${percent ? ' %' : ''}` : 'Saknas'}</Text>
    <Change value={change} unit={percent ? 'pp' : '%'} />
  </Stack>;
}

function FinancialChart({ actual, keys, group, scale, currency, source, chartClassName }) {
  const colorFor = key => colors[group.keys.indexOf(key)];
  return <Stack gap={1} className={styles.chartColumn}>
    <Inline gap={3} className={styles.legend}>
      {keys.map(key => <Text key={key} size="xs" tone="secondary"><span className={styles.legendMark} style={{ background: colorFor(key) }} />{group.labels[group.keys.indexOf(key)]}</Text>)}
    </Inline>
    <div className={cx(styles.chart, chartClassName)} role="img" aria-label={`${keys.map(key => group.labels[group.keys.indexOf(key)]).join(' och ')} per period, ${scale.label}. Värden och källor finns i underlaget nedan.`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={actual} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} accessibilityLayer>
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: 'var(--ui-text-secondary)', fontSize: 12 }} tickFormatter={label => label.replace(/ (\d{2})(\d{2})$/, ' $2')} />
          <YAxis domain={[min => Math.min(0, min), max => Math.max(0, max)]} tickFormatter={value => number.format(value / scale.divisor)} width={44} tickCount={3} tickLine={false} axisLine={false} tick={{ fill: 'var(--ui-text-secondary)', fontSize: 12 }} />
          <ReferenceLine y={0} stroke="var(--ui-border)" />
          <Tooltip cursor={{ fill: 'var(--ui-inset)' }} content={({ active, payload }) => {
            const point = payload?.[0]?.payload;
            return active && point ? <div className={styles.tooltip}>
              <Text size="sm">{point.label}</Text>
              {keys.map(key => <Text key={key} size="xs">{group.labels[group.keys.indexOf(key)]}: {amount(point[key], currency)}</Text>)}
              <Text size="xs" tone="secondary">{financialSource(point.source ?? source)}{point.frequency === 'ttm' ? ' · R12, beräknat' : ''}</Text>
            </div> : null;
          }} />
          {keys.map(key => <Bar key={key} dataKey={key} fill={colorFor(key)} radius={[3, 3, 0, 0]} maxBarSize={24} isAnimationActive={false} />)}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </Stack>;
}

function FinancialWaterfall({ bridge, name, latest, scale, currency, source }) {
  const fills = ['var(--ui-text-secondary)', 'var(--ui-negative)', 'var(--ui-accent)'];
  const min = Math.min(0, ...bridge.steps.flatMap(step => step.range));
  const max = Math.max(0, ...bridge.steps.flatMap(step => step.range));
  const span = max - min || 1;
  const labels = { operating: ['Från driften'], investments: ['Investeringar'], free: ['Fritt', 'kassaflöde'], debt: ['Räntebärande', 'skuld'], cash: ['Kassa'], net: ['Nettoskuld'] };
  const [start, deduction, total] = bridge.steps;
  return <div className={styles.waterfall} role="img" aria-label={`${name}, ${latest.label}: ${bridge.steps.map(step => `${step.label} ${amount(step.value, currency)}`).join(', ')}.`}>
    <div className={styles.waterfallValues} aria-hidden="true">
      {bridge.steps.map(step => <Text key={step.key} size="sm" numeric>{number.format(step.value / scale.divisor)}</Text>)}
    </div>
    <div className={cx(styles.waterfallPlot, bridge.steps.every(step => step.value === 0) && styles.waterfallZero)}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={bridge.steps} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} accessibilityLayer>
          <XAxis dataKey="key" axisLine={false} tickLine={false} interval={0} height={40} tick={({ x, y, payload }) => <text x={x} y={y} textAnchor="middle" fill="var(--ui-text-secondary)" fontSize={12}>
            {labels[payload.value].map((line, index) => <tspan key={line} x={x} dy={index === 0 ? 12 : 16}>{line}</tspan>)}
          </text>} />
          <YAxis hide domain={[min < 0 ? min - span * .08 : 0, max + span * .08]} />
          <ReferenceLine y={0} stroke="var(--ui-border)" />
          <ReferenceLine segment={[{ x: start.key, y: start.value }, { x: deduction.key, y: start.value }]} stroke="var(--ui-border)" />
          <ReferenceLine segment={[{ x: deduction.key, y: total.value }, { x: total.key, y: total.value }]} stroke="var(--ui-border)" />
          <Tooltip cursor={false} content={({ active, payload }) => {
            const step = payload?.[0]?.payload;
            return active && step ? <div className={styles.tooltip}>
              <Text size="sm">{step.label}: {amount(step.value, currency)}</Text>
              <Text size="xs" tone="secondary">{latest.label} · {financialSource(latest.source ?? source)}</Text>
            </div> : null;
          }} />
          <Bar dataKey="range" maxBarSize={48} radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {bridge.steps.map((step, index) => <Cell key={step.key} fill={fills[index]} />)}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </div>;
}

function CashFlowPanel({ actual, keys, group, scale, currency, source, comparison, frequency }) {
  const latest = actual.at(-1);
  const bridge = cashFlowBridge(latest);
  return <section className={styles.chartPanel} aria-label={group.title}>
    <Inline gap={3} className={styles.between}>
      <Heading as="h3" size="subsection" className={styles.panelHeading}>{group.title}</Heading>
      <Text size="xs" tone="secondary">{scale.label}</Text>
    </Inline>
    <div className={styles.cashHeadline}>
      <Metric label="Fritt kassaflöde" value={cashFlowValue(latest) === null ? null : cashFlowValue(latest) / scale.divisor} />
      {latest.cashFlowCalculation && <Text size="xs" tone="secondary">Beräknat · från driften − capex</Text>}
      {Number.isFinite(comparison.freeCashFlow) && <Inline gap={2}><Change value={comparison.freeCashFlow} /><Text size="xs" tone="secondary">mot {frequency === 'quarterly' ? 'samma kvartal i fjol' : 'föregående år'}</Text></Inline>}
    </div>
    {bridge.status === 'available' ? <FinancialWaterfall bridge={bridge} name="Kassaflödesbrygga" latest={latest} scale={scale} currency={currency} source={source} /> : <Stack gap={2}>
      <div className={styles.metrics}>
        <Metric label="Från driften" value={Number.isFinite(latest.operatingCashFlow) ? latest.operatingCashFlow / scale.divisor : null} />
        <Metric label="Investeringar (capex)" value={Number.isFinite(latest.capitalExpenditure) ? latest.capitalExpenditure / scale.divisor : null} />
      </div>
      <Text size="xs" tone="secondary">{bridge.status === 'missing' ? 'Underlag för uppdelningen saknas.' : 'Uppdelningen kan inte stämmas av.'}</Text>
    </Stack>}
    <details className={styles.original}>
      <summary>Historik och beräkning</summary>
      <Stack gap={3}>
        <FinancialChart actual={actual.map(p => ({ ...p, freeCashFlow: cashFlowValue(p) }))} keys={keys} group={group} scale={scale} currency={currency} source={source} />
        <Text size="xs" tone="secondary">Bryggan visar kassaflödet från driften minus investeringar (capex). Den visas bara när båda posterna och fritt kassaflöde finns för samma period och stämmer överens. Andra definitioner kan förekomma.</Text>
        {latest.cashFlowCalculation && <Text size="xs" tone="secondary">Beräkningen använder {latest.capitalExpenditureSourceField === 'CapitalExpenditureReported' ? 'leverantörens rapporterade capex' : 'leverantörens capex'}. Fritt kassaflöde enligt källa: {amount(reportedFinancialValue(latest, 'freeCashFlow'), currency)}. Saknade investeringar antas aldrig vara noll.</Text>}
        <Text size="xs" tone="secondary">{latest.label} · {financialSource(latest.source ?? source)}</Text>
        {safeSourceUrl(latest.sourceUrl) && <a className={styles.cashSource} href={safeSourceUrl(latest.sourceUrl)} target="_blank" rel="noreferrer">Öppna rapporten ↗</a>}
      </Stack>
    </details>
  </section>;
}

function NetDebtHistory({ actual, scale, currency, source }) {
  // Do not connect observations across different cash/debt definitions.
  const definition = period => period.netDebtCalculation
    ? `${period.netDebtCalculation.cashDefinition}/${period.netDebtCalculation.debtDefinition}` : 'legacy_reconciled';
  const selectedDefinition = definition(actual.at(-1));
  const data = actual.map(period => {
    const position = netDebtPosition(period);
    return { ...period, comparableNetDebt: position.status === 'available' && definition(period) === selectedDefinition ? position.calculated : null };
  });
  if (!data.some(period => period.comparableNetDebt !== null)) return <Text size="xs" tone="secondary">Jämförbar nettoskuldshistorik saknas.</Text>;
  const values = data.map(period => period.comparableNetDebt).filter(Number.isFinite);
  const min = Math.min(0, ...values), max = Math.max(0, ...values);
  const ticks = [...new Set([min, 0, max])];
  return <Stack gap={1}>
    <Text size="xs" tone="secondary">Nettoskuld över tid · under noll = nettokassa</Text>
    <div className={styles.chart} role="img" aria-label={`Nettoskuld över tid i ${scale.label}. Negativa värden betyder nettokassa. Värden och källor finns i underlaget nedan.`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer>
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: 'var(--ui-text-secondary)', fontSize: 12 }} tickFormatter={label => label.replace(/ (\d{2})(\d{2})$/, ' $2')} />
          <YAxis width={44} ticks={ticks} domain={[min, max]} tickLine={false} axisLine={false} tickFormatter={value => number.format(value / scale.divisor)} tick={{ fill: 'var(--ui-text-secondary)', fontSize: 12 }} />
          <ReferenceLine y={0} stroke="var(--ui-control-border)" />
          <Tooltip cursor={{ stroke: 'var(--ui-border)' }} content={({ active, payload }) => {
            const point = payload?.[0]?.payload;
            return active && point ? <div className={styles.tooltip}>
              <Text size="sm">{point.label}</Text>
              <Text size="xs">Nettoskuld: {amount(point.comparableNetDebt, currency)}</Text>
              <Text size="xs">Räntebärande skuld: {amount(point.totalDebt, currency)}</Text>
              <Text size="xs">Kassa: {amount(point.cash, currency)}</Text>
              <Text size="xs" tone="secondary">Beräknad vid periodslut · {financialSource(point.source ?? source)}</Text>
            </div> : null;
          }} />
          <Line type="linear" dataKey="comparableNetDebt" stroke="var(--ui-accent)" strokeWidth={2} dot={{ r: 3, fill: 'var(--ui-accent)', strokeWidth: 0 }} connectNulls={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </Stack>;
}

function NetDebtPanel({ actual, group, scale, currency, source }) {
  const latest = actual.at(-1);
  const position = netDebtPosition(latest);
  const bridge = netDebtBridge(latest);
  const netCash = position.netDebt !== null && position.netDebt < 0;
  const headline = netCash ? 'Nettokassa' : 'Nettoskuld';
  const problem = position.status === 'unreconciled' ? 'Uppdelningen stämmer inte med källans nettoskuld.'
    : position.status === 'invalid' ? 'Underlaget för uppdelningen behöver kontrolleras.' : 'Underlag för uppdelningen saknas.';
  return <section className={styles.chartPanel} aria-label={group.title}>
    <Inline gap={3} className={styles.between}>
      <Heading as="h3" size="subsection" className={styles.panelHeading}>{group.title}</Heading>
      <Text size="xs" tone="secondary">{scale.label}</Text>
    </Inline>
    <div className={styles.cashHeadline}>
      <Metric label={headline} value={position.netDebt === null ? null : Math.abs(position.netDebt) / scale.divisor} />
      {position.basis && <Text size="xs" tone="secondary">{position.basis === 'calculated' ? 'Beräknad · skuld − kassa' : 'Enligt källa'}</Text>}
    </div>
    {bridge.status === 'available' ? <FinancialWaterfall bridge={bridge} name="Nettoskuldsbrygga" latest={latest} scale={scale} currency={currency} source={source} /> : <Stack gap={2}>
      <div className={styles.metrics}>
        <Metric label="Räntebärande skuld" value={Number.isFinite(latest.totalDebt) ? latest.totalDebt / scale.divisor : null} />
        <Metric label="Kassa" value={Number.isFinite(latest.cash) ? latest.cash / scale.divisor : null} />
      </div>
      <Text size="xs" tone="secondary">{problem}</Text>
    </Stack>}
    <details className={styles.original}>
      <summary>Historik och beräkning</summary>
      <Stack gap={3}>
        <NetDebtHistory actual={actual} scale={scale} currency={currency} source={source} />
        <Text size="xs" tone="secondary">Nettoskuld = räntebärande skuld − kassa vid samma periodslut. Ett negativt belopp visas som nettokassa. Total skuld avser räntebärande skuld, inte alla skulder i balansräkningen.</Text>
        <Text size="xs" tone="secondary">Kassa{latest.cashDefinition === 'cash_equivalents' ? ' avser likvida medel och motsvarigheter.' : latest.cashDefinition === 'cash_and_short_term_investments' ? ' inkluderar kortfristiga placeringar.' : ' följer leverantörens definition och kan inkludera kortfristiga placeringar.'} Skulden följer leverantörens avgränsning och kan inkludera leasing. OMXsums beräkning och leverantörens nettoskuld redovisas separat; skillnaden är ingen extra skuldpost. Historiken använder samma definition som den senaste perioden. Saknade komponenter fylls inte ut.</Text>
        <dl className={styles.debtDetails}>
          <dt>Räntebärande skuld</dt><dd>{amount(latest.totalDebt, currency)}</dd>
          <dt>Kassa</dt><dd>{amount(latest.cash, currency)}</dd>
          <dt>Nettoskuld, beräknad</dt><dd>{amount(position.calculated, currency)}</dd>
          <dt>Nettoskuld enligt källa</dt><dd>{amount(reportedFinancialValue(latest, 'netDebt'), currency)}</dd>
        </dl>
        <Text size="xs" tone="secondary">{latest.label}{latest.periodEnd ? ` · ${latest.periodEnd}` : ''} · {financialSource(latest.source ?? source)}</Text>
        {safeSourceUrl(latest.sourceUrl) && <a className={styles.cashSource} href={safeSourceUrl(latest.sourceUrl)} target="_blank" rel="noreferrer">Öppna rapporten ↗</a>}
      </Stack>
    </details>
  </section>;
}

export default function CompanyFinancialOverview({ periods, frequency, currency: declaredCurrency, source, segmentRevenue, geographicRevenue }) {
  const currency = declaredCurrency ?? periods.find(p => p.currency && !p.estimate && p.dataType !== 'estimate')?.currency;
  const actual = researchPeriods(periods, currency, frequency).map(p => ({ ...p, currency: p.currency ?? currency, label: financialPeriodLabel(p),
    ...Object.fromEntries(FINANCIAL_GROUPS.flatMap(group => group.keys).map(key => [key, Number.isFinite(p[key]) ? p[key] : null])),
  }));
  const groups = availableFinancialGroups(actual);
  if (!groups.length && !segmentRevenue && !geographicRevenue) return <Text size="sm" tone="secondary">Inga jämförbara rapporterade siffror finns för perioden.</Text>;
  const comparison = financialComparison(actual, frequency);
  const latest = actual.at(-1);
  const scale = financialScale(actual, currency);
  const sources = [...new Set(actual.map(p => financialSource(p.source ?? source)))];
  const columns = [...new Map(groups.flatMap(group => group.id === 'cash'
    ? [{ key: 'operatingCashFlow', label: 'Från driften' }, { key: 'capitalExpenditure', label: 'Investeringar (capex)' }, { key: 'freeCashFlow', label: 'Fritt kassaflöde enligt källa' }, { key: 'displayFreeCashFlow', label: 'Fritt kassaflöde i grafen' }]
    : group.id === 'result'
      ? [{ key: 'revenue', label: 'Omsättning' }, { key: 'ebit', label: 'EBIT' }, { key: 'netIncome', label: 'Nettoresultat' },
        { key: 'ebitMargin', label: 'EBIT-marginal', numerator: 'ebit' }, { key: 'netMargin', label: 'Nettomarginal', numerator: 'netIncome' }]
      : [...group.keys.map((key, i) => ({ key, label: group.labels[i] })),
        ...(group.id === 'balance' ? [{ key: 'calculatedNetDebt', label: 'Nettoskuld, beräknad' }] : [])])
    .map(column => [column.key, column])).values()];
  return <Stack gap={3} className={styles.financialOverview}>
    <div className={styles.charts}>
      {groups.map(group => {
        const keys = group.keys.filter(key => actual.some(p => p[key] !== null));
        if (group.id === 'cash') return <CashFlowPanel key={group.id} actual={actual} keys={keys} group={group} scale={scale} currency={currency} source={source} comparison={comparison} frequency={frequency} />;
        if (group.id === 'balance') return <NetDebtPanel key={group.id} actual={actual} group={group} scale={scale} currency={currency} source={source} />;
        const result = group.id === 'result';
        const earningsCash = group.id === 'earningsCash';
        return <section key={group.id} className={cx(styles.chartPanel, (result || earningsCash) && styles.resultPanel)} aria-label={group.title}>
          <Inline gap={3} className={styles.between}>
            <Heading as="h3" size="subsection" className={styles.panelHeading}>{group.title}</Heading>
            <Text size="xs" tone="secondary">{scale.label}{result && (comparison.revenue !== null || comparison.ebit !== null || comparison.marginChange !== null) ? ` · förändring mot ${frequency === 'quarterly' ? 'samma kvartal i fjol' : 'föregående år'}` : ''}</Text>
          </Inline>
          <div className={cx(styles.metrics, result && styles.resultMetrics)}>
            {group.keys.map((key, i) => <Metric key={key} label={group.labels[i]} value={latest[key] === null ? null : latest[key] / scale.divisor} change={result ? comparison[key] : null} />)}
            {result && <Metric label={<>EBIT-<wbr />marginal</>} value={comparison.margin} change={comparison.marginChange} percent />}
          </div>
          {result ? <ResultChart actual={actual} scale={scale} currency={currency} source={source} />
            : <FinancialChart actual={actual} keys={keys} group={group} scale={scale} currency={currency} source={source} chartClassName={earningsCash ? styles.comparisonChart : undefined} />}
        </section>;
      })}
      {(segmentRevenue || geographicRevenue) && <div className={cx(styles.charts, styles.resultPanel)}>
        {segmentRevenue && <CompanySegmentRevenue record={segmentRevenue} />}
        {geographicRevenue && <CompanyGeographicRevenue record={geographicRevenue} />}
      </div>}
    </div>
    {groups.length > 0 && <Text size="xs" tone="secondary">{sources.join(' · ')}{frequency === 'ttm' ? ' · R12, beräknat' : ''}</Text>}
    {groups.length > 0 && <details className={styles.original}>
      <summary>Underlag och rapportkällor</summary>
      <Text size="sm" tone="secondary">Belopp i {currency || 'ej angiven valuta'}. Staplarna delar beloppsskala; marginalen har en separat procentaxel. EBIT-marginal = EBIT / omsättning. Nettomarginal = nettoresultat / omsättning. Båda beräknas för samma period, bara med positiv omsättning. Saknade värden fylls inte ut. Estimat visas inte i graferna.</Text>
      {groups.some(group => group.id === 'earningsCash') && <Text size="sm" tone="secondary">Vinst och kassaflöde jämför nettoresultat med kassaflöde från den löpande verksamheten för samma period. Skillnader kan bland annat bero på rörelsekapital och poster som inte påverkar kassan. Grafen visar beloppen utan att betygsätta skillnaden.</Text>}
      {periods.some(p => p.currency && p.currency !== currency) && <Text size="sm" tone="secondary">Perioder med annan rapporteringsvaluta visas inte i dessa grafer.</Text>}
      <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Underlag till graferna, rulla i sidled">
        <table className={styles.sourceTable}>
          <thead><tr><th>Period / källa</th>{columns.map(column => <th key={column.key}>{column.label}</th>)}</tr></thead>
          <tbody>{actual.map(p => <tr key={p.periodKey ?? p.periodEnd ?? p.fiscalPeriod}>
            <th scope="row">{p.label}<small>{financialSource(p.source ?? source)}</small>{safeSourceUrl(p.sourceUrl) && <a href={safeSourceUrl(p.sourceUrl)} target="_blank" rel="noreferrer">Rapport ↗</a>}</th>
            {columns.map(column => <td key={column.key}>{column.numerator ? percent(financialMargin(p, column.numerator)) : amount(column.key === 'calculatedNetDebt' ? netDebtPosition(p).calculated : column.key === 'displayFreeCashFlow' ? cashFlowValue(p) : reportedFinancialValue(p, column.key), currency)}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </details>}
  </Stack>;
}
