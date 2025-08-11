import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import { FaArrowRight } from "react-icons/fa6";
import { Link } from "react-router";
import { FaInfoCircle } from "react-icons/fa";
import { postOnboarding } from "../utils/api";
import { useParams } from "react-router"


const topicOptions = [
    "Bank",
    "Fastigheter",
    "Tech",
    "Råvaror",
    "Makro",
    "Hälsovård",
    "AI",
    "Energi"
]

const frequencyOptions = [
    { key: "Morgonbrev", label: "Morgonbrevet 08:00", description: "Kort analys och nyheter varje morgon kl 08:00" },
    { key: "Kvällsbrev", label: "Kvällsbrevet 17:30", description: "Snabb översikt över dagens rörelser kl 17:30" },
    { key: "Veckobrev", label: "Veckosummeringar", description: "Sammanfattning och insikter varje söndag" },
]


const headlines = [
    "Börsen öppnar starkt efter inflationssiffror",
    "Riksbanken lämnar räntan oförändrad",
    "Apple släpper ny AI-tjänst",
    "Volvo rapporterar rekordvinst",
    "Oljepriset stiger efter opec-besked",
    "ECB signalerar räntepaus",
    "Tesla tappar på svag försäljning i Kina",
    "Swedbank höjer utdelningen"
];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

