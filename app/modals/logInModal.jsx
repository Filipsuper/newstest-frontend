import React, { useState } from "react";
import { signUp } from "../utils/api";

export default function LogInModal() {
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

        const response = await signUp(email)

        if (response.error) {
            setMessage(response.message)
            return false
        }

        setMessage("Inloggnings länk har skickats till din mail!")
        window.sa_event("user_signup")
    }

    return (
        <div className="flex  flex-col items-center justify-center">
            <form className="flex flex-col items-center space-y-4 mt-4 font-sans" onSubmit={handleSubmit}>
                <input type="email" name="email" placeholder="Skriv in din mail" className="border border-border px-4 py-2 w-full" />
                <button type="submit" className=" text-secondary hover:bg-secondary hover:text-background transition-colors duration-500 w-full border px-4 py-2 border-secondary bg-foreground text-sm md:text-sm hover:cursor-pointer active:text-text">Skapa konto</button>
            </form>
            <p className="text-xs text-text-muted mt-2 h-6">{message}</p>
        </div>
    );
}