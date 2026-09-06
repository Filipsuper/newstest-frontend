const percentage = new Intl.NumberFormat("sv-SE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

export function changeTone(value) {
  if (!Number.isFinite(value) || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}

export function formatChange(value, fallback = "Saknas") {
  return Number.isFinite(value) ? `${percentage.format(value)} %` : fallback;
}
