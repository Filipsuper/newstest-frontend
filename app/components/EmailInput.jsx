"use client";

import React, { useId, useState } from 'react'
import { addEmail } from "../utils/api"
import { useModal } from "../providers/ModalProvider"
import OnboardingModal from "./OnboardingModal"

export default function EmailInput({ centered }) {
    const [message, setMessage] = useState()
    const [busy, setBusy] = useState(false)
    const { openModal } = useModal()
    const inputId = useId()

    const validateEmail = (mail) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(mail);
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        e.stopPropagation()
        setMessage("")

        const formData = new FormData(e.target)
        const mail = formData.get("mail")
        const website = formData.get("website")

        if (!validateEmail(mail)) {
            setMessage("Fel format")
            return
        }

        setBusy(true)
        try {
            const res = await addEmail(mail, website)
            if (res.error) {
                setMessage(res.msg)
                return false
            }

            if (res.alreadyVerified) {
                setMessage("Välkommen tillbaka!")
            } else {
                e.target.reset()
                openModal(<OnboardingModal email={mail} />)
            }
            window.sa_event?.("click_email_signup")
        } catch {
            setMessage("Kunde inte ansluta just nu. Försök igen om en stund.")
        } finally {
            setBusy(false)
        }
        return false
    }

    return (
        <>

            <div className="email-signup flex flex-col max-w-md font-sans group py-2 md:py-0">
                {/* <span className={"text-base text-text-article  pr-2 flex mb-2 w-full " + (centered ? "text-center" : "text-start")}>Missa inte nästa utskick:</span> */}
                <form onSubmit={handleSubmit} className="flex flex-row items-center gap-2">
                    {/* Honeypot: hidden from humans, bots auto-fill it and get silently rejected */}
                    <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
                    <label htmlFor={inputId} className="sr-only">E-postadress</label>
                    <input id={inputId} type="email" inputMode="email" autoComplete="email" name="mail" className="email-signup__input border text-text outline-none min-w-0 flex-1 px-4 py-2 md:text-sm border-border placeholder:text-text-muted" placeholder="Din e-postadress" />
                    <button type="submit" disabled={busy} className="email-signup__button text-sm md:text-sm whitespace-nowrap hover:cursor-pointer disabled:cursor-wait disabled:opacity-60">{busy ? "Skickar…" : "Prenumerera"}</button>
                </form>
                <span className="text-sm text-text-muted mt-1">Gör som <span className="underline">+100</span> andra och gå med idag!</span>
                <p className="text-xs text-text-muted mt-2 h-6" role="status" aria-live="polite">{message}</p>
            </div>
        </>






    )
}
