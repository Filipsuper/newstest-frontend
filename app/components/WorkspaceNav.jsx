"use client";

import Link from "next/link";
import { NavigationTabs } from "./ui/layout";
import { isPrimaryNavigationActive } from "../utils/navigation";
import { useNavigationPathname } from "./NavigationContext";
import styles from './workspace-nav.module.css';

const MARKET_LINKS = [
    { href: "/marknaden", label: "Överblick", exact: true },
    { href: "/marknaden/nyheter", label: "Nyhetsflöde" },
    { href: "/marknaden/stories", label: "Stories" },
];

const active = (pathname, link) => link.exact
    ? pathname === link.href
    : pathname === link.href || pathname.startsWith(`${link.href}/`);

function WorkspaceNav({ links, label, foundation = false }) {
    const pathname = useNavigationPathname();
    if (foundation) {
        return <NavigationTabs label={label} className={links === MARKET_LINKS ? styles.market : undefined}>
            {links.map(link => <Link key={link.href} href={link.href} aria-current={active(pathname, link) ? "page" : undefined}>{link.label}</Link>)}
        </NavigationTabs>;
    }
    return (
        <nav className="workspace-nav" aria-label={label}>
            {links.map((link) => (
                <Link
                    key={link.href}
                    href={link.href}
                    className={active(pathname, link) ? "is-active" : ""}
                    aria-current={active(pathname, link) ? "page" : undefined}
                >
                    {link.label}
                </Link>
            ))}
        </nav>
    );
}

export function MarketWorkspaceNav({ foundation = false }) {
    const pathname = useNavigationPathname();
    // Mina bolag now has a visible primary entry of its own. Do not place it
    // beneath a second, unrelated Marknaden tab bar, including during loading.
    if (isPrimaryNavigationActive(pathname, "/marknaden/bevakning")) return null;
    return <WorkspaceNav links={MARKET_LINKS} label="Marknaden" foundation={foundation} />;
}

export function StockWorkspaceNav() {
    // Both stock discovery and screening are directly available in the shell.
    // Keep the export for existing consumers without repeating those choices.
    return null;
}

export function WatchWorkspaceNav() {
    return null;
}
