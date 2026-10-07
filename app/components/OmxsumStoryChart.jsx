'use client';

import { storyChartPresentation } from '../utils/storiesCharts';
import { FinancialBarChart, FinancialLineChart } from './charts/DataCharts';
import styles from './charts/data-charts.module.css';

export default function OmxsumStoryChart({ chart, metrics, asOf, onInspectEvidence, headingAs = 'h2' }) {
    const data = storyChartPresentation({ chart, metrics, asOf });
    if (!data) return null;
    const Chart = chart.kind === 'line' ? FinancialLineChart : FinancialBarChart;
    return <Chart {...data} renderMode="static" valuesExpanded compactValues headingAs={headingAs}
        rowHeading={chart.basis === 'history' ? 'Periodslut' : 'Jämförelse'}
        renderValue={({ row, formatted }) => <>{formatted}{onInspectEvidence && <button className={styles.inspectValue}
            onClick={() => onInspectEvidence(metrics.find(metric => metric.key === row.id))}
            aria-label={`Granska underlaget för ${row.label}`}>Underlag ↗</button>}</>} />;
}
