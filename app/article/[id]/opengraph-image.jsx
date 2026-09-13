import { ImageResponse } from "next/og";
import { getArticle } from "../../utils/api";
import { letterShareContent } from "../../utils/letterSharing";
import { loadOgFonts } from "../../og/_shared/fonts";
import { OgBrand, OgCanvas, OgChangeBadge } from "../../og/_shared/elements";
import { OG_SIZE, ogThemes } from "../../og/_shared/theme";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "OMXsum – Morgonbrevet och Kvällsbrevet";
const colors = ogThemes.light;

export default async function Image({ params }) {
  const { id } = await params;
  const article = await getArticle(id).catch(() => null);
  const { title, excerpt, edition, date, quote, change } = letterShareContent(article);

  return new ImageResponse(
    (
      <OgCanvas>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, height: 40 }}>
          <OgBrand />
          <div style={{ display: "flex", fontSize: 24, color: colors.accent }}>
            {edition}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 16, paddingTop: 24, paddingBottom: 24 }}>
          {date && (
            <div style={{ display: "flex", fontSize: 24, color: colors.secondary }}>
              {date}
            </div>
          )}
          <div style={{ display: "flex", fontSize: title.length > 110 ? 48 : 58, fontWeight: 600, lineHeight: 1.12, letterSpacing: -1.5 }}>
            {title}
          </div>
          {excerpt && (
            <div style={{ display: "flex", fontSize: 28, color: colors.secondary, lineHeight: 1.4 }}>
              {excerpt}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexShrink: 0, gap: 24 }}>
          <div style={{ display: "flex", fontSize: 24, color: colors.secondary }}>
            omxsum.com
          </div>
          {(quote || change !== null) && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
              <div style={{ display: "flex", fontSize: 20, color: colors.secondary }}>
                Sverige30 · IG, sparat i brevet
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {quote && <div style={{ display: "flex", fontSize: 30, fontWeight: 600 }}>{quote}</div>}
                {change !== null && <OgChangeBadge value={change} />}
              </div>
            </div>
          )}
        </div>
      </OgCanvas>
    ),
    { ...OG_SIZE, fonts: await loadOgFonts() },
  );
}
