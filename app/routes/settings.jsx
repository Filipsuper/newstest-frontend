import React, { useEffect } from 'react';
import { Link, Navigate, useLoaderData } from "react-router";
import { useAuthContext } from "../providers/AuthProvider";
import { saveActiveNewsletters } from '../utils/api';

function settings() {
    const [selectedNewsletters, setSelectedNewsletters] = React.useState([]);
    const { user, isGuestUser, refreshUser, isPaidUser } = useAuthContext();
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
        // { name: "Veckobrev", description: "Sammanfattning och insikter varje fredag", premium: true },
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
        <main className="min-h-[80vh] mx-auto max-w-4xl px-4 py-8">
            <h1 className="text-3xl font-bold  text-text">Inställningar</h1>
            <p className=" text-text-muted mb-8">
                Här kan du justera dina inställningar för att få den bästa upplevelsen av Morgonbrevet.
            </p>

            <section className="max-w-4xl mx-auto rounded-lg mb-12">
                <div className="flex flex-col mb-8">
                    <h2 className="text-xl font-bold mb-4 text-text">Nyhetsbrevstyper</h2>
                    <div className="flex flex-col space-y-4">
                        {newsletterTypes.map((newsletter, index) => (
                            <label key={index} className="inline-flex items-start cursor-pointer border border-border p-4">
                                <input
                                    type="checkbox"
                                    className="hidden peer"
                                    checked={selectedNewsletters.includes(newsletter.name)}
                                    onChange={() => handleNewsletterChange(newsletter.name)}
                                />
                                <span className="w-4 h-4 border border-border mr-2 mt-1 flex-shrink-0 flex items-center justify-center peer-checked:bg-secondary">
                                    <svg className="w-4 h-4 text-background hidden peer-checked:block" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-text font-semibold ">{newsletter.name}<span>{(!isPaidUser && newsletter.premium) && <span className="ml-2 text-background text-xs bg-secondary px-1 py-1">Premium</span>}</span></span>
                                    <span className="text-text-muted text-sm">{newsletter.description}</span>
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

            {/* <section className="max-w-4xl mx-auto border border-border shadow-md p-8 mb-12">
                <h2 className="text-xl font-bold mb-4 text-text">Generera marknadssummeringar när du vill!</h2>
                <Link className="text-primary underline" to="/skanna">Generera </Link>
            </section> */}
        </main>
    )
}

export default settings;