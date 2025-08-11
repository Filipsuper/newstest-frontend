import React, { useState } from "react";
import { signUp } from "../utils/api";

const API_URL = import.meta.env.VITE_API_URL;

export default function LogInModal({ isOnboarding }) {
    const [message, setMessage] = React.useState("")

    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const formData = new FormData(e.target);
        const email = formData.get("email");

        if (!email) {
            alert("Please enter an email address.");
            return;
        }

        const redirectTo = isOnboarding ? "/subscribe-after-verify" : "/";

        const response = await signUp({ email, redirectTo })

        if (response.error) {
            setMessage(response.message)
            return false
        }

        setMessage("Inloggningslänk har skickats till din mail!")
        window.sa_event("user_signup")
    }

    return (
        <div className="flex flex-col gap-4 items-center justify-center">
            {/* <img src="/public/omxsum_og.jpg" alt="OMXsum" className="h-96 aspect-square object-cover shadow-xl rounded-md" /> */}
            <form className="flex flex-col items-center space-y-4 mt-4 font-sans" onSubmit={handleSubmit}>
                <label className="text-2xl text-text font-bold font-serif pr-2 flex mb-1 w-full text-center">{isOnboarding ? "Skapa ett konto" : "Logga in med din email"}</label>
                <span className="text-xs text-text-muted mb-4">Du får en inloggningslänk på mailen som du loggar in med</span>
                <input type="email" name="email" placeholder="Skriv in din mail" className="border border-border px-4 py-2 w-full" />
                <button type="submit" className=" text-secondary hover:bg-secondary hover:text-background transition-colors duration-500 w-full border px-4 py-2 border-secondary bg-foreground text-sm md:text-sm hover:cursor-pointer active:text-text">Skicka inloggningslänk</button>
            </form>
            <p className="text-xs text-text-muted mt-2 h-6">{message}</p>
        </div>
    );
}