"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSelectedLayoutSegments } from "next/navigation";
import { FiBarChart2, FiBookOpen, FiList, FiSearch, FiSliders, FiStar, FiX } from "react-icons/fi";
import StockSearch from "./StockSearch";
import { PRIMARY_NAVIGATION, isPrimaryNavigationActive, navigationPathname } from "../utils/navigation";
import styles from "./floating-dock.module.css";

const icons = {
    "/marknaden": FiBarChart2,
    "/marknaden/bevakning": FiStar,
    "/aktier": FiList,
    "/aktier/screener": FiSliders,
    "/nyhetsbrev": FiBookOpen,
};
const LINKS = PRIMARY_NAVIGATION.map((link) => ({ ...link, icon: icons[link.href] }));

export default function FloatingDock() {
    const pathname = usePathname();
    const contentSegments = useSelectedLayoutSegments();
    const storySegments = useSelectedLayoutSegments("story");
    const navigationRoute = navigationPathname(pathname, contentSegments, storySegments);
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
        <div ref={dockRef} className={`mobile-dock ${styles.dock}`}>
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

            <nav aria-label="Snabbmeny" className={styles.navigation}>
                {LINKS.map(link => <LinkItem key={link.href} link={link} pathname={navigationRoute} />)}
            </nav>
            <button
                type="button"
                className={styles.searchToggle}
                onClick={() => setSearchOpen((open) => !open)}
                aria-label={searchOpen ? "Stäng sökning" : "Sök bolag"}
                aria-expanded={searchOpen}
            >
                {searchOpen ? <FiX aria-hidden="true" /> : <FiSearch aria-hidden="true" />}
            </button>
        </div>
    );
}

function LinkItem({ link, pathname }) {
    const Icon = link.icon;
    const active = isPrimaryNavigationActive(pathname, link.href);
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
