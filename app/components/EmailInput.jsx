import React, { useState } from 'react'
import { addEmail } from "../utils/api"

export default function EmailInput() {
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
        } else {
            setMessage("Tillagd!")
        }
    }

    return (
        <>
            <div className="flex flex-col md:flex-row items-center group py-2 md:py-0">
                <span className="text-sm text-text-muted pr-2  flex md:hidden mb-2">Missa inte nästa utskick:</span>
                <form onSubmit={handleSubmit} className="flex flex-row items-center border border-border px-2">
                    <label className="text-xs text-text-muted pr-2 border-r border-border hidden md:flex">Missa inte nästa utskick:</label>
                    <input id="mail" name="mail" className=" text-text-article outline-none px-2 py-1 md:text-sm border-r border-border placeholder:text-gray-800" placeholder="exempel@email.com" />
                    <button type="submit" className="text-secondary bg-foreground text-sm md:text-xs pl-2 hover:cursor-pointer active:text-text" >submit</button>
                </form>
            </div>
            <p className="text-xs text-text-muted mt-2 h-6">{message}</p>
        </>






    )
}
