"use client";

import { useState } from "react";
import Link from "next/link";
import { FaTwitter, FaBars } from "react-icons/fa";
import { FaBluesky, FaRegStar } from "react-icons/fa6";
import { IoIosSettings } from "react-icons/io";
import { useModal } from "../providers/ModalProvider";
import { useAuthContext } from "../providers/AuthProvider";
import LogInModal from "../modals/logInModal";
import StockSearch from "./StockSearch";

export default function SiteChrome({ children }) {
    const { openModal } = useModal();
    const { user, isGuestUser } = useAuthContext();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleOpenModal = () => {
        openModal(<LogInModal />);
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const navLink = "text-text-muted hover:text-text transition-colors";

    return (
        <main className="min-h-screen relative overflow-x-hidden">
            <header className="w-full px-4 pt-4 mb-8 relative z-10">
                <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex flex-col md:flex-row font-sans md:items-center gap-x-5 relative z-10">
                    <div className="flex flex-row justify-between w-full md:w-fit items-center">
                        <Link href="/" className="flex flex-row items-center gap-3 pr-2">
                            <span className="w-4 h-4 rounded-full bg-secondary shrink-0"></span>
                            <span className="text-xl text-text font-serif font-black italic inline">Omxsum</span>
                        </Link>
                        <button className="md:hidden text-text-article" onClick={toggleMenu}>
                            <FaBars />
                        </button>
                    </div>
                    <div className="hidden xl:block w-56 shrink-0">
                        <StockSearch placeholder="Sök aktie…" />
                    </div>
                    <nav className={`${isMenuOpen ? 'flex mt-4' : 'hidden mt-0'} md:flex flex-col md:flex-row text-sm space-y-4 md:space-y-0 md:space-x-5 w-full md:items-center pb-2 md:pb-0`}>
                        <div className="md:hidden w-full">
                            <StockSearch placeholder="Sök aktie…" />
                        </div>
                        <Link href="/morgonbrevet" className={navLink}>Morgonbrevet</Link>
                        <Link href="/kvallsbrevet" className={navLink}>Kvällsbrevet</Link>
                        <Link href="/terminal" className={`relative ${navLink}`}>
                            <span>Terminal</span>
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
                                <Link href="/settings" title="Inställningar" className="text-xl text-text-muted hover:text-text transition-colors cursor-pointer"><IoIosSettings /></Link>
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
