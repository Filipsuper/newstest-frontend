"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FaTwitter, FaBars } from "react-icons/fa";
import { FaBluesky, FaRegStar } from "react-icons/fa6";
import { IoIosSettings } from "react-icons/io";
import { useModal } from "../providers/ModalProvider";
import { useAuthContext } from "../providers/AuthProvider";
import LogInModal from "../modals/logInModal";

export default function SiteChrome({ children }) {
    const { openModal } = useModal();
    const { user, isGuestUser } = useAuthContext();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEvening, setIsEvening] = useState(false);

    // Warm sunrise tint during the day, cool dusk tint in the evening.
    // Set after mount so server and client markup always match.
    useEffect(() => {
        const hour = new Date().getHours();
        setIsEvening(hour >= 17 || hour < 5);
    }, []);

    const handleOpenModal = () => {
        openModal(<LogInModal />);
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const navLink = "text-stone-400 hover:text-white transition-colors";

    return (
        <main className="min-h-screen relative overflow-x-hidden">
            <header className="w-full px-4 pt-4 mb-8 sticky top-0 z-50">
                <div className={`max-w-5xl mx-auto ${isEvening ? "bg-[#151c2c]" : "bg-[#281e13]"} transition-colors duration-700 ${isMenuOpen ? "rounded-3xl" : "rounded-full"} px-4 md:px-6 py-3 flex flex-col md:flex-row font-sans md:items-center gap-x-5 relative z-10`}>
                    <div className="flex flex-row justify-between w-full md:w-fit items-center">
                        <Link href="/" className="flex flex-row items-center gap-3 pr-2">
                            <span className="w-4 h-4 rounded-full bg-secondary shrink-0"></span>
                            <span className="text-xl text-white font-serif font-black italic inline">Omxsum</span>
                        </Link>
                        <button className="md:hidden text-stone-300" onClick={toggleMenu}>
                            <FaBars />
                        </button>
                    </div>
                    <nav className={`${isMenuOpen ? 'flex mt-4' : 'hidden mt-0'} md:flex flex-col md:flex-row text-sm space-y-4 md:space-y-0 md:space-x-5 w-full md:items-center pb-2 md:pb-0`}>
                        <Link href="/morgonbrevet" className={navLink}>Morgonbrevet</Link>
                        <Link href="/kvallsbrevet" className={navLink}>Kvällsbrevet</Link>
                        <Link href="/marknadsnyheter" className={`relative ${navLink}`}>
                            <span>Marknadsnyheter</span>
                            <span className="absolute font-bold -top-1 -right-3 px-1 text-secondary text-xs">+</span>
                        </Link>
                        <Link href="/screener" className={`relative ${navLink}`}>
                            <span>Screener</span>
                            <span className="absolute font-bold -top-1 -right-3 px-1 text-secondary text-xs">+</span>
                        </Link>
                        <Link href="/om-oss" className={navLink}>Om oss</Link>
                        <Link href="/pro" className={navLink}>Pro</Link>
                        <div className="hidden md:flex flex-grow"></div>
                        {!user ? null : isGuestUser ? (
                            <button
                                className="bg-secondary text-white font-bold rounded-full px-5 py-2 cursor-pointer hover:brightness-110 transition-all w-fit"
                                onClick={handleOpenModal}
                            >
                                Logga in
                            </button>
                        ) : (
                            <div className="flex flex-row items-center gap-4">
                                <Link href="/settings" title="Inställningar" className="text-xl text-stone-400 hover:text-white transition-colors cursor-pointer"><IoIosSettings /></Link>
                                <Link
                                    href="/mina-aktier"
                                    className="bg-secondary text-white font-bold rounded-full px-5 py-2 hover:brightness-110 transition-all inline-flex items-center gap-2 w-fit"
                                >
                                    <FaRegStar /> Mina aktier
                                </Link>
                            </div>
                        )}
                    </nav>
                </div>
            </header>
            {children}
            <footer className="w-full mx-auto px-8 py-12 mt-16 flex flex-col md:flex-row items-center relative z-10">
                <div className="flex flex-row flex-wrap items-center justify-center gap-4 mb-2 md:mb-0">
                    <p className="text-text-muted text-sm">© 2025 Omxsum</p>
                    <p className="text-text-muted text-sm">Socialt:</p>
                    <a href="https://x.com/omxtamer" className="text-text-muted"><FaTwitter /></a>
                    <a href="https://bsky.app/profile/karlbergg.bsky.social" className="text-text-muted"><FaBluesky /></a>
                    <a href="https://blog.omxsum.com" className="text-text-muted underline">Blogg</a>
                    <Link href="/borsnyheter" className="text-text-muted underline">Börsnyheter</Link>
                    <a href="https://x.com/omxsumcom" className="text-text-muted underline">Följ oss gärna på twitter!</a>
                </div>
            </footer>
        </main>
    )
}
