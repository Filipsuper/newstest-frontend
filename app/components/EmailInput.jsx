import React, { useState } from 'react'
import { addEmail } from "../utils/api"

export default function EmailInput({ centered }) {
    const [message, setMessage] = useState()

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

        if (!validateEmail(mail)) {
            setMessage("Fel format")
            return
        }

        const res = await addEmail(mail)
        if (res.error) {
            setMessage(res.msg)
            return false
        }

        setMessage("Tillagd!")
        window.sa_event("click_email_signup")
        return false
    }

    return (
        <>

            <div className="flex flex-col max-w-md  font-sans group py-2 md:py-0">
                {/* <span className={"text-base text-text-article  pr-2 flex mb-2 w-full " + (centered ? "text-center" : "text-start")}>Missa inte nästa utskick:</span> */}
                <form onSubmit={handleSubmit} className="flex flex-row items-center  gap-2">
                    <input id="mail" name="mail" className="border hover:border-white text-text outline-none w-5/6 md:w-full px-4 py-2 md:text-sm border-r border-border placeholder:text-text-muted focus:border-white" placeholder="Din email" />
                    <button type="submit" className="text-secondary hover:bg-secondary hover:text-background transition-colors duration-500 border px-4 py-2 border-secondary bg-foreground text-sm md:text-sm hover:cursor-pointer active:text-text" >Skicka</button>
                </form>
                <span className="text-sm text-text-muted mt-1">Gör som <span className="underline">+100</span> andra och gå med idag!</span>
                <p className="text-xs text-text-muted mt-2 h-6">{message}</p>
            </div>
        </>






    )
}
