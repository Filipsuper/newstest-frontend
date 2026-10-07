"use client";

import { useId, useMemo } from 'react';
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import DonutChart from '../ui/DonutChart';
import StaticCartesian from './StaticCartesian';
import { CHART_SOURCES, chartModel, distributionModel } from '../../utils/chartPresentation';
import styles from './data-charts.module.css';

function ChartFrame({ title, meta, summary, note, children, legend, headingAs: Title = 'h3' }) {
  const titleId = useId();
  return <figure className={styles.frame} aria-labelledby={titleId}>
    <figcaption className={styles.caption}>
      <div><Title id={titleId} className={styles.title}>{title}</Title>{meta && <p>{meta}</p>}</div>
      {summary && <div className={styles.summary}>{summary}</div>}
    </figcaption>
    {legend}
    {children}
    {note && <p className={styles.note}>{note}</p>}
  </figure>;
}

function Marker({ series, bars = false }) {
  return <i aria-hidden="true" className={bars ? styles.barMarker : styles.lineMarker}
    data-source={series.source} style={{ '--chart-color': series.color }} />;
}

function Legend({ series, bars }) {
  return <ul className={styles.legend} aria-label="Grafens serier">{series.map(s => <li key={s.key}>
    <Marker series={s} bars={bars} /><span>{s.label}</span>
  </li>)}</ul>;
}

function Values({ model, title, expanded, rowHeading = 'Period', renderValue, compact }) {
  return <details className={styles.values} open={expanded || undefined}><summary>Visa värden</summary>
    <div className={`${styles.tableWrap} ${compact ? styles.compactValues : ''}`} role="region" aria-label={`${title} · värden`} tabIndex={0}>
      <table><caption className={styles.srOnly}>{title} · {model.exactUnitLabel} · saknade värden är inte noll</caption>
        <thead><tr><th scope="col">{rowHeading}</th>{model.series.map(s => <th key={s.key} scope="col">{s.label}</th>)}</tr></thead>
        <tbody>{model.rows.map(row => <tr key={row.id}><th scope="row">{row.label}</th>{model.series.map(s => <td key={s.key}>{renderValue ? renderValue({ row, series: s, formatted: model.formatExact(row.values[s.key]) }) : model.formatExact(row.values[s.key])}</td>)}</tr>)}</tbody>
      </table>
    </div>
  </details>;
}

function ChartTooltip({ active, payload, model }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return <div className={styles.tooltip}><strong>{row.label}</strong>
    {model.series.filter(s => row.values[s.key] !== null).map(s => <div key={s.key}><Marker series={s} /><span>{s.label}</span><b>{model.formatExact(row.values[s.key])}</b></div>)}
  </div>;
}

