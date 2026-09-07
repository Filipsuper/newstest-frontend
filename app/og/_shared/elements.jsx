import { BRAND_NAME } from "../../utils/brand";
import { ogChange, ogThemes } from "./theme";

// ImageResponse cannot render the CSS/interactive Base UI components. These
// static equivalents share their font, semantic colors and numeric formatter.
export function OgBrand({ theme = "light" }) {
  const colors = ogThemes[theme];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        style={{
          display: "flex",
          width: 12,
          height: 28,
          borderRadius: 6,
          background: colors.accent,
        }}
      />
      <span style={{ fontSize: 32, fontWeight: 600, letterSpacing: -1 }}>
        {BRAND_NAME}
      </span>
    </div>
  );
}

export function OgChangeBadge({ value, theme = "light" }) {
  const change = ogChange(value, theme);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "flex-start",
        flexShrink: 0,
        whiteSpace: "nowrap",
        padding: "10px 16px",
        borderRadius: 12,
        fontSize: 36,
        lineHeight: 1,
        fontWeight: 600,
        letterSpacing: -1,
        color: change.color,
        background: change.background,
      }}
    >
      {change.text}
    </div>
  );
}

export function OgCanvas({ theme = "light", children }) {
  const colors = ogThemes[theme];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: 48,
        background: colors.canvas,
        color: colors.text,
        fontFamily: "Geist",
        fontWeight: 400,
      }}
    >
      {children}
    </div>
  );
}
