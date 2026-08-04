"use client";

import { useState } from "react";
import Link from "next/link";
import { FaEnvelopeOpenText, FaChartLine, FaNewspaper, FaMagnifyingGlassChart } from "react-icons/fa6";
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
                    <div className="flex flex-col gap-3 w-full text-left border border-border p-4 mb-6">
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
                    <h2 className="text-2xl text-text font-bold font-serif mb-2">Medan du väntar… 📈</h2>
                    <p className="text-sm text-text-muted mb-6">
                        OMXsum är mer än breven – vi bevakar börsen åt dig, hela dagen
                    </p>
                    <div className="flex flex-col gap-3 w-full text-left border border-border p-4 mb-4">
                        <div className="flex flex-row gap-3 items-center">
                            <FaNewspaper className="text-secondary shrink-0" />
                            <p className="text-sm text-text-article"><span className="font-semibold">Marknadsnyheter</span> – pressmeddelanden och insynshandel live, på svenska</p>
                        </div>
                        <div className="flex flex-row gap-3 items-center">
                            <FaChartLine className="text-secondary shrink-0" />
                            <p className="text-sm text-text-article"><span className="font-semibold">Kursreaktioner</span> – se hur mycket aktien rört sig efter varje nyhet</p>
                        </div>
                        <div className="flex flex-row gap-3 items-center">
                            <FaMagnifyingGlassChart className="text-secondary shrink-0" />
                            <p className="text-sm text-text-article"><span className="font-semibold">Aktieöversikter</span> – kurs, finanser och nyheter för 870+ svenska aktier</p>
                        </div>
                    </div>
                    <p className="text-xs text-text-muted mb-6">
                        Ingår i Plus från 49 kr/mån – breven är alltid gratis
                    </p>
                    <Link
                        href="/marknadsnyheter"
                        onClick={closeModal}
                        className="primary-btn w-full py-2 text-center mb-2"
                    >
                        Utforska Marknadsnyheter →
                    </Link>
                    <button
                        className="text-sm text-text-muted hover:text-text cursor-pointer py-1"
                        onClick={closeModal}
                    >
                        Klar
                    </button>
                </div>
            )}
        </div>
    );
}