export default function OnboardingFlow() {
    const params = useParams();

    const [step, setStep] = useState(0);
    const [name, setName] = useState("");
    const [topics, setTopics] = useState([]);
    const [frequency, setFrequency] = useState([]);

    const navigate = useNavigate();

    const toggleTopic = (t) => {
        setTopics(prev =>
            prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
        );
    };

    const canNext =
        (step === 0 && name.trim().length > 0) ||
        (step === 1 && topics.length > 0) ||
        (step === 2 && frequency !== "");

    const handleSubmit = async () => {
        const res = await postOnboarding({ name, topics, frequency });
        // console.log(frequency)
        if (res.error) {
            alert(res.message);
            return;
        }

        window.sa_event("user_onboarding", { topics, frequency });
        navigate("/tack");
    };

    const handleFrequencyChange = (e) => {
        const value = e.target.value;
        setFrequency(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]);
    }

    const FloatingHeadlines = useMemo(() => {
        return headlines.map((title, index) => {
            const direction = Math.random() > 0.5 ? "float-up" : "float-down";
            const duration = getRandomInt(20, 50);
            const delay = index < 3 ? 0 : getRandomInt(3, 15);
            const left = getRandomInt(5, 90);
            const fontSize = getRandomInt(16, 26);
            const opacity = Math.random() * 0.3 + 0.1;
            const top =
                direction === "float-up"
                    ? index < 3 ? "80vh" : "100vh"
                    : index < 3 ? "20vh" : "-100vh";

            return (
                <span
                    key={index}
                    className={direction}
                    style={{
                        animationDuration: `${duration}s`,
                        animationDelay: `${delay}s`,
                        left: `${left}%`,
                        fontSize: `${fontSize}px`,
                        top,
                        opacity,
                        color: "var(--tw-foreground)",
                        position: "absolute",
                        whiteSpace: "nowrap",
                    }}
                >
                    {title}
                </span>
            );
        });
    }, []);

    return (
        <div className="h-screen bg-background flex flex-col justify-center items-center p-4 overflow-hidden">
            <div className="w-full min-h-screen absolute top-0 left-0 bg-gradient-to-b from-background to-background opacity-25 mix-blend-color-multiply overflow-hidden pointer-events-none z-0">
                {FloatingHeadlines}
            </div>
            <div className="flex flex-col justify-between w-full max-w-lg min-h-96 bg-foreground p-8 shadow-md border border-border z-10">
                {step === 0 && (
                    <>
                        <h2 className="text-xl mb-4 font-bold">Vad vill du att vi kallar dig?</h2>
                        <input
                            type="text"
                            placeholder="Förnamn"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full border font-sans border-border p-2"
                        />
                    </>
                )}

                {step === 1 && (
                    <>
                        <div>
                            <h2 className="text-xl font-bold">Hej {name}, vad intresserar dig mest just nu?</h2>
                            <p className="text-text-muted mb-4">Vi använder detta för att utforma artiklarna till just det du vill läsa.</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {topicOptions.map(topic => {
                                const selected = topics.includes(topic);
                                return (
                                    <button
                                        key={topic}
                                        onClick={() => toggleTopic(topic)}
                                        className={`px-3 py-1 border border-secondary text-secondary font-sans ${selected ? "bg-secondary text-white" : ""}
                    }`}
                                    >
                                        {topic}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <div>
                            <h2 className="text-xl font-bold">Hur vill du få dina marknadssummeringar?</h2>
                            <p className="text-text-muted mb-4">Allt finns på webben, men du kan också få nyheterna direkt till din inkorg.</p>
                        </div>

                        <div className="flex flex-col gap-3">
                            {frequencyOptions.map(opt => (
                                <label key={opt.key} className="flex items-center cursor-pointer">
                                    <span className="w-5 h-5 border border-border mr-2 mt-1 flex-shrink-0 flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            name="frequency"
                                            value={opt.key}
                                            className="hidden peer"
                                            checked={frequency.includes(opt.key)}
                                            onChange={handleFrequencyChange}
                                        />
                                        <svg
                                            className="w-6 h-6 text-secondary font-bold hidden peer-checked:block"
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </span>
                                    <span className="font-sans">{opt.label}</span>
                                    <span className="text-text-muted text-sm ml-2 relative group" >
                                        <FaInfoCircle className="inline-block" />
                                        <div className="hidden group-hover:block absolute bg-foreground border border-border text-text-muted text-base p-2 shadow-lg w-48">
                                            <p className="text-xs">{opt.description}</p>
                                        </div>
                                    </span>

                                </label>
                            ))}
                        </div>
                    </>

                )}

                {step === 3 && (
                    <>
                        <h2 className="text-2xl font-semibold mb-6">Snart klar, {name} 👋</h2>



                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-text mb-2">Valda nyhetsbrev</h3>
                            <div className=" text-base font-normal font-sans text-text">
                                {frequency.map(f => {
                                    const opt = frequencyOptions.find(opt => opt.key === f);
                                    return (
                                        <div key={f} className="flex flex-col border border-border bg-background p-2 pb-2 items-start mb-2">
                                            <span className="text-base font-serif font-bold">{opt.label.split(" ")[0]}{" "}<span className="text-sm text-secondary"> • {opt.label.split(" ")[1] ?? "Söndagar"}</span></span>

                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-text mb-2">Med fokus på detta</h3>
                            <div className="flex flex-wrap gap-2 font-sans">
                                {topics.map((topic, index) => (
                                    <span
                                        key={index}
                                        className="text-sm px-3 py-1 border border-secondary bg-secondary text-background font-medium"
                                    >
                                        {topic}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="w-full pt-4 text-sm text-text-muted">
                            Du kan justera dina inställningar när som helst i din profil.
                        </div>
                    </>
                )}

                {/* Navigationsknappar */}
                <div className="mt-8 ">
                    <div className="flex justify-between">
                        {step === 0 && (
                            <Link
                                to="/"
                                className="secondary-btn opacity-70"
                            >
                                Avbryt
                            </Link>
                        )}
                        {step > 0 && (
                            <button
                                onClick={() => setStep(prev => prev - 1)}
                                className="secondary-btn opacity-70"
                            >
                                Tillbaka
                            </button>
                        )}

                        {step < 3 && (
                            <button
                                onClick={() => canNext && setStep(prev => prev + 1)}
                                disabled={!canNext}
                                className="primary-btn ml-auto"
                            >
                                Nästa <FaArrowRight className="inline-block mr-2" />
                            </button>
                        )}

                        {step === 3 && (
                            <button onClick={handleSubmit} className="primary-btn ml-auto">
                                Spara
                            </button>
                        )}
                    </div>

                    <div className="w-full h-1 bg-gray-200 mt-4">
                        <div className="h-1 bg-secondary transition-all" style={{ width: `${(step + 1) * 25}%` }} />
                    </div>
                </div>

            </div>
        </div>
    );
}