function Cartesian({ title, meta, summary, note, rows, series, unit, bars = false, time = false, price = false,
  renderMode = 'interactive', valuesExpanded = false, compactValues = false, rowHeading, renderValue, headingAs, forecastStep, hideValues = false, description }) {
  const id = `chart-${useId().replace(/:/g, '')}`;
  const model = useMemo(() => chartModel({ rows, series, unit, time, zeroBaseline: bars }), [rows, series, unit, time, bars]);
  // A qualified forecast view selects one source per period. Keep those bars
  // centered rather than reserving empty grouped slots for absent sources.
  const exclusiveBars = bars && model.status === 'ready' && model.rows.every(row => Object.values(row.values).filter(value => value !== null).length <= 1);
  const chartData = exclusiveBars ? model.plotted.map(row => ({ ...row, _single: model.series.map(s => row[s.key]).find(value => value !== null) ?? null })) : model.plotted;
  const barFill = s => s.source === 'reported' ? s.color : `url(#${id}-${s.key})`;
  const forecast = model.series.some(s => s.source !== 'reported');
  const tickLabel = value => model.rows.find(row => row.x === value)?.axisLabel ?? model.rows.find(row => row.x === value)?.label ?? '';
  // Show only supplied time observations; never space irregular dates equally.
  const timeTicks = time && model.rows.length ? [...new Set([model.rows[0].x, model.rows[Math.floor((model.rows.length - 1) / 2)].x, model.rows.at(-1).x])] : undefined;
  return <ChartFrame title={title} meta={meta} summary={summary} note={note} headingAs={headingAs}
    legend={model.status === 'ready' && <Legend series={model.series} bars={bars} />}>
    {model.status !== 'ready' ? <div className={styles.empty}>
      <strong>{model.status === 'empty' ? 'Underlag saknas' : 'Underlaget kan inte visas'}</strong>
      <p>{model.status === 'empty' ? 'Saknade värden visas inte som noll.' : 'Grafen behöver jämförbara serier och en angiven enhet.'}</p>
    </div> : <>
      <div className={styles.axisMeta}><span>{model.unitLabel || 'Värde'}</span>{forecast && <span>E = estimat</span>}</div>
      <div className={styles.plot} role="img" aria-label={`${title}. ${bars ? 'Stapeldiagram med nollbaslinje' : price ? 'Kursgraf' : 'Linjediagram'}. ${model.unitLabel}. ${model.series.map(s => s.label).join(', ')}. ${hideValues ? description || 'Grafens sammanfattning visas ovanför grafen.' : 'Exakta värden finns under Visa värden.'}`}>
        {renderMode === 'static' ? <StaticCartesian model={model} bars={bars} time={time} id={id} forecastStep={forecastStep} /> : <ResponsiveContainer width="100%" height="100%"><ComposedChart aria-hidden="true" data={chartData} margin={{ top: 10, right: 14, bottom: 8, left: 0 }} accessibilityLayer={false}>
          <defs>{model.series.filter(s => s.source !== 'reported').map(s => <pattern key={s.key} id={`${id}-${s.key}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform={s.source === 'consensus' ? 'rotate(45)' : undefined}>
            <rect width="6" height="6" fill="var(--ui-surface)" /><line x1="1" x2="1" y1="0" y2="6" stroke={s.color} strokeWidth="2" />
          </pattern>)}</defs>
          <CartesianGrid vertical={false} stroke="var(--ui-border)" strokeDasharray="2 5" />
          <XAxis dataKey={time ? 'x' : 'label'} type={time ? 'number' : 'category'} domain={time ? ['dataMin', 'dataMax'] : undefined}
            ticks={timeTicks} tickFormatter={time ? tickLabel : undefined} interval="preserveStartEnd" minTickGap={24} tickMargin={12} axisLine={false} tickLine={false} height={42} />
          <YAxis width={50} tickCount={4} domain={model.domain.map(value => value / model.scale)} tickFormatter={model.tick} axisLine={false} tickLine={false} />
          {bars && <ReferenceLine y={0} stroke="var(--ui-control-border)" />}
          <Tooltip cursor={bars ? { fill: 'var(--ui-inset)', fillOpacity: .5 } : { stroke: 'var(--ui-control-border)', strokeDasharray: '3 3' }}
            content={<ChartTooltip model={model} />} isAnimationActive={false} />
          {exclusiveBars ? <Bar dataKey="_single" maxBarSize={36} isAnimationActive={false}>{model.rows.map(row => {
            const s = model.series.find(s => row.values[s.key] !== null);
            return <Cell key={row.id} fill={s ? barFill(s) : 'none'} stroke={s?.color} strokeWidth={1} />;
          })}</Bar> : model.series.map(s => bars ? <Bar key={s.key} dataKey={s.key} fill={barFill(s)}
            stroke={s.color} strokeWidth={1} maxBarSize={36} isAnimationActive={false} />
            : <Line key={s.key} type="linear" dataKey={s.key} stroke={s.color} strokeWidth={2.5} strokeDasharray={CHART_SOURCES[s.source].dash}
              dot={price ? false : { r: 3, fill: 'var(--ui-surface)', strokeWidth: 2 }} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />)}
        </ComposedChart></ResponsiveContainer>}
      </div>
      {!hideValues && <Values model={model} title={title} expanded={valuesExpanded} rowHeading={rowHeading} renderValue={renderValue} compact={compactValues && model.series.length === 1} />}
    </>}
  </ChartFrame>;
}

/** Reported prices only: financial estimates must never become a price path. */
export function PriceChart({ rows, currency, title = 'Aktiekurs', meta, note, summary, headingAs, seriesLabel = 'Aktiekurs', compactValues, rowHeading, hideValues = false, description }) {
  return <Cartesian title={title} meta={meta} note={note} summary={summary} rows={rows}
    series={[{ key: 'price', label: seriesLabel, source: 'reported' }]} unit={{ kind: 'money', currency }}
    headingAs={headingAs} compactValues={compactValues} rowHeading={rowHeading} hideValues={hideValues} description={description} time price />;
}

/** Period amounts. Sources for one observation occupy the same period slot. */
export function FinancialBarChart(props) { return <Cartesian {...props} bars />; }

/** All series use one unit and accounting basis, qualified by the feature. */
export function FinancialLineChart(props) { return <Cartesian {...props} time />; }

export function DistributionChart({ title, meta, items, summary, note, center }) {
  const data = distributionModel(items);
  const showDonut = data?.length <= 6 && data.some(row => row.sharePct > 0);
  return <ChartFrame title={title} meta={meta} summary={summary} note={note}>
    {!data ? <div className={styles.empty}><strong>Fördelningsunderlag saknas</strong><p>Andelarna behöver en gemensam, verifierad total.</p></div>
      : <div className={showDonut ? styles.distribution : undefined}>
        {showDonut && <DonutChart series={data} label={`${title}. Exakta andelar finns i listan intill.`}>{center}</DonutChart>}
        <dl className={styles.breakdown}>{data.map(row => <div key={row.key}>
          <dt>{showDonut && <i aria-hidden="true" style={{ background: row.color }} />}{row.label}</dt>
          <dd>{row.sharePct.toLocaleString('sv-SE', { maximumFractionDigits: 2 })} %</dd>
        </div>)}</dl>
      </div>}
  </ChartFrame>;
}
