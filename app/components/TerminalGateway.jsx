"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FaArrowRight, FaLock } from "react-icons/fa6";

import { useAuthContext } from "../providers/AuthProvider";
import { useModal } from "../providers/ModalProvider";
import LogInModal from "../modals/logInModal";

export default function TerminalGateway() {
    const { user, isGuestUser, isPlusUser } = useAuthContext();
    const { openModal } = useModal();

    useEffect(() => {
        if (isPlusUser) window.location.replace("/api/auth/terminal-session");
    }, [isPlusUser]);

    if (!user || isPlusUser) {
        return (
            <div className="min-h-[55vh] flex flex-col items-center justify-center gap-3 font-sans">
                <span className="w-3 h-3 rounded-full bg-secondary animate-pulse" />
                <p className="text-text-muted">Öppnar OMXsum Terminal…</p>
            </div>
        );
    }

    return (
        <section className="max-w-2xl mx-auto px-6 py-16 text-center font-sans min-h-[55vh] flex flex-col items-center justify-center">
            <FaLock className="text-3xl text-secondary mb-5" />
            <p className="text-xs font-bold tracking-[0.18em] text-secondary mb-3">OMXSUM TERMINAL</p>
            <h1 className="text-4xl font-serif font-bold text-text mb-4">
                Realtidsterminalen för svenska aktier
            </h1>
            <p className="text-text-muted max-w-xl mb-8">
                Livekurser, nyhetsflöde, movers, finansiella data och intradagsscreening ingår i Plus och Pro.
            </p>

            {isGuestUser ? (
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <button
                        className="primary-btn extra-padding"
                        onClick={() => openModal(<LogInModal redirectTo="/terminal" />)}
                    >
                        Logga in för att fortsätta
                    </button>
                    <Link href="/pro" className="text-sm text-text-muted underline">
                        Se Plus och Pro
                    </Link>
                </div>
            ) : (
                <Link href="/pro" className="primary-btn extra-padding inline-flex items-center gap-2">
                    Uppgradera till Plus <FaArrowRight />
                </Link>
            )}
        </section>
    );
}
