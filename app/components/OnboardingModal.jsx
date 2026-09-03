"use client";

import { useState } from "react";
import Link from "next/link";
import { FaEnvelopeOpenText, FaChartLine, FaNewspaper, FaStar } from "react-icons/fa6";
import { useModal } from "../providers/ModalProvider";

export default function OnboardingModal({ email }) {
    const [step, setStep] = useState(1);
    const { closeModal } = useModal();

    return (
        <div className="flex flex-col w-full max-w-sm font-sans">
            {/* Step indicator */}
            <div className="flex flex-row gap-2 mb-6 justify-center">
                {[1, 2].map((s) => (
                    <span key={s} className={`h-1 w-8 ${step >= s ? "bg-secondary" : "bg-border"}`} />
                ))}
            </div>

            {step === 1 && (
                <div className="flex flex-col items-center text-center">
                    <FaEnvelopeOpenText className="text-4xl text-secondary mb-4" />
                    <h2 className="text-2xl text-text font-bold font-serif mb-2">Ett klick kvar!</h2>
                    <p className="text-sm text-text-muted mb-6">
                        Vi har skickat en bekräftelselänk till<br />
                        <span className="text-text font-semibold">{email}</span>
                    </p>
                    <div className="flex flex-col gap-3 w-full text-left bg-border/20 rounded-2xl p-4 mb-6">
                        <div className="flex flex-row gap-3 items-start">
                            <span className="text-secondary font-bold">08:00</span>
                            <p className="text-sm text-text-article">
                                <span className="font-semibold">Morgonbrevet</span> – direkt i din inkorg varje vardag
                            </p>
                        </div>
                        <div className="flex flex-row gap-3 items-start">
                            <span className="text-secondary font-bold">17:30</span>
                            <p className="text-sm text-text-article">
                                <span className="font-semibold">Kvällsbrevet</span> – läses här på sidan varje vardag
                            </p>
                        </div>
                    </div>
                    <p className="text-xs text-text-muted mb-6">Hittar du inget mail? Kolla skräpposten.</p>
                    <button className="primary-btn w-full py-2" onClick={() => setStep(2)}>
                        Nästa
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="flex flex-col items-center text-center">
                    <h2 className="text-2xl text-text font-bold font-serif mb-2">Gör brevet till ditt</h2>
                    <p className="text-sm text-text-muted mb-6">
                        När du bekräftat din mail kan du välja bolag och ämnen att bevaka –
                        helt gratis
                    </p>
                    <div className="flex flex-col gap-3 w-full text-left bg-border/20 rounded-2xl p-4 mb-4">
                        <div className="flex flex-row gap-3 items-center">
                            <FaStar className="text-secondary shrink-0" />
                            <p className="text-sm text-text-article"><span className="font-semibold">Bevakning</span> – följ bolag, marknadshändelser och egna nyckelord</p>
                        </div>
                        <div className="flex flex-row gap-3 items-center">
                            <FaEnvelopeOpenText className="text-secondary shrink-0" />
                            <p className="text-sm text-text-article"><span className="font-semibold">Min sammanfattning</span> – en egen sektion i morgonbrevet med nyheter som matchar dina val</p>
                        </div>
                        <div className="flex flex-row gap-3 items-center">
                            <FaNewspaper className="text-secondary shrink-0" />
                            <p className="text-sm text-text-article"><span className="font-semibold">Nyhetsflödet</span> – marknadsnyheter med <FaChartLine className="inline text-secondary" /> kursreaktion där den kan mätas</p>
                        </div>
                    </div>
                    <p className="text-xs text-text-muted mb-6">
                        Breven är alltid gratis – hela din sammanfattning låses upp med Plus, 49 kr/mån
                    </p>
                    <button
                        className="primary-btn w-full py-2 cursor-pointer"
                        onClick={closeModal}
                    >
                        Klar – jag bekräftar min mail
                    </button>
                </div>
            )}
        </div>
    );
}
