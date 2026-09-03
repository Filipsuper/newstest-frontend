"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiChevronDown, FiExternalLink, FiMenu, FiSettings, FiX } from "react-icons/fi";
import { FaTwitter } from "react-icons/fa";
import { FaBluesky } from "react-icons/fa6";
import { useModal } from "../providers/ModalProvider";
import { useAuthContext } from "../providers/AuthProvider";
import LogInModal from "../modals/logInModal";
import StockSearch from "./StockSearch";
import FloatingDock from "./FloatingDock";

const PRIMARY_LINKS = [
    { href: "/marknaden", label: "Marknaden" },
    { href: "/bevakning", label: "Bevakning" },
    { href: "/aktier", label: "Aktier" },
    { href: "/nyhetsbrev", label: "Breven" },
];

const SECONDARY_LINKS = [
    { href: "/morgonbrevet", label: "Morgonbrevet" },
    { href: "/kvallsbrevet", label: "Kvällsbrevet" },
    { href: "/pro", label: "Plus & Pro" },
    { href: "/om-oss", label: "Om OMXsum" },
];

const isActive = (pathname, link) => {
    if (link.exact) return pathname === link.href;
    if (link.href === "/aktier" && (pathname.startsWith("/aktie/") || pathname.startsWith("/screener"))) return true;
    if (link.href === "/marknaden" && pathname.startsWith("/marknadsnyheter")) return true;
    if (link.href === "/bevakning" && pathname.startsWith("/mina-aktier")) return true;
    if (link.href === "/nyhetsbrev" && ["/morgonbrevet", "/kvallsbrevet", "/article/"].some(
        (route) => pathname === route || pathname.startsWith(route),
    )) return true;
    return pathname === link.href || pathname.startsWith(`${link.href}/`);
};

export default function SiteChrome({ children }) {
    const { openModal } = useModal();
    const { user, isGuestUser } = useAuthContext();
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const loggedIn = Boolean(user) && !isGuestUser;
    const preferenceCount = loggedIn
        ? (user.watchlist?.length ?? 0) + (user.topics?.length ?? 0) + (user.keywords?.length ?? 0)
        : 0;
    const isMarketPage = pathname === "/marknaden"
        || pathname.startsWith("/marknaden/")
        || pathname === "/bevakning"
        || pathname.startsWith("/bevakning/");
    const isTerminalPage = pathname === "/terminal" || pathname.startsWith("/terminal/");

    useEffect(() => {
        setIsMenuOpen(false);
        document.documentElement.classList.toggle("public-palette", !isTerminalPage);
    }, [isTerminalPage, pathname]);

    const handleLogIn = () => openModal(<LogInModal redirectTo={pathname} />);

    return (
        <div className={`site-shell ${isMarketPage ? "site-shell--market" : ""}`}>
            <header className={`site-header ${isMarketPage ? "site-header--market" : ""}`}>
                <div className="site-header__bar">
                    <Link href="/" className="site-logo" aria-label="OMXsum – startsida">
                        <span aria-hidden="true" />
                        <strong>Omxsum</strong>
                    </Link>

                    <nav className="site-header__primary" aria-label="Huvudmeny">
                        {PRIMARY_LINKS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={isActive(pathname, link) ? "page" : undefined}
                                className={isActive(pathname, link) ? "is-active" : ""}
                            >
                                {link.label}
                                {link.href === "/bevakning" && preferenceCount > 0 && (
                                    <span className="site-header__preference-count">{preferenceCount}</span>
                                )}
                            </Link>
                        ))}
                    </nav>

                    <div className="site-header__search">
                        <StockSearch placeholder="Sök aktie eller ticker" showSuggestions />
                    </div>

                    <div className="site-header__account">
                        <Link href="/terminal" className="site-header__terminal">
                            Terminal <FiExternalLink aria-hidden="true" />
                        </Link>
                        {!user ? (
                            <span className="site-header__account-placeholder" aria-hidden="true" />
                        ) : loggedIn ? (
                            <Link href="/settings" className="site-header__settings" aria-label="Inställningar">
                                <FiSettings aria-hidden="true" />
                            </Link>
                        ) : (
                            <button type="button" onClick={handleLogIn} className="site-header__login">
                                Logga in
                            </button>
                        )}
                        <button
                            type="button"
                            className="site-header__menu-button"
                            onClick={() => setIsMenuOpen((open) => !open)}
                            aria-expanded={isMenuOpen}
                            aria-controls="site-menu"
                            aria-label={isMenuOpen ? "Stäng meny" : "Öppna meny"}
                        >
                            {isMenuOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
                        </button>
                    </div>
                </div>

                {isMenuOpen && (
                    <div id="site-menu" className="site-menu">
                        <nav aria-label="Mobilmeny">
                            <div className="site-menu__primary">
                                {PRIMARY_LINKS.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        aria-current={isActive(pathname, link) ? "page" : undefined}
                                        className={isActive(pathname, link) ? "is-active" : ""}
                                    >
                                        {link.label}
                                        {link.href === "/bevakning" && preferenceCount > 0 && (
                                            <span className="site-header__preference-count">{preferenceCount}</span>
                                        )}
                                    </Link>
                                ))}
                            </div>
                            <p><FiChevronDown aria-hidden="true" /> Mer på OMXsum</p>
                            <div className="site-menu__secondary">
                                {SECONDARY_LINKS.map((link) => (
                                    <Link key={link.href} href={link.href}>{link.label}</Link>
                                ))}
                                <Link href="/terminal">Terminal <FiExternalLink aria-hidden="true" /></Link>
                            </div>
                        </nav>
                    </div>
                )}
            </header>

            <div className={`site-content ${isMarketPage ? "site-content--market" : ""}`}>{children}</div>
            <FloatingDock />

            {!isMarketPage && <footer className="site-footer">
                <div>
                    <Link href="/" className="site-logo" aria-label="OMXsum">
                        <span aria-hidden="true" />
                        <strong>Omxsum</strong>
                    </Link>
                    <p>En enklare väg in i den svenska börsen.</p>
                </div>
                <nav aria-label="Sidfot">
                    <Link href="/nyhetsbrev">Nyhetsbreven</Link>
                    <Link href="/borsnyheter">Börsnyheter</Link>
                    <Link href="/om-oss">Om oss</Link>
                    <Link href="/pro">Plus & Pro</Link>
                    <a href="https://blog.omxsum.com">Blogg</a>
                </nav>
                <div className="site-footer__social">
                    <a href="https://x.com/omxsumcom" aria-label="OMXsum på X"><FaTwitter aria-hidden="true" /></a>
                    <a href="https://bsky.app/profile/karlbergg.bsky.social" aria-label="OMXsum på Bluesky"><FaBluesky aria-hidden="true" /></a>
                    <small>© {new Date().getFullYear()} OMXsum</small>
                </div>
            </footer>}
        </div>
    );
}
