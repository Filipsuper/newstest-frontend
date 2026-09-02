import { ImageResponse } from "next/og";
import { getArticle } from "../../utils/api";
import { summaryExcerpt } from "../../utils/stripSummaryMarkup";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Omxsum - Dagliga marknadssummeringar";

export default async function Image({ params }) {
    const { id } = await params;
    let article = null;
    try {
        article = await getArticle(id);
    } catch (error) {
        article = null;
    }

    const title = article?.title || "Omxsum";
    const excerpt = article ? summaryExcerpt(article, 220) : "Dagliga marknadssummeringar";
    const omxPrice = article?.omxPrice;
    const omxChangePercentage = article?.omxChangePercentage || "";
    const isNegative = omxChangePercentage.trim().startsWith("-");
    const letterType = article?.isEveningLetter ? "Kvällsbrevet" : "Morgonbrevet";

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    backgroundColor: "#151616",
                    color: "#f3f3ef",
                    padding: "60px 70px",
                    fontFamily: "serif",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", fontSize: 44, fontStyle: "italic", fontWeight: 900 }}>
                        Omxsum
                    </div>
                    <div
                        style={{
                            display: "flex",
                            fontSize: 26,
                            color: article?.isEveningLetter ? "#e5bd5c" : "#86a5ef",
                            border: `2px solid ${article?.isEveningLetter ? "#e5bd5c" : "#86a5ef"}`,
                            padding: "6px 18px",
                        }}
                    >
                        {letterType}
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div
                        style={{
                            display: "flex",
                            fontSize: 58,
                            fontWeight: 900,
                            fontStyle: "italic",
                            lineHeight: 1.15,
                            marginBottom: 28,
                        }}
                    >
                        {title.length > 90 ? title.slice(0, 89) + "…" : title}
                    </div>
                    <div style={{ display: "flex", fontSize: 28, color: "#989b97", lineHeight: 1.4 }}>
                        {excerpt}
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", fontSize: 26, color: "#989b97" }}>omxsum.com</div>
                    {omxPrice ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30 }}>
                            <span style={{ color: "#989b97" }}>OMXS30</span>
                            <span style={{ fontWeight: 700 }}>{omxPrice}</span>
                            <span style={{ color: isNegative ? "#ef716a" : "#62ca88" }}>
                                {omxChangePercentage}
                            </span>
                        </div>
                    ) : null}
                </div>
            </div>
        ),
        { ...size }
    );
}
