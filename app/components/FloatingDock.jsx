"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiHome, FiInfo, FiMoon, FiSearch, FiSettings, FiStar, FiSunrise, FiTerminal, FiX, FiZap } from "react-icons/fi";
import { useAuthContext } from "../providers/AuthProvider";
import StockSearch from "./StockSearch";

const LINKS = [
    { href: "/", label: "Start", icon: FiHome },
    { href: "/morgonbrevet", label: "Morgonbrevet", icon: FiSunrise },
    { href: "/kvallsbrevet", label: "Kvällsbrevet", icon: FiMoon },
    { href: "/terminal", label: "Terminal", icon: FiTerminal, plus: true },
    // { href: "/pro", label: "Pro", icon: FiZap },
    // { href: "/om-oss", label: "Om oss", icon: FiInfo },
];

export default function FloatingDock({ alwaysVisible = false }) {
    const { user, isGuestUser } = useAuthContext();
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const dockRef = useRef(null);

    useEffect(() => {
        if (alwaysVisible) {
            setVisible(true);
            return undefined;
        }
        let frame = 0;
        const onScroll = () => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                setVisible(window.scrollY > 240);
            });
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
    }, [alwaysVisible]);

    const dockVisible = alwaysVisible || visible;

    useEffect(() => {
        if (!dockVisible) setSearchOpen(false);
    }, [dockVisible]);

    useEffect(() => {
        if (!searchOpen) return;
        const onKey = (event) => { if (event.key === "Escape") setSearchOpen(false); };
        const onClick = (event) => {
            if (!dockRef.current?.contains(event.target)) setSearchOpen(false);
        };
        document.addEventListener("keydown", onKey);
        document.addEventListener("mousedown", onClick);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("mousedown", onClick);
        };
    }, [searchOpen]);

    const item = "relative grid place-items-center w-9 h-9 rounded-full text-text-muted hover:text-text hover:bg-background transition-colors";

    return (
        <div
            ref={dockRef}
            aria-hidden={!dockVisible}
            className={`fixed bottom-5 left-1/2 z-40 -translate-x-1/2 font-sans transition-all duration-300 ease-out ${
                dockVisible ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"
            }`}
        >
            <nav
                aria-label="Snabbmeny"
                className="flex flex-row items-center gap-1 rounded-full bg-foreground p-1.5 shadow-[0_18px_45px_var(--color-shadow)]"
            >
                <div className={`${searchOpen ? "hidden sm:flex" : "flex"} flex-row items-center gap-1`}>
                    {LINKS.map(({ href, label, icon: Icon, plus }) => (
                        <Link
                            key={href}
                            href={href}
                            title={label}
                            aria-label={label}
                            aria-current={pathname === href ? "page" : undefined}
                            className={`${item} ${pathname === href ? "text-text bg-background" : ""}`}
                        >
                            <Icon />
                            {plus && <span className="absolute top-0.5 right-1.5 text-secondary text-[10px] font-bold">+</span>}
                        </Link>
                    ))}

                    {user && !isGuestUser && (
                        <>
                            <Link
                                href="/mina-aktier"
                                title="Mina aktier"
                                aria-label="Mina aktier"
                                className={`${item} ${pathname === "/mina-aktier" ? "text-text bg-background" : ""}`}
                            >
                                <FiStar />
                            </Link>
                            <Link href="/settings" title="Profile" aria-label="Inställningar" className={item}><FiSettings /></Link>
                        </>
                    )}

                    <span className="w-px h-6 mx-1 bg-border shrink-0" />
                </div>

                {searchOpen ? (
                    <div className="flex flex-row items-center gap-1">
                        <div className="w-[min(60vw,260px)]">
                            <StockSearch
                                dropUp
                                autoFocus
                                placeholder="Sök aktie…"
                                fieldClassName="rounded-full bg-background px-3"
                            />
                        </div>
                        <button className={item} title="Stäng sökning" aria-label="Stäng sökning" onClick={() => setSearchOpen(false)}>
                            <FiX />
                        </button>
                    </div>
                ) : (
                    <button className={item} title="Sök aktie" aria-label="Sök aktie" onClick={() => setSearchOpen(true)}>
                        <FiSearch />
                    </button>
                )}
            </nav>
        </div>
    );
}
