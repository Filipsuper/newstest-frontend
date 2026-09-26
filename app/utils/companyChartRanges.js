// One period contract for the chart, URL metadata and share image.
// Week/month windows count stored trading sessions, not weekend calendar days.
export const COMPANY_CHART_RANGES = [
  { id: "1d", label: "1 dag", intraday: true },
  { id: "2d", label: "2 dagar", intraday: true },
  { id: "1w", label: "1 vecka", sessions: 5 },
  { id: "1m", label: "1 mån", shareLabel: "1 månad", sessions: 22 },
  { id: "6m", label: "6 mån", shareLabel: "6 månader", sessions: 130 },
  { id: "1y", label: "1 år", sessions: 260 },
  { id: "3y", label: "3 år", sessions: 780 },
  { id: "5y", label: "5 år", sessions: 1300 },
];

export const companyChartRange = id => COMPANY_CHART_RANGES.find(range => range.id === id)
  ?? COMPANY_CHART_RANGES.find(range => range.id === "1y");

// SVG equivalent of Recharts' linear interpolation for company share images.
// Missing values break the line; never manufacture a smoothed price path.
export function companyChartLinePath(rows, key, x, y) {
  let connected = false;
  return rows.map((row, index) => {
    const value = row[key];
    if (value == null || !Number.isFinite(Number(value))) { connected = false; return ''; }
    const point = [x(index), y(Number(value))];
    if (!point.every(Number.isFinite)) { connected = false; return ''; }
    const command = connected ? 'L' : 'M';
    connected = true;
    return `${command}${point[0].toFixed(1)} ${point[1].toFixed(1)}`;
  }).filter(Boolean).join(' ');
}

export function companyRangeDisabled(range, barCount, priceCapabilities) {
  if (range.intraday) return Boolean(priceCapabilities && priceCapabilities.minute?.status !== "supported");
  // Preserve the longer-history thresholds without the old negative minimum
  // (sessions - 15) accidentally enabling short ranges on an empty chart.
  return barCount < Math.max(2, Math.ceil(Math.min(range.sessions * 0.75, range.sessions - 15)));
}

const validPoint = row => Number.isFinite(row?.time) && row.time > 0
  && Number.isFinite(row?.close) && row.close > 0;

export function companyIntradayRows(payload, rangeId) {
  const twoDays = rangeId === "2d";
  // Never stretch the 1-day context tail and label it a full previous session.
  const previous = twoDays ? payload?.previousFull : payload?.previous;
  return [
    ...(previous ?? []).filter(validPoint).map(row => ({ ...row, date: row.time,
      session: "previous", previousPrice: twoDays ? null : row.close, currentPrice: twoDays ? row.close : null })),
    ...(payload?.current ?? []).filter(validPoint).map(row => ({ ...row, date: row.time,
      session: "current", previousPrice: null, currentPrice: row.close })),
  ].sort((a, b) => a.time - b.time);
}

export function companyIntradayBaseline(payload, rangeId) {
  if (rangeId !== "2d") return payload?.previousClose ?? null;
  if (!payload?.previousFull?.some(validPoint) || !payload?.current?.some(validPoint)) return null;
  return companyIntradayRows(payload, rangeId)[0]?.close ?? null;
}

export function companyIntradayTick(value, rangeId, timezone = "Europe/Stockholm") {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone, ...(rangeId === "2d" ? { day: "numeric", month: "short" } : {}),
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}
