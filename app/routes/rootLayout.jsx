import React, { useContext, useState } from 'react'
import { Link, Outlet } from "react-router"
import EmailInput from "../components/EmailInput"
import { FaTwitter } from "react-icons/fa"
import { FaBluesky, FaPerson } from "react-icons/fa6"
import { useModal } from "../providers/ModalProvider"
import { signUp } from "../utils/api"
import { FaBars } from "react-icons/fa"
import LogInModal from "../modals/logInModal"
import { useAuthContext } from "../providers/AuthProvider"
import { IoIosSettings } from "react-icons/io"

export function meta() {
    return [
        { title: "OMXsum - Dagliga marknadssummeringar" },
        { name: "description", content: "Dagliga marknadssummeringar och viktiga pressmeddelanden från morgonens nyheter – genererade av AI varje dag kl. 08:00. Få en snabb överblick av den svenska börsens nyheter på OMXsum.com." },
    ];
}


export default function rootLayout() {
    const { openModal } = useModal();
    const { user, isGuestUser } = useAuthContext();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleOpenModal = () => {
        openModal(<LogInModal />);
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    if (!user) {
        return
    }

    return (

        <main className="min-h-screen relative overflow-x-hidden ">
            {/* <div className="flex justify-end w-full py-1 px-4  md:px-36 border-b bg-foreground border-border relative z-10">
                <p className="text-secondary">Nytt: Kvällsbrev varje vardag kl 17:30 <a href="https://omxsum.com/kvallsbrevet" className="underline">Kika in!</a></p>
            </div> */}
            <header className="flex justify-center w-full px-4 md:px-10 py-4 bg-foreground border-b border-border mb-8 relative z-10 ">
                <div className="flex w-full md:w-5/6 flex-col md:flex-row  font-sans items-center space-x-2 relative z-10">
                    <div className="flex flex-row space-x-8 justify-between w-full md:w-fit items-center md:mb-0">
                        <Link to="/" className="flex flex-row items-center text-text-article gap-2 pr-4 ">
                            <span className="text-2xl text-text font-serif font-black italic inline">Omxsum </span><span className="bg-secondary text-white font-sans font-bold text-xs px-1 py-1">BETA</span>
                        </Link>
                        <button className="md:hidden text-text-article" onClick={toggleMenu}>
                            <FaBars />
                        </button>
                    </div>
                    <nav className={`${isMenuOpen ? 'flex mt-4' : 'hidden mt-0'} md:flex flex-col md:flex-row  text-text-article space-y-4 md:space-y-0 md:space-x-4 w-full `}>
                        <Link to="/morgonbrevet" className="hover:underline">Morgonbrevet</Link>
                        <Link to="/kvallsbrevet" className="hover:underline">Kvällsbrevet</Link>
                        {/* <Link to="/alla-nyhetsbrev" className="hover:underline">Alla nyhetsbrev</Link> */}
                        <span className="hidden md:inline text-text-muted">|</span>
                        <Link to="/om-oss" className="hover:underline">Om oss</Link>
                        <Link to="/skanna" className="relative hover:underline">
                            <span>Skanna</span>
                            <span className="absolute font-bold -top-1 -right-4 ml-1 px-1 bg-secondary text-white text-xs rounded-full">+</span>
                        </Link>
                        <div className="hidden md:flex flex-grow"></div>
                        {isGuestUser ? (
                            <button className="hover:underline cursor-pointer" onClick={handleOpenModal}>Logga in</button>
                        ) : (
                            <div className="flex flex-row">
                                <Link to="/settings" className="text-xl text-text-muted cursor-pointer md:mr-4" ><IoIosSettings /></Link>
                                <span className="sm:flex md:hidden xl:flex text-sm text-text-muted">{user.email}</span>
                            </div>
                        )}
                    </nav>
                </div>
            </header>
            <Outlet />
            <footer className="w-full mx-auto px-8 py-12 mt-8 flex flex-col md:flex-row items-center space-x-4 relative z-10 bg-foreground border-t border-border">
                <div className="flex flex-row items-center space-x-2 mb-2 md:mb-0">
                    <p className="text-text-muted text-sm border-r border-border pr-2">© 2025 Omxsum</p>
                    <p className="text-text-muted text-sm">Socialt: </p>
                    <Link to="https://x.com/omxtamer" className="text-text-muted"><FaTwitter /></Link>
                    <Link to="https://bsky.app/profile/karlbergg.bsky.social" className="text-text-muted border-r border-border pr-2"><FaBluesky /></Link>
                    {/* <p className="text-text-muted text-sm">Other projects: </p> */}
                    <Link to="https://x.com/omxsumcom" className="text-text-muted underline">Följ oss gärna på twitter!</Link>
                    <p></p>
                </div>
                {/* <EmailInput /> */}
            </footer>
        </main>
    )
}
