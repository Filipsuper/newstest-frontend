"use client";

import { useState } from "react";
import { FaDownload, FaLink, FaShareAlt, FaTwitter } from "react-icons/fa";

const SHARE_CARD_VERSION = "2";

// Previews the very image that will unfurl when the link is shared: the <img>
// below and the og:image meta tag point at the same /og/aktie URL, so the
// preview cannot drift from the real card. The path deliberately avoids /api,
// which nginx proxies to the backend.
export default function ShareStockModal({ symbol, companyName, rangeId, ma50 = false, ma200 = false }) {
    const [status, setStatus] = useState("");
    const [loaded, setLoaded] = useState(false);

    const origin = typeof window === "undefined" ? "https://omxsum.com" : window.location.origin;
    const movingAverages = [ma50 && "50", ma200 && "200"].filter(Boolean).join(",");
    const movingAverageQuery = movingAverages ? `&ma=${encodeURIComponent(movingAverages)}` : "";
    const imageUrl = `${origin}/og/aktie?symbol=${encodeURIComponent(symbol)}&range=${rangeId}${movingAverageQuery}&v=${SHARE_CARD_VERSION}`;
    const shareUrl = `${origin}/aktie/${encodeURIComponent(symbol)}?range=${rangeId}${movingAverageQuery}&share=${SHARE_CARD_VERSION}&utm_source=share&utm_medium=web&utm_campaign=stock_share`;
    const shareText = "";

    const flash = (message) => {
        setStatus(message);
        setTimeout(() => setStatus(""), 2400);
    };

    const nativeShare = async () => {
        if (!navigator.share) {
            copyLink();
            return;
        }
        try {
            await navigator.share({ title: companyName, text: shareText, url: shareUrl });
        } catch {
            // cancelled
        }
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(`${shareUrl}`);
            flash("Länk kopierad!");
        } catch {
            flash("Kunde inte kopiera länken");
        }
    };

    const shareOnTwitter = () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(url, "_blank", "width=550,height=420");
    };

    const downloadImage = async () => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const href = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = href;
            link.download = `${symbol.replace(".ST", "")}-${rangeId}.png`;
            link.click();
            URL.revokeObjectURL(href);
            flash("Bild nedladdad!");
        } catch {
            flash("Kunde inte ladda ner bilden");
        }
    };

    const action = "flex flex-row items-center justify-center gap-2 border border-border rounded-full px-4 py-2 text-sm text-text-muted hover:text-text hover:border-text-muted transition-colors cursor-pointer";

    return (
        <div className="flex flex-col font-sans w-[min(78vw,520px)]">
            <h2 className="text-xl font-serif font-bold text-text mb-1">Dela {companyName}</h2>
            <p className="text-sm text-text-muted mb-4">Så här ser länken ut när du delar den.</p>

            <div className="relative w-full aspect-[1200/630] rounded-xl overflow-hidden bg-foreground border border-border mb-5">
                {!loaded && (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-text-muted" />
                )}
                <img
                    src={imageUrl}
                    alt={`Delningsbild för ${companyName}`}
                    width={1200}
                    height={630}
                    onLoad={() => setLoaded(true)}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button className={action} onClick={nativeShare}><FaShareAlt /> Dela</button>
                <button className={action} onClick={copyLink}><FaLink /> Kopiera länk</button>
                <button className={action} onClick={shareOnTwitter}><FaTwitter /> Dela på X</button>
                <button className={action} onClick={downloadImage}><FaDownload /> Ladda ner bild</button>
            </div>

            <p className="text-xs text-text-muted mt-3 h-4">{status}</p>
        </div>
    );
}
