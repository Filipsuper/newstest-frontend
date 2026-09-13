import { ImageResponse } from "next/og";

export const SITE_ICON_COLOR = "#ebc467";

export function renderSiteIcon(size) {
  return new ImageResponse(
    <div style={{
      display: "flex", width: "100%", height: "100%",
      alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: size * 26 / 32, height: size * 26 / 32,
        borderRadius: "50%", background: SITE_ICON_COLOR,
      }} />
    </div>,
    { width: size, height: size },
  );
}
