"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiBarChart2, FiBookOpen, FiList, FiSearch, FiStar, FiX } from "react-icons/fi";
import StockSearch from "./StockSearch";

const LINKS = [
    { href: "/marknaden", label: "Marknad", icon: FiBarChart2 },
    { href: "/bevakning", label: "Bevakning", icon: FiStar },
    { href: "/aktier", label: "Aktier", icon: FiList, companyRoute: true },
    { href: "/nyhetsbrev", label: "Breven", icon: FiBookOpen, relatedRoutes: ["/morgonbrevet", "/kvallsbrevet", "/article/"] },
];

const activeLink = (pathname, link) => link.exact
    ? pathname === link.href
    : pathname === link.href || pathname.startsWith(`${link.href}/`)
        || (link.companyRoute && pathname.startsWith("/aktie/"))
        || link.relatedRoutes?.some((route) => pathname === route || pathname.startsWith(route));

export default function FloatingDock() {
    const pathname = usePathname();
    const [searchOpen, setSearchOpen] = useState(false);
    const dockRef = useRef(null);

    useEffect(() => setSearchOpen(false), [pathname]);

    useEffect(() => {
        if (!searchOpen) return;
        const onKeyDown = (event) => {
            if (event.key === "Escape") setSearchOpen(false);
        };
        const onPointerDown = (event) => {
            if (!dockRef.current?.contains(event.target)) setSearchOpen(false);
        };
        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("mousedown", onPointerDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("mousedown", onPointerDown);
        };
    }, [searchOpen]);

    return (
        <div ref={dockRef} className="mobile-dock">
            {searchOpen && (
                <div className="mobile-dock__search">
                    <div className="mobile-dock__search-heading">
                        <strong>Hitta en aktie</strong>
                        <button type="button" onClick={() => setSearchOpen(false)} aria-label="Stäng sökning">
                            <FiX aria-hidden="true" />
                        </button>
                    </div>
                    <StockSearch
                        autoFocus
                        showSuggestions
                        dropUp
                        placeholder="Bolag eller ticker"
                        fieldClassName="mobile-dock__search-field"
                    />
                </div>
            )}

            <nav aria-label="Snabbmeny">
                <LinkItem link={LINKS[0]} pathname={pathname} />
                <LinkItem link={LINKS[1]} pathname={pathname} />
                <button
                    type="button"
                    className={`mobile-dock__search-button ${searchOpen ? "is-active" : ""}`}
                    onClick={() => setSearchOpen((open) => !open)}
                    aria-expanded={searchOpen}
                >
                    <span><FiSearch aria-hidden="true" /></span>
                    Sök
                </button>
                <LinkItem link={LINKS[2]} pathname={pathname} />
                <LinkItem link={LINKS[3]} pathname={pathname} />
            </nav>
        </div>
    );
}

function LinkItem({ link, pathname }) {
    const Icon = link.icon;
    const active = activeLink(pathname, link);
    return (
        <Link
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={active ? "is-active" : ""}
        >
            <Icon aria-hidden="true" />
            <span>{link.label}</span>
        </Link>
    );
}
