"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuthContext } from "../providers/AuthProvider";

export default function UpgradeSuccessPage() {
    const { user, refreshUser } = useAuthContext();

    // The webhook sets the plan moments after checkout — poll a few times
    useEffect(() => {
        const timers = [1000, 3000, 7000].map((ms) => setTimeout(refreshUser, ms));
        return () => timers.forEach(clearTimeout);
    }, []);

    const planName = user?.plan === "premium" ? "Pro" : user?.plan === "plus" ? "Plus" : null;

    return (
        <main className="public-page public-page--status min-h-[70vh] mx-auto max-w-xl px-4 py-16 text-center font-sans">
            <h1 className="text-4xl font-serif font-bold text-text mb-4">
                {planName ? `Välkommen till ${planName}! 🎉` : "Tack för ditt köp! 🎉"}
            </h1>
            <p className="text-text-muted mb-8">
                Din prenumeration är aktiv{planName ? "" : " inom någon minut"}. Tack för att du stöttar Omxsum –
                det gör det möjligt att fortsätta bygga verktyg för svenska investerare.
            </p>
            <div className="flex flex-col gap-3 items-center">
                <a
                    href="https://terminal.omxsum.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="primary-btn extra-padding"
                >
                    Öppna terminalen →
                </a>
                <Link href="/settings" className="text-sm text-text-muted underline">
                    Hantera din prenumeration i inställningarna
                </Link>
            </div>
        </main>
    );
}
