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
        return false
    }

    return (
        <>

            <div className="flex flex-col  items-center font-sans group py-2 md:py-0">
                <span className={"text-base text-text font-bold font-serif pr-2 flex mb-2 w-full " + (centered ? "text-center" : "text-start")}>Missa inte nästa utskick:</span>
                <form onSubmit={handleSubmit} className="flex flex-row items-center  gap-2">

                    <input id="mail" name="mail" className="border hover:border-white text-text outline-none px-4 py-2 md:text-sm border-r border-border placeholder:text-text-muted focus:border-white" placeholder="exempel@email.com" />
                    <button type="submit" className="text-secondary hover:bg-secondary hover:text-background transition-colors duration-500 border px-4 py-2 border-secondary bg-foreground text-sm md:text-sm hover:cursor-pointer active:text-text" >Skicka</button>
                </form>
                <p className="text-xs text-text-muted mt-2 h-6">{message}</p>
            </div>
        </>






    )
}
