"use client";

import { useState } from "react";
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

    const handleOpenModal = () => {
        openModal(<LogInModal />);
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <main className="min-h-screen relative overflow-x-hidden ">
            <header className="flex justify-center w-full px-4 md:px-10 py-4 bg-foreground border-b border-border mb-8 relative z-10 ">
                <div className="flex w-full md:w-5/6 flex-col md:flex-row  font-sans items-center space-x-2 relative z-10">
                    <div className="flex flex-row space-x-8 justify-between w-full md:w-fit items-center md:mb-0">
                        <Link href="/" className="flex flex-row items-center text-text-article gap-2 pr-4 ">
                            <span className="text-2xl text-text font-serif font-black italic inline">Omxsum </span>
                        </Link>
                        <button className="md:hidden text-text-article" onClick={toggleMenu}>
                            <FaBars />
                        </button>
                    </div>
                    <nav className={`${isMenuOpen ? 'flex mt-4' : 'hidden mt-0'} md:flex flex-col md:flex-row  text-text-article space-y-4 md:space-y-0 md:space-x-4 w-full `}>
                        <Link href="/morgonbrevet" className="hover:underline">Morgonbrevet</Link>
                        <Link href="/kvallsbrevet" className="hover:underline">Kvällsbrevet</Link>
                        <Link href="/marknadsnyheter" className="relative hover:underline">
                            <span>Marknadsnyheter</span>
                            <span className="absolute font-bold -top-1 -right-4 ml-1 px-1 bg-secondary text-white text-xs rounded-full">+</span>
                        </Link>
                        <span className="hidden md:inline text-text-muted">|</span>
                        <Link href="/om-oss" className="hover:underline">Om oss</Link>
                        <Link href="/pro" className="text-secondary font-semibold hover:underline">Pro</Link>
                        <div className="hidden md:flex flex-grow"></div>
                        {!user ? null : isGuestUser ? (
                            <button className="hover:underline cursor-pointer" onClick={handleOpenModal}>Logga in</button>
                        ) : (
                            <div className="flex flex-row">
                                <Link href="/mina-aktier" title="Mina aktier" className="text-lg text-text-muted hover:text-secondary cursor-pointer md:mr-3" ><FaRegStar /></Link>
                                <Link href="/settings" className="text-xl text-text-muted cursor-pointer md:mr-4" ><IoIosSettings /></Link>
                                <span className="sm:flex md:hidden xl:flex text-sm text-text-muted">{user.email}</span>
                            </div>
                        )}
                    </nav>
                </div>
            </header>
            {children}
            <footer className="w-full mx-auto px-8 py-12 mt-8 flex flex-col md:flex-row items-center space-x-4 relative z-10 bg-foreground border-t border-border">
                <div className="flex flex-row items-center space-x-2 mb-2 md:mb-0">
                    <p className="text-text-muted text-sm border-r border-border pr-2">© 2025 Omxsum</p>
                    <p className="text-text-muted text-sm">Socialt: </p>
                    <a href="https://x.com/omxtamer" className="text-text-muted"><FaTwitter /></a>
                    <a href="https://bsky.app/profile/karlbergg.bsky.social" className="text-text-muted border-r border-border pr-2"><FaBluesky /></a>
                    <a href="https://blog.omxsum.com" className="text-text-muted border-r border-border pr-2 underline">Blogg</a>
                    <Link href="/borsnyheter" className="text-text-muted border-r border-border pr-2 underline">Börsnyheter</Link>
                    <a href="https://x.com/omxsumcom" className="text-text-muted underline">Följ oss gärna på twitter!</a>
                    <p></p>
                </div>
            </footer>
        </main>
    )
}
