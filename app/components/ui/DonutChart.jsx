import { donutSlices } from '../../utils/donut';
import styles from './donut-chart.module.css';

/** Static, server-renderable chart. Its labelled breakdown stays with the caller. */
export default function DonutChart({ series, label, children }) {
  return <div className={styles.chart} role="img" aria-label={label}>
    <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <circle cx="100" cy="100" r="82" fill="none" stroke="var(--ui-inset)" strokeWidth="22" />
      <g transform="rotate(-90 100 100)" fill="none" strokeWidth="22" strokeLinecap="butt">
        {donutSlices(series).map(slice => <circle key={slice.key} data-segment={slice.key}
          cx="100" cy="100" r="82" pathLength="100" stroke={slice.color}
          strokeDasharray={`${slice.sweep} ${100 - slice.sweep}`} strokeDashoffset={-slice.start} />)}
      </g>
    </svg>
    <div className={styles.center}>{children}</div>
  </div>;
}
