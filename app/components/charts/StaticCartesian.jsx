import { CHART_SOURCES } from '../../utils/chartPresentation';
import { chartLabelLines, staticChartGeometry } from '../../utils/staticChartGeometry';
import styles from './data-charts.module.css';

// Permanent SVG renderer, not a loading placeholder. Articles retain their
// graph in server HTML and without JavaScript, while using the same chart model.
export default function StaticCartesian({ model, bars, time, id, forecastStep }) {
  const geometry = staticChartGeometry(model, { bars, time, forecastStep });
  const fill = series => series.source === 'reported' ? series.color : `url(#${id}-${series.key})`;
  return <svg className={styles.staticSvg} width="100%" height="232" aria-hidden="true" focusable="false" data-renderer="static">
    <defs>{model.series.filter(series => series.source !== 'reported').map(series => <pattern key={series.key}
      id={`${id}-${series.key}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform={series.source === 'consensus' ? 'rotate(45)' : undefined}>
      <rect width="6" height="6" fill="var(--ui-surface)" /><line x1="1" x2="1" y1="0" y2="6" stroke={series.color} strokeWidth="2" />
    </pattern>)}</defs>
    {geometry.ticks.map((tick, index) => <g key={index}>
      <line x1={`${geometry.left}%`} x2={`${geometry.right}%`} y1={tick.y} y2={tick.y} className={styles.staticGrid} />
      <text x={`${geometry.left - 3}%`} y={tick.y + 4} textAnchor="end">{tick.label}</text>
    </g>)}
    {bars && <line x1={`${geometry.left}%`} x2={`${geometry.right}%`} y1={geometry.zeroY} y2={geometry.zeroY} className={styles.staticZero} />}
    {geometry.columns.map(({ row, series, value, xPct, widthPct, y, height }) => <g key={`${row.id}:${series.key}`}>
      {height > 0 && <rect data-observation={row.id} x={`${xPct}%`} width={`${widthPct}%`} y={y} height={height}
        fill={fill(series)} stroke={series.color} strokeWidth="1"><title>{`${row.label} · ${series.label}: ${model.formatExact(value)}`}</title></rect>}
      {height === 0 && <circle data-observation={row.id} cx={`${row.xPct}%`} cy={y} r="3" fill={series.color}><title>{`${row.label} · ${series.label}: ${model.formatExact(value)}`}</title></circle>}
    </g>)}
    {geometry.transitions.map((segment, index) => <line key={`transition-${index}`} data-forecast-transition={segment.series.key}
      x1={`${segment.x1}%`} x2={`${segment.x2}%`} y1={segment.y1} y2={segment.y2}
      stroke={segment.series.color} strokeWidth="2.5" strokeDasharray={CHART_SOURCES[segment.series.source].dash} />)}
    {geometry.lines.map(({ series, dots, segments }) => <g key={series.key}>
      {segments.map((segment, index) => <line key={index} data-segment={series.key} x1={`${segment.x1}%`} x2={`${segment.x2}%`}
        y1={segment.y1} y2={segment.y2} stroke={series.color} strokeWidth="2.5" strokeDasharray={CHART_SOURCES[series.source].dash} />)}
      {dots.map(dot => <circle key={dot.row.id} data-observation={dot.row.id} cx={`${dot.xPct}%`} cy={dot.y} r="3.5"
        fill="var(--ui-surface)" stroke={series.color} strokeWidth="2"><title>{`${dot.row.label} · ${series.label}: ${model.formatExact(dot.row.values[series.key])}`}</title></circle>)}
    </g>)}
    {geometry.rows.map((row, index) => <text key={row.id} data-period-label={row.id} x={`${row.xPct}%`} y="191"
      textAnchor={time && !row.axisLabel ? index === 0 ? 'start' : index === geometry.rows.length - 1 ? 'end' : 'middle' : 'middle'}>
      {(row.axisLabel?.includes('\n') ? row.axisLabel.split('\n') : chartLabelLines(row.axisLabel ?? row.label)).map((line, index) => <tspan key={index} x={`${row.xPct}%`} dy={index ? 15 : 0}>{line}</tspan>)}
    </text>)}
  </svg>;
}
