import { Inline, Text } from "./ui/layout";
import { stockChartGeometry, stockChartPriceLabel, stockChartSourceLabel } from "../utils/stockChartGeometry";
import styles from "./story-stock-chart.module.css";

const clock = value => new Intl.DateTimeFormat("sv-SE", {
  hour: "2-digit", minute: "2-digit", timeZone: "Europe/Stockholm",
}).format(new Date(value));

export default function StoryStockChart({ chart, now = Date.now() }) {
  const geometry = stockChartGeometry(chart, 640, 220, now);
  if (!geometry) return null;
  const { width, height, plot, points, path, area, marker, singlePoint, ticks } = geometry;
  const date = new Intl.DateTimeFormat("sv-SE", {
    day: "numeric", month: "short", timeZone: "Europe/Stockholm",
    ...(new Date(chart.session.open).getFullYear() !== new Date(now).getFullYear() ? { year: "numeric" } : {}),
  }).format(new Date(chart.session.open));
  const currency = /^[A-Z]{3}$/.test(chart.currency ?? "") ? chart.currency : null;
  const source = stockChartSourceLabel(chart);
  return (
    <figure className={styles.chart} aria-label={`Aktiekurs · ${date}`}>
      <figcaption>
        <Inline className={styles.header} gap={2}>
          <Text as="span" size="sm">Aktiekurs · {date}</Text>
          {(source || currency) && <Text as="span" size="xs" tone="secondary">{[currency, source].filter(Boolean).join(" · ")}</Text>}
        </Inline>
      </figcaption>
      <div className={styles.canvas}>
        <div className={styles.plot}>
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img"
            aria-label={`Aktiekurs ${date}${currency ? ` i ${currency}` : ""}. Senaste observerade kurs ${stockChartPriceLabel(points.at(-1).price, geometry.upper - geometry.lower)} kl. ${clock(points.at(-1).t)}. ${singlePoint ? "En observerad kurs." : "Linjen förbinder observerade priser."}`}>
            {ticks.map(tick => <line key={tick.value} x1={plot.left} x2={plot.right} y1={tick.y} y2={tick.y} stroke="var(--ui-border)" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.5" />)}
            {area && <path d={area} fill="var(--ui-accent)" opacity="0.06" />}
            <path d={path} fill="none" stroke="var(--ui-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {marker?.kind === "publication" && <line x1={marker.x} x2={marker.x} y1={plot.top} y2={plot.bottom}
              stroke="var(--ui-text-secondary)" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />}
            {singlePoint && <circle cx={singlePoint.x} cy={singlePoint.y} r="4" fill="var(--ui-accent)" />}
          </svg>
          {marker && <span className={styles.marker} style={{ left: marker.kind === "before_open" ? "0" : `clamp(0px, ${(marker.x / width) * 100}%, calc(100% - 88px))` }}
            title={`Nyheten publicerades ${clock(marker.t)}`}>
            {marker.kind === "before_open" ? marker.label : `Nyhet · ${clock(marker.t)}`}
          </span>}
        </div>
        <div className={styles.priceAxis} aria-hidden="true">
          <span className={styles.axisSizer}>{ticks.reduce((longest, tick) => tick.label.length > longest.length ? tick.label : longest, "")}</span>
          {ticks.map(tick => <span key={tick.value} style={{ top: `${(tick.y / height) * 100}%` }}>{tick.label}</span>)}
        </div>
        <div className={styles.timeAxis} data-single={points.length === 1 || undefined}>
          <time dateTime={new Date(points.length === 1 ? points[0].t : geometry.start).toISOString()}>{clock(points.length === 1 ? points[0].t : geometry.start)}</time>
          {points.length > 1 && <time dateTime={new Date(points.at(-1).t).toISOString()}>{clock(points.at(-1).t)}</time>}
        </div>
      </div>
    </figure>
  );
}
