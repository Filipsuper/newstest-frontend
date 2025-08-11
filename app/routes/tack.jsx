import React from 'react'
import { useAuthContext } from "../providers/AuthProvider";
import { Link } from "react-router";


export default function tack() {
    const { user } = useAuthContext();

    return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-background">
            <div className="flex flex-col items-center justify-center">
                <h1 className="text-3xl font-bold text-text">Tack{(user.name ?? "")} för din registrering!</h1>
                <p className="text-text-muted mt-4">Hoppas du får användning av <span className="font-bold italic">OMXSUM</span>!</p>
                <Link to="/" className="text-secondary hover:bg-secondary hover:text-background transition-colors duration-500 w-fit border px-4 py-2 border-secondary bg-foreground text-sm md:text-sm hover:cursor-pointer active:text-text mt-4">Börja läsningen</Link>
            </div>
        </div >
    )
}
