"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FaChartLine, FaNewspaper, FaMagnifyingGlassChart, FaXTwitter } from "react-icons/fa6";
import { confirmSubscription } from "../utils/api";

export default function ConfirmSubscriptionPage() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [status, setStatus] = useState("loading"); // loading | success | error
    const confirmedRef = useRef(false);

    useEffect(() => {
        if (!token) {
            setStatus("error");
            return;
        }
        if (confirmedRef.current) return;
        confirmedRef.current = true;

        confirmSubscription(token)
            .then((res) => setStatus(res.success ? "success" : "error"))
            .catch(() => setStatus("error"));
    }, [token]);

    if (status === "loading") {
        return (
            <main className="min-h-[60vh] flex items-center justify-center text-text-muted font-sans">
                Bekräftar din prenumeration…
            </main>
        );
    }

    if (status === "error") {
        return (
            <main className="min-h-[60vh] mx-auto max-w-xl px-4 py-16 text-center font-sans">
                <h1 className="text-3xl font-serif font-bold text-text mb-4">Länken är ogiltig</h1>
                <p className="text-text-muted mb-8">
                    Länken kan redan vara använd eller ha gått ut. Skriv in din mail igen på startsidan så skickar vi en ny.
                </p>
                <Link href="/" className="primary-btn extra-padding">Till startsidan</Link>
            </main>
        );
    }

    return (
        <main className="min-h-[70vh] mx-auto max-w-2xl px-4 py-16 font-sans">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-serif font-bold text-text mb-3">Du är med! 🎉</h1>
                <p className="text-text-muted">
                    Din prenumeration är bekräftad. Ett välkomstmail är på väg till din inkorg.
                </p>
            </div>

            <div className="border border-border bg-foreground p-6 mb-8">
                <h2 className="text-lg font-serif font-bold text-text mb-4">Vad händer nu?</h2>
                <div className="flex flex-col gap-3">
                    <div className="flex flex-row gap-3 items-start">
                        <span className="text-secondary font-bold shrink-0">08:00</span>
                        <p className="text-sm text-text-article">
                            <span className="font-semibold">Morgonbrevet</span> landar i din inkorg varje vardag – marknadsläget på 3 minuter.
                        </p>
                    </div>
                    <div className="flex flex-row gap-3 items-start">
                        <span className="text-secondary font-bold shrink-0">17:30</span>
                        <p className="text-sm text-text-article">
                            <span className="font-semibold">Kvällsbrevet</span> publiceras här på sidan – <Link href="/kvallsbrevet" className="text-primary underline">läs det här</Link>.
                        </p>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                    <Link href="/morgonbrevet" className="text-primary underline text-sm">
                        Läs dagens morgonbrev redan nu →
                    </Link>
                </div>
            </div>

            <div className="border border-border bg-foreground p-6 mb-8">
                <h2 className="text-lg font-serif font-bold text-text mb-1">Terminalen – vårt gratis aktieverktyg 📈</h2>
                <p className="text-sm text-text-muted mb-4">
                    Följ marknaden i realtid, direkt i webbläsaren.
                </p>
                <div className="flex flex-col gap-3 mb-4">
                    <div className="flex flex-row gap-3 items-center">
                        <FaNewspaper className="text-secondary shrink-0" />
                        <p className="text-sm text-text-article">Live-nyheter från marknaden</p>
                    </div>
                    <div className="flex flex-row gap-3 items-center">
                        <FaChartLine className="text-secondary shrink-0" />
                        <p className="text-sm text-text-article">Realtidsdata för alla aktier</p>
                    </div>
                    <div className="flex flex-row gap-3 items-center">
                        <FaMagnifyingGlassChart className="text-secondary shrink-0" />
                        <p className="text-sm text-text-article">Screener för att hitta nya case</p>
                    </div>
                </div>
                <p className="text-xs text-text-muted mb-4">
                    Helt gratis – och genom att använda den stöttar du Omxsum ❤️
                </p>
                <a
                    href="https://terminal.omxsum.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="primary-btn extra-padding inline-block"
                >
                    Öppna terminalen →
                </a>
            </div>

            <div className="text-center text-sm text-text-muted">
                <a
                    href="https://x.com/omxsumcom"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 hover:text-text underline"
                >
                    <FaXTwitter /> Följ oss på X för uppdateringar
                </a>
            </div>
        </main>
    );
}
