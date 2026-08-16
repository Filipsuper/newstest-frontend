"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiActivity, FiBarChart2, FiHome, FiMoon, FiSearch, FiSettings, FiStar, FiSunrise, FiTerminal, FiX } from "react-icons/fi";
import { useAuthContext } from "../providers/AuthProvider";
import StockSearch from "./StockSearch";

// Shortcut keys fire only outside inputs; they appear in each button's tooltip.
const LINKS = [
    { href: "/", label: "Start", icon: FiHome, key: "h" },
    { href: "/marknadsnyheter", label: "Marknadsnyheter", icon: FiActivity, key: "n", plus: true },
    { href: "/screener", label: "Screener", icon: FiBarChart2, key: "s", plus: true },
    { href: "/morgonbrevet", label: "Morgonbrevet", icon: FiSunrise, key: "m" },
    { href: "/kvallsbrevet", label: "Kvällsbrevet", icon: FiMoon, key: "k" },
    { href: "/terminal", label: "Terminal", icon: FiTerminal, key: "t", plus: true },
];

const USER_LINKS = [
    { href: "/mina-aktier", label: "Mina aktier", icon: FiStar, key: "a" },
    { href: "/settings", label: "Inställningar", icon: FiSettings },
];

// Hover label above a dock item: the name plus its shortcut as a key cap.
function DockTip({ label, shortcut }) {
    return (
        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 z-10 inline-flex flex-row items-center gap-1.5 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] text-text shadow-[0_8px_24px_var(--color-shadow)] opacity-0 scale-95 transition-all duration-100 group-hover:opacity-100 group-hover:scale-100 group-focus-visible:opacity-100">
            {label}
            {shortcut && (
                <kbd className="rounded border border-border bg-background px-1 py-px text-[10px] font-semibold text-text-muted">
                    {shortcut}
                </kbd>
            )}
        </span>
    );
}

export default function FloatingDock({ alwaysVisible = false }) {
    const { user, isGuestUser } = useAuthContext();
    const pathname = usePathname();
    const router = useRouter();
    const [visible, setVisible] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const dockRef = useRef(null);
    const loggedIn = Boolean(user) && !isGuestUser;
    // ⌘ on Apple hardware, Ctrl elsewhere — resolved after mount to stay SSR-safe.
    const [modKey, setModKey] = useState("⌘");
    useEffect(() => {
        if (!/Mac|iPhone|iPad/i.test(navigator.platform ?? "")) setModKey("Ctrl");
    }, []);

    // Global keyboard shortcuts. Navigation keys are plain letters, so they
    // must never fire while the user is typing; search opens on "/" anywhere
    // outside a field and on Cmd/Ctrl+K even inside one.
    useEffect(() => {
        const onKey = (event) => {
            const target = event.target;
            const typing = target instanceof HTMLElement
                && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                setSearchOpen(true);
                return;
            }
            if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
            if (event.key === "/") {
                event.preventDefault();
                setSearchOpen(true);
                return;
            }
            const links = loggedIn ? [...LINKS, ...USER_LINKS] : LINKS;
            const match = links.find((link) => link.key === event.key.toLowerCase());
            if (match) router.push(match.href);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [router, loggedIn]);

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

    // An open search keeps the dock on screen even before the scroll threshold
    // — "/" from the top of a page must land somewhere visible.
    const dockVisible = alwaysVisible || visible || searchOpen;

    useEffect(() => {
        if (!dockVisible) setSearchOpen(false);
    }, [dockVisible]);

    // Landing on a new page closes the search field.
    useEffect(() => {
        setSearchOpen(false);
    }, [pathname]);

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
                    {[...LINKS, ...(loggedIn ? USER_LINKS : [])].map(({ href, label, icon: Icon, plus, key }) => (
                        <Link
                            key={href}
                            href={href}
                            aria-label={label}
                            aria-current={pathname === href ? "page" : undefined}
                            className={`group ${item} ${pathname === href ? "text-text bg-background" : ""}`}
                        >
                            <DockTip label={label} shortcut={key?.toUpperCase()} />
                            <Icon />
                            {plus && <span className="absolute top-0.5 right-1.5 text-secondary text-[10px] font-bold">+</span>}
                        </Link>
                    ))}

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
                        <button className={`group ${item}`} aria-label="Stäng sökning" onClick={() => setSearchOpen(false)}>
                            <DockTip label="Stäng" shortcut="Esc" />
                            <FiX />
                        </button>
                    </div>
                ) : (
                    <button
                        className="group relative flex flex-row items-center gap-2 h-9 pl-2.5 pr-2 rounded-full text-text-muted hover:text-text hover:bg-background transition-colors"
                        aria-label="Sök aktie"
                        onClick={() => setSearchOpen(true)}
                    >
                        <DockTip label="Sök aktie" shortcut="/" />
                        <FiSearch />
                        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">
                            {modKey} K
                        </kbd>
                    </button>
                )}
            </nav>
        </div>
    );
}
