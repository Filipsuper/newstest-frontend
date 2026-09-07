// Satori has no CSS-variable support. These are the semantic public-site
// values from app/styles/tokens.css, not a separate social-image palette.
import { changeTone, formatChange } from "../../components/ui/format.js";

export const OG_SIZE = { width: 1200, height: 630 };
export const ogThemes = {
  light: {
    canvas: "#f6f5f1",
    text: "#252620",
    secondary: "#62655c",
    inset: "#eeede8",
    accent: "#89610e",
    line: "#d4d5cc",
    positive: "#176e48",
    positiveSoft: "#e3f1e8",
    negative: "#ae3634",
    negativeSoft: "#fae9e5",
  },
  dark: {
    canvas: "#171916",
    text: "#f2f3ed",
    secondary: "#adb3a5",
    inset: "#2b2e27",
    accent: "#ebc467",
    line: "#3b4036",
    positive: "#82cea3",
    positiveSoft: "#25382c",
    negative: "#ef9990",
    negativeSoft: "#3e2b27",
  },
};

export function ogChange(value, theme = "light") {
  const colors = ogThemes[theme];
  const tone = changeTone(value);
  return {
    text: formatChange(value),
    color: tone === "neutral" ? colors.secondary : colors[tone],
    background: tone === "neutral" ? colors.inset : colors[`${tone}Soft`],
  };
}

export function previewText(value, limit) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= limit) return text;
  const shortened = text.slice(0, limit - 1);
  const boundary = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, boundary > limit * 0.7 ? boundary : undefined).trimEnd()}…`;
}

export function ogDate(value, options = {}) {
  if (value == null || value === "") return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleString("sv-SE", {
    timeZone: "Europe/Stockholm",
    day: "numeric",
    month: "short",
    ...options,
  });
}
