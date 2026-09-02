"use client";

import React, { useState } from "react";
import { signUp } from "../utils/api";

export default function LogInModal({ redirectTo = "/" }) {
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

        const response = await signUp(email, redirectTo)

        if (response.error) {
            setMessage(response.message || "Inloggningen kunde inte startas.")
            return false
        }

        if (response.devLoginUrl) {
            setMessage("Öppnar lokal inloggning…")
            window.location.assign(response.devLoginUrl)
            return
        }

        setMessage("Inloggningslänk har skickats till din mail!")
        window.sa_event?.("user_signup")
    }

    return (
        <div className="login-modal flex flex-col items-center justify-center">
            <form className="flex flex-col items-center space-y-4 mt-4 font-sans" onSubmit={handleSubmit}>
                <label className="text-2xl text-text font-bold font-serif pr-2 flex mb-1 w-full text-center">Logga in med din email</label>
                <span className="text-xs text-text-muted mb-4">Du får en inloggningslänk på mailen som du loggar in med</span>
                <input type="email" name="email" placeholder="Skriv in din mail" className="login-modal__input border border-border px-4 py-2 w-full" />
                <button type="submit" className="login-modal__submit primary-btn w-full px-4 py-2 text-sm md:text-sm hover:cursor-pointer">Skicka inloggningslänk</button>
            </form>
            <p className="text-xs text-text-muted mt-2 h-6">{message}</p>
        </div>
    );
}
