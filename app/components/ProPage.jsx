"use client";

import { useState } from "react";
import { FaCheck } from "react-icons/fa6";
import { useAuthContext } from "../providers/AuthProvider";
import { useModal } from "../providers/ModalProvider";
import { createCheckoutSession } from "../utils/api";
import LogInModal from "../modals/logInModal";

const tiers = [
    {
        id: "free",
        name: "Gratis",
        price: "0 kr",
        description: "Kom igång med dagliga marknadssummeringar",
        features: [
            "Morgonbrevet i inkorgen varje vardag 08:00",
            "Kvällsbrevet på sidan varje vardag 17:30",
            "Aktieöversikter med kursgraf och bolagsnyheter",
            "Terminalen med grunddata",
            "Marknadslägesskannern",
        ],
        cta: null,
    },
    {
        id: "plus",
        name: "Plus",
        price: "49 kr",
        period: "/mån",
        description: "För dig som vill följa nyhetsflödet live",
        features: [
            "Allt i Gratis",
            "Min sammanfattning – personlig sektion i morgonbrevet med dina aktier & ämnen",
            "Marknadsnyheter – live-nyhetsflöde i realtid",
            "Finansiell historik per bolag – omsättning, resultat och marginaler",
            "Analytikerestimat och värdering per bolag",
            "Klickbara tickers i breven",
        ],
        cta: "Uppgradera till Plus",
        badge: "Nyhet",
    },
    {
        id: "pro",
        name: "Pro",
        price: "99 kr",
        period: "/mån",
        description: "Hela terminalen – för den aktiva investeraren",
        features: [
            "Allt i Plus",
            "Realtidsdata för alla aktier",
            "Screener för att hitta nya case",
            "Full tillgång till terminalen",
        ],
        cta: "Uppgradera till Pro",
        badge: "Bäst värde",
        highlight: true,
    },
];

export default function ProPage() {
    const { user, isGuestUser, isPaidUser, isPlusUser } = useAuthContext();
    const { openModal } = useModal();
    const [loadingTier, setLoadingTier] = useState(null);
    const [error, setError] = useState("");

    const handleUpgrade = async (tierId) => {
        setError("");

        if (!user || isGuestUser) {
            openModal(<LogInModal redirectTo="/pro" />);
            return;
        }

        setLoadingTier(tierId);
        try {
            const res = await createCheckoutSession(tierId);
            if (res.url) {
                window.location.href = res.url;
            } else {
                setError(res.error || "Något gick fel, försök igen senare");
            }
        } catch {
            setError("Något gick fel, försök igen senare");
        }
        setLoadingTier(null);
    };

    const ctaLabel = (tier) => {
        if (tier.id === "pro" && isPaidUser) return "Din nuvarande plan";
        if (tier.id === "plus" && isPlusUser) return isPaidUser ? "Ingår i Pro" : "Din nuvarande plan";
        return tier.cta;
    };

    const ctaDisabled = (tier) => {
        if (tier.id === "pro" && isPaidUser) return true;
        if (tier.id === "plus" && isPlusUser) return true;
        return false;
    };

    return (
        <main className="min-h-[80vh] mx-auto max-w-5xl px-4 py-12 font-sans">
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-text mb-3">
                    Mer marknad. <span className="italic">I realtid.</span>
                </h1>
                <p className="text-text-muted max-w-xl mx-auto">
                    Nyhetsbreven är alltid gratis. Med Plus och Pro får du vårt live-nyhetsflöde
                    och terminalens fulla kraft – och du stöttar Omxsums fortsatta utveckling.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {tiers.map((tier) => (
                    <div
                        key={tier.id}
                        className={`flex flex-col p-6 bg-foreground rounded-2xl ${tier.highlight ? "shadow-xl" : "shadow-md"}`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-xl font-serif font-bold text-text">{tier.name}</h2>
                            {tier.badge && (
                                <span className="text-xs bg-secondary text-background px-2 py-0.5 font-bold">{tier.badge}</span>
                            )}
                        </div>
                        <div className="mb-2">
                            <span className="text-3xl font-bold text-text">{tier.price}</span>
                            {tier.period && <span className="text-text-muted text-sm">{tier.period}</span>}
                        </div>
                        <p className="text-sm text-text-muted mb-4">{tier.description}</p>
                        <ul className="flex flex-col gap-2 mb-6 flex-grow">
                            {tier.features.map((feature, idx) => (
                                <li key={idx} className="flex flex-row gap-2 items-start text-sm text-text-article">
                                    <FaCheck className="text-primary shrink-0 mt-1" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        {tier.cta && (
                            <button
                                onClick={() => handleUpgrade(tier.id)}
                                disabled={ctaDisabled(tier) || loadingTier === tier.id}
                                className={`w-full py-2 ${ctaDisabled(tier)
                                    ? "border border-border text-text-muted cursor-default"
                                    : "primary-btn cursor-pointer"}`}
                            >
                                {loadingTier === tier.id ? "Öppnar kassan…" : ctaLabel(tier)}
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {error && <p className="text-center text-red-500 mb-4">{error}</p>}

            <p className="text-center text-xs text-text-muted">
                Betalning via Stripe. Avsluta när du vill i inställningarna – prenumerationen gäller månadsvis.
            </p>
        </main>
    );
}
