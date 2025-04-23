import React, { useState } from 'react'
import { FaTwitter, FaLink, FaShareAlt } from "react-icons/fa";

export default function ShareArticleComponent({ title }) {
    const [copySuccess, setCopySuccess] = useState("");
    const parseTitleForUrl = (title) => {
        return title.replaceAll("-", "_").replaceAll(" ", "-")
    }

    const articleUrl = "https://omxsum.com/article/" + parseTitleForUrl(title)

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
        <div className="flex flex-row gap-4">
            <h2 className="text-xl font-serif font-black text-text italic ">
                Dela artiklen
            </h2>
            <div className="flex flex-row gap-4">
                <button
                    onClick={nativeShare}
                    aria-label="Dela artikel"
                    title="Dela artikel"
                    className="primary-btn "
                    type="button"
                >
                    <FaShareAlt />
                </button>
                <button
                    onClick={shareOnTwitter}
                    aria-label="Dela på Twitter"
                    title="Dela på Twitter"
                    className="primary-btn  "
                    type="button"
                >
                    <FaTwitter />
                </button>
                <button
                    onClick={copyToClipboard}
                    aria-label="Kopiera länk"
                    title="Kopiera länk"
                    className=" primary-btn "
                    type="button"
                >
                    <FaLink />
                </button>
                {copySuccess && <span className="self-center text-green-500 ml-2">{copySuccess}</span>}
            </div>
        </div>
    )
}
