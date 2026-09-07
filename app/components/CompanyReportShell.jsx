"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiChevronDown, FiChevronLeft, FiLock } from "react-icons/fi";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/overlays";
import { Container, Heading, Text } from "./ui/layout";
import { ChangeBadge, Skeleton } from "./ui/data";
import { COMPANY_SECTIONS, companySection, companySectionHref } from "../utils/companySections";
import styles from "./company-report.module.css";

const ReportContext = createContext(null);

export function ReportSection({ id, title, children, deferred = false }) {
  const { target } = useContext(ReportContext);
  const node = useRef(null);
  const [ready, setReady] = useState(!deferred);
  useEffect(() => {
    if (ready) return;
    if (target === id || !window.IntersectionObserver) {
      setReady(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setReady(true);
    }, { rootMargin: "240px 0px" });
    observer.observe(node.current);
    return () => observer.disconnect();
  }, [ready, target, id]);
  return (
    <section ref={node} id={id} className={styles.section} data-report-section aria-labelledby={`${id}-heading`}>
      {title && <Heading id={`${id}-heading`} tabIndex={-1} className={styles.sectionHeading}>{title}</Heading>}
      {ready ? children : <div className={styles.deferred} role="group" aria-busy="true" aria-label={`Hämtar ${title}`}><Skeleton /><Skeleton /><Skeleton /></div>}
    </section>
  );
}

export default function CompanyReportShell({ symbol, name, quote, currency = "SEK", hasPlus, initialTab, children }) {
  const main = useRef(null);
  const pendingFocus = useRef(null);
  const readerReturn = useRef(null);
  const pendingAnchor = useRef(null);
  const currentPath = usePathname();
  const [target, setTarget] = useState(companySection(initialTab));
  const [active, setActive] = useState(companySection(initialTab));
  const [contentsOpen, setContentsOpen] = useState(false);
  const pathname = `/aktie/${encodeURIComponent(symbol)}`;

  const goTo = (id, focus = false) => {
    pendingAnchor.current = id;
    setTarget(id);
    setActive(id);
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "instant" });
      if (focus) document.getElementById(`${id}-heading`)?.focus({ preventScroll: true });
    });
  };

  useEffect(() => {
    let frame = 0;
    // Sections adjacent to a jump may finish loading at different times.
    // Keep the chosen heading in place until the reader takes control.
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (pendingAnchor.current && window.location.pathname === pathname && !document.querySelector('[role="dialog"]')) {
          document.getElementById(pendingAnchor.current)?.scrollIntoView({ block: "start", behavior: "instant" });
        }
      });
    });
    observer.observe(main.current.lastElementChild);
    const release = () => { pendingAnchor.current = null; };
    const events = ["wheel", "touchstart", "pointerdown", "keydown"];
    events.forEach(event => window.addEventListener(event, release, { passive: true, capture: true }));
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      events.forEach(event => window.removeEventListener(event, release, true));
    };
  }, [pathname]);

  useEffect(() => {
    const id = companySection(window.location.hash || initialTab);
    // Translate old links once. Never rewrite the URL from the scroll spy:
    // an intercepted story reader owns the address while it is open.
    if (initialTab && !window.location.hash) {
      window.history.replaceState(window.history.state, "", companySectionHref(pathname, window.location.search, id));
    }
    if (id !== "overview") goTo(id);
    const onHash = (event) => {
      if (window.location.pathname === pathname && new URL(event.oldURL).pathname === pathname) goTo(companySection(window.location.hash));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
    // Only initialize on company navigation, not on a story-reader return.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (currentPath !== pathname || !readerReturn.current) return;
    const { element, y } = readerReturn.current;
    pendingAnchor.current = null;
    // A browser Back to #news can natively focus the section rather than the
    // clicked headline. Restore the actual reader origin after dialog cleanup.
    const frame = requestAnimationFrame(() => {
      if (element.isConnected) {
        element.focus({ preventScroll: true });
        window.scrollTo({ top: y, behavior: "instant" });
      }
      readerReturn.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [currentPath, pathname]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (window.location.pathname !== pathname || document.querySelector('[role="dialog"]')) return;
      const offset = parseFloat(getComputedStyle(main.current).getPropertyValue("--report-offset")) + 16;
      const sections = [...main.current.querySelectorAll("[data-report-section]")];
      const current = sections.filter((section) => section.getBoundingClientRect().top <= offset).at(-1) ?? sections[0];
      if (current) setActive(current.id);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  const navigate = (event, id) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    const href = companySectionHref(pathname, window.location.search, id);
    if (`${location.pathname}${location.search}${location.hash}` !== href) window.history.pushState(window.history.state, "", href);
    if (contentsOpen) {
      pendingFocus.current = id;
      setTarget(id);
      setContentsOpen(false);
    } else goTo(id, true);
  };

  const links = (label) => <nav className={styles.contents} aria-label={label}>
    {COMPANY_SECTIONS.map((section) => <a key={section.id} href={`#${section.id}`} aria-current={active === section.id ? "location" : undefined} onClick={(event) => navigate(event, section.id)}>
      <span>{section.label}</span>{!hasPlus && section.plus && <FiLock aria-label="Plus" />}
    </a>)}
  </nav>;

  const context = <div className={styles.context}>
    <span className={styles.contextName} title={name}>{name}</span>
    <div className={styles.contextQuote}>
      <span>{quote?.price == null ? "Kurs saknas" : `${Number(quote.price).toLocaleString("sv-SE", { maximumFractionDigits: 2 })} ${currency === "SEK" ? "kr" : currency}`}</span>
      <ChangeBadge value={quote?.changePct} label="Dagsförändring" />
    </div>
  </div>;

  return <ReportContext.Provider value={{ target }}>
    <Container as="main" className={styles.report} ref={main}>
      <div className={styles.mobileBar}>
        {context}
        <Dialog open={contentsOpen} onOpenChange={(open) => { if (open) pendingFocus.current = null; setContentsOpen(open); }}
          onOpenChangeComplete={(open) => { if (!open && pendingFocus.current) { goTo(pendingFocus.current, true); pendingFocus.current = null; } }}
          finalFocus={() => pendingFocus.current ? document.getElementById(`${pendingFocus.current}-heading`) : true}
          title="På den här sidan" trigger={<Button variant="secondary" className={styles.contentsTrigger}>Avsnitt <FiChevronDown aria-hidden="true" /></Button>}>
          <Text tone="secondary" size="sm">{name}</Text>
          {links("Välj bolagsavsnitt")}
        </Dialog>
      </div>
      <aside className={styles.sidebar}>
        <Link className={styles.back} href="/aktier"><FiChevronLeft aria-hidden="true" /> Aktier</Link>
        {context}
        {links("Bolagsavsnitt")}
      </aside>
      <div className={styles.document} onClickCapture={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const element = event.target.closest('a[href^="/nyhet/"], [data-company-story]');
        if (element) {
          pendingAnchor.current = null;
          readerReturn.current = { element, y: window.scrollY };
        }
      }}>{children}</div>
    </Container>
  </ReportContext.Provider>;
}
