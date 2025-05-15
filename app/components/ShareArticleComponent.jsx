import React, { useState } from 'react'
import { FaTwitter, FaLink, FaShareAlt } from "react-icons/fa";

export default function ShareArticleComponent({ title }) {
    const [copySuccess, setCopySuccess] = useState("");
    const parseTitleForUrl = (title) => {
        return title.replaceAll("-", "_").replaceAll(" ", "-")
    }

    const articleUrl = "https://omxsum.com/article/" + parseTitleForUrl(title) + "?utm_source=share&utm_medium=web&utm_campaign=article_share";


    const shareOnTwitter = () => {
        const text = encodeURIComponent(title);
        const url = encodeURIComponent(articleUrl);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
        window.open(twitterUrl, "_blank", "width=550,height=420");
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(articleUrl);
            setCopySuccess("Länk kopierad!");
            setTimeout(() => setCopySuccess(""), 2000);
        } catch {
            setCopySuccess("Kunde inte kopiera länken");
        }
    };

    const nativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    url: articleUrl,
                });
            } catch (err) {
                // Share cancelled or failed
            }
        } else {
            alert("Dela-funktionen stöds inte i din webbläsare");
        }
    };

    return (
        <div className="flex flex-row gap-4 items-center mb-2">
            <h2 className="hidden md:flex text-xs font-sans text-text italic ">
                Dela artiklen
            </h2>
            <div className="flex flex-row gap-4">
                <button
                    onClick={nativeShare}
                    aria-label="Dela artikel"
                    title="Dela artikel"
                    className="secondary-btn py-1 rounded"
                    type="button"
                >
                    <FaShareAlt />
                </button>
                <button
                    onClick={shareOnTwitter}
                    aria-label="Dela på Twitter"
                    title="Dela på Twitter"
                    className="secondary-btn py-1 rounded"
                    type="button"
                >
                    <FaTwitter />
                </button>
                <button
                    onClick={copyToClipboard}
                    aria-label="Kopiera länk"
                    title="Kopiera länk"
                    className=" secondary-btn py-1 rounded"
                    type="button"
                >
                    <FaLink />
                </button>
                {copySuccess && <span className="self-center font-sans text-xs ml-2 ">{copySuccess}</span>}
            </div>
        </div>
    )
}
