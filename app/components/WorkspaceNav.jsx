"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavigationTabs } from "./ui/layout";

const MARKET_LINKS = [
    { href: "/marknaden", label: "Överblick", exact: true },
    { href: "/marknaden/nyheter", label: "Nyhetsflöde" },
    { href: "/marknaden/bevakning", label: "Bevakning" },
];

const STOCK_LINKS = [
    { href: "/aktier", label: "Utforska", exact: true },
    { href: "/aktier/screener", label: "Screener" },
];

const active = (pathname, link) => link.exact
    ? pathname === link.href
    : pathname === link.href || pathname.startsWith(`${link.href}/`);

function WorkspaceNav({ links, label, foundation = false }) {
    const pathname = usePathname();
    if (foundation) {
        return <NavigationTabs label={label}>
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
    return <WorkspaceNav links={MARKET_LINKS} label="Marknaden" foundation={foundation} />;
}

export function StockWorkspaceNav({ foundation = false }) {
    return <WorkspaceNav links={STOCK_LINKS} label="Aktier" foundation={foundation} />;
}

export function WatchWorkspaceNav() {
    return <MarketWorkspaceNav foundation />;
}
