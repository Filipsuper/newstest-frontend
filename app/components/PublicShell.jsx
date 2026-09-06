"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  FiArrowUpRight,
  FiBookOpen,
  FiGrid,
  FiList,
  FiSearch,
  FiSettings,
  FiStar,
  FiSun,
  FiMoon,
} from "react-icons/fi";
import { useAuthContext } from "../providers/AuthProvider";
import { useTheme } from "../providers/ThemeProvider";
import { Button, IconButton } from "./ui/Button";
import { Container, cx } from "./ui/layout";
import { Dialog, Menu } from "./ui/overlays";
import StockSearch from "./StockSearch";
import LogInModal from "../modals/logInModal";
import ui from "./ui/ui.module.css";
import styles from "./public-shell.module.css";

const links = [
  { href: "/marknaden", label: "Marknaden", icon: FiGrid },
  { href: "/bevakning", label: "Bevakning", icon: FiStar },
  { href: "/aktier", label: "Aktier", icon: FiList },
  { href: "/nyhetsbrev", label: "Breven", icon: FiBookOpen },
];
const active = (path, href) =>
  path === href ||
  path.startsWith(`${href}/`) ||
  (href === "/aktier" && path.startsWith("/aktie/")) ||
  (href === "/marknaden" && path.startsWith("/nyhet/")) ||
  (href === "/nyhetsbrev" &&
    ["/morgonbrevet", "/kvallsbrevet", "/article/"].some((prefix) =>
      path.startsWith(prefix),
    ));

export default function PublicShell({ children }) {
  const pathname = usePathname();
  const { user, isGuestUser } = useAuthContext();
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [login, setLogin] = useState(false);
  return (
    <div className={cx(ui.scope, styles.shell)}>
      <a href="#site-main" className={styles.skip}>
        Hoppa till innehållet
      </a>
      <header className={styles.header}>
        <Container className={styles.bar}>
          <Link
            href="/"
            className={styles.logo}
            aria-label="OMXsum – startsida"
          >
            <span aria-hidden="true" />
            OMXsum
          </Link>
          <nav className={styles.navigation} aria-label="Huvudmeny">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active(pathname, link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className={styles.search}>
            <StockSearch
              placeholder="Sök bolag eller ticker"
              showSuggestions
              includeNews
            />
          </div>
          <div className={styles.mobileSearch}>
            <IconButton
              label="Sök bolag och nyheter"
              onClick={() => setSearchOpen(true)}
            >
              <FiSearch aria-hidden="true" />
            </IconButton>
          </div>
          <div className={styles.account}>
            <Link href="/terminal" className={styles.terminal}>
              Terminal <FiArrowUpRight aria-hidden="true" />
            </Link>
            {user && isGuestUser ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setLogin(true)}
              >
                Logga in
              </Button>
            ) : (
              <Menu
                label="Ditt konto"
                trigger={
                  <IconButton label="Konto och inställningar">
                    <FiSettings aria-hidden="true" />
                  </IconButton>
                }
                items={[
                  {
                    id: "settings",
                    label: "Inställningar",
                    render: <Link href="/settings" />,
                  },
                  {
                    id: "watch",
                    label: "Hantera bevakning",
                    render: <Link href="/bevakning/hantera" />,
                  },
                  {
                    id: "theme",
                    label: theme === "dark" ? "Ljust tema" : "Mörkt tema",
                    icon: theme === "dark" ? <FiSun /> : <FiMoon />,
                    onClick: () =>
                      setTheme(theme === "dark" ? "light" : "dark"),
                  },
                  {
                    id: "terminal",
                    label: "Öppna Terminal",
                    render: <Link href="/terminal" />,
                  },
                ]}
              />
            )}
          </div>
        </Container>
      </header>
      <div id="site-main" className={styles.content} tabIndex={-1}>
        {children}
        <footer className={styles.footer}>
          <Container className={styles.footerInner}>
            <span>© {new Date().getFullYear()} OMXsum</span>
            <nav aria-label="Sidfot">
              <Link href="/om-oss">Om OMXsum</Link>
              <Link href="/pro">Plus & Pro</Link>
              <Link href="/nyhetsbrev">Breven</Link>
              <a href="https://blog.omxsum.com">Blogg</a>
            </nav>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              Växla tema
            </Button>
          </Container>
        </footer>
      </div>
      <nav className={styles.bottomNav} aria-label="Snabbmeny">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(pathname, href) ? "page" : undefined}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <Dialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Hitta bolag och nyheter"
      >
        <StockSearch
          showSuggestions
          includeNews
          onNavigate={() => setSearchOpen(false)}
          autoFocus
        />
      </Dialog>
      <Dialog
        open={login}
        onOpenChange={setLogin}
        title="Välkommen till OMXsum"
      >
        <LogInModal redirectTo={pathname} />
      </Dialog>
    </div>
  );
}
