import React, { useEffect } from 'react';
import { Link, Navigate, useLoaderData } from "react-router";
import { useAuthContext } from "../providers/AuthProvider";
import { saveActiveNewsletters } from '../utils/api';
import { useTheme } from "../providers/ThemeProvider";
import { FaArrowRight } from "react-icons/fa";
import { FaArrowRightLong } from "react-icons/fa6";
const API_URL = import.meta.env.VITE_API_URL;

function settings() {
    const [selectedNewsletters, setSelectedNewsletters] = React.useState([]);
    const { user, isGuestUser, refreshUser, isPaidUser } = useAuthContext();
    const { theme, setTheme } = useTheme();
    const [isChanged, setIsChanged] = React.useState(false);


    if (!user) return

    if (isGuestUser) return <Navigate to="/" />;


    useEffect(() => {
        setSelectedNewsletters(user.active_newsletters)
    }, [user])

    useEffect(() => {
        setIsChanged(!compareArrays(selectedNewsletters, user.active_newsletters));
    }, [selectedNewsletters]);

    const newsletterTypes = [
        { name: "Morgonbrev", description: "Kort analys och nyheter varje morgon kl 08:00", premium: false },
        { name: "Veckobrev", description: "Sammanfattning och insikter varje söndag", premium: true },
        // { name: "Kvällsbrev", description: "Snabb översikt över dagens rörelser kl 17:00", premium: true },
    ];

    const compareArrays = (arr1, arr2) => {
        if (arr1.length !== arr2.length) return false;
        for (let i = 0; i < arr1.length; i++) {
            if (!arr2.includes(arr1[i])) return false;
        }
        return true;
    }

    const handleNewsletterChange = (newsletter) => {
        setSelectedNewsletters(prev =>
            prev.includes(newsletter)
                ? prev.filter(n => n !== newsletter)
                : [...prev, newsletter]
        );
    }

    const handleSave = async () => {
        const res = await saveActiveNewsletters(selectedNewsletters);
        await refreshUser();
    }



    return (
        <main className=" min-h-[80vh] mx-auto max-w-4xl px-4 py-8">
            <h1 className="text-3xl font-bold  text-text mb-12">Inställningar</h1>

            <section className="max-w-4xl mx-auto mb-12 border p-8 border-border shadow-md ">
                <h2 className="text-xl font-bold text-text mb-4">Konto</h2>
                <div className="inline-flex gap-2 body-text mb-4">
                    <span>För att ändra eller ta bort ditt konto, </span><a href="mailto:filipkarlberg1@gmail.com" className="text-primary underline">kontakta oss</a>
                </div>
                <div className="flex flex-col body-text mb-4">
                    <span className="text-base font-bold font-serif mb-4">Email</span>
                    <span className="text-text-muted">{user.email}</span>
                </div>
                <div className="flex flex-col body-text ">
                    <span className="text-base font-bold font-serif mb-4">Ljust läge</span>
                    <div className="flex flex-col items-start justify-between">
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="relative inline-flex items-center h-6 border border-border w-11 "
                        >
                            <span
                                className={`${theme === 'light' ? 'translate-x-6' : 'translate-x-1'
                                    } inline-block w-4 h-4 transform bg-secondary transition-transform`}
                            />
                        </button>
                    </div>
                </div>
            </section>

            <section className="max-w-4xl mx-auto rounded-lg mb-12">
                <div className="flex flex-col mb-8">
                    <h2 className="text-xl font-bold text-text">Nyhetsbrevstyper</h2>
                    <p className="body-text mb-4">
                        Välj vilka nyhetsbrev du vill prenumerera på
                    </p>
                    <div className="flex flex-col space-y-4">
                        {newsletterTypes.map((newsletter, index) => (
                            <label key={index} className="inline-flex items-center cursor-pointer border border-border p-4 gap-2 shadow-md">
                                {(!newsletter.premium || user.plan === "premium") && <span className="w-5 h-5  border border-border mr-2 mt-1 flex-shrink-0 flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        className="hidden peer"
                                        checked={selectedNewsletters.includes(newsletter.name)}
                                        onChange={() => handleNewsletterChange(newsletter.name)}
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
                                </span>}
                                <div className="flex flex-col">
                                    <span className="text-text font-semibold ">{newsletter.name}<span>{(!isPaidUser && newsletter.premium) && <span className="ml-2 text-background text-xs bg-secondary px-1 py-1">Premium</span>}</span></span>
                                    <span className="text-text-muted text-sm body-text">{newsletter.description}</span>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
                {
                    isChanged &&
                    <button className="secondary-btn" onClick={handleSave}>Spara</button>
                }

            </section>
            <section className="max-w-4xl mx-auto border border-border shadow-md p-8 mb-12">
                <h2 className="text-xl font-bold text-text">Prenumeration</h2>
                <p className="body-text mb-4">
                    Hanter din prenumeration och fakturering.
                </p>
                <div className="flex flex-col mb-4">
                    <span className="text-base font-bold font-serif ">Plan</span>
                    <span className="font-bold text-xl text-secondary    ">{user.plan === "premium" ? "Premium" : "Gratis"}</span>
                </div>
                <form action={API_URL + "/stripe/create-portal-session"} method="POST">
                    <button id="checkout-and-portal-button" type="submit" className="font-sans text-primary cursor-pointer ">
                        Hantera prenumeration <FaArrowRightLong className="inline-flex ml-2 text-xs" />
                    </button>
                </form>
            </section>

            {/* <section className="max-w-4xl mx-auto border border-border shadow-md p-8 mb-12">
                <h2 className="text-xl font-bold mb-4 text-text">Generera marknadssummeringar när du vill!</h2>
                <Link className="text-primary underline" to="/skanna">Generera </Link>
            </section> */}
        </main >
    )
}

export default settings;