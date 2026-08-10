"use client";

import Link from "next/link";
import { FaCheck, FaLock } from "react-icons/fa6";
import { useAuthContext } from "../providers/AuthProvider";
import { useModal } from "../providers/ModalProvider";
import LogInModal from "../modals/logInModal";

// Gates children behind Plus/Pro. Renders a friendly upsell for guests and
// free users instead of the content.
export default function PlusPaywall({ children, redirectTo = "/" }) {
    const { user, isGuestUser, isPlusUser } = useAuthContext();
    const { openModal } = useModal();

    if (!user) {
        return (
            <div className="min-h-[40vh] flex items-center justify-center text-text-muted font-sans">
                Laddar…
            </div>
        );
    }

    if (isPlusUser) {
        return children;
    }

    return (
        <div className="max-w-xl mx-auto my-16 p-8 text-center font-sans">
            <FaLock className="text-3xl text-secondary mx-auto mb-4" />
            <h2 className="text-2xl font-serif font-bold text-text mb-2">Det här ingår i Plus</h2>
            <p className="text-text-muted mb-6">
                Live-nyhetsflödet är en del av Omxsum Plus.
            </p>
            <ul className="flex flex-col gap-2 mb-8 text-left w-fit mx-auto">
                <li className="flex flex-row gap-2 items-center text-sm text-text-article">
                    <FaCheck className="text-primary shrink-0" /> Live-nyhetsflöde i realtid
                </li>
                <li className="flex flex-row gap-2 items-center text-sm text-text-article">
                    <FaCheck className="text-primary shrink-0" /> Finansiell historik och estimat per bolag
                </li>
                <li className="flex flex-row gap-2 items-center text-sm text-text-article">
                    <FaCheck className="text-primary shrink-0" /> Klickbara tickers i nyhetsbreven
                </li>
            </ul>
            {isGuestUser ? (
                <div className="flex flex-col gap-3 items-center">
                    <Link href="/pro" className="primary-btn extra-padding">Se planer – från 49 kr/mån</Link>
                    <button
                        className="text-sm text-text-muted underline cursor-pointer"
                        onClick={() => openModal(<LogInModal redirectTo={redirectTo} />)}
                    >
                        Har du redan Plus? Logga in
                    </button>
                </div>
            ) : (
                <Link href="/pro" className="primary-btn extra-padding">
                    Uppgradera till Plus – 49 kr/mån
                </Link>
            )}
        </div>
    );
}
