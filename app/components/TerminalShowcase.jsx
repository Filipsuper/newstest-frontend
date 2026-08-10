import Image from "next/image";

const features = [
    ["Live arbetsyta", "Följ flera aktier, jämför avkastning och växla mellan tick-, minut- och dagsdata."],
    ["Nyheter som går att agera på", "Filtrerade nyhetsflashar med bolagskoppling, etiketter och tydligt markerade rapporter och order."],
    ["Hitta dagens case", "Movers och intradagsscreener för spread, rörelse, relativ volym, volymspikar och nyhetsdrivna aktier."],
    ["Fundamenta utan sidbyte", "Års- och kvartalsdata, estimat, rapportkalender och senaste vd-ord direkt i aktiefönstret."],
];

export default function TerminalShowcase() {
    return (
        <section className="max-w-7xl mx-auto px-4 md:px-6 pb-20 font-sans">
            <div className="text-center max-w-2xl mx-auto mb-9">
                <p className="text-xs font-bold tracking-[0.18em] text-secondary mb-3">BYGGD FÖR HANDELSDAGEN</p>
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-text mb-3">Allt viktigt i samma arbetsyta</h2>
                <p className="text-text-muted">
                    Se marknaden röra sig, förstå varför och öppna rätt bolag utan att hoppa mellan flera tjänster.
                </p>
            </div>

            <a
                href="/images/terminal-showcase.png"
                target="_blank"
                rel="noreferrer"
                aria-label="Öppna en större bild av OMXsum Terminal"
                className="group block overflow-hidden rounded-xl bg-[#090b0f] shadow-2xl shadow-black/35"
            >
                <Image
                    src="/images/terminal-showcase.png"
                    alt="OMXsum Terminal med flera aktiegrafer, nyhetsflöde, movers och finansiella data"
                    width={2048}
                    height={1109}
                    sizes="(max-width: 1280px) 100vw, 1280px"
                    quality={90}
                    className="block h-auto w-full contrast-[1.1] saturate-[1.08] brightness-[1.04] transition-transform duration-300 group-hover:scale-[1.005]"
                />
            </a>
            <p className="mt-2 text-center text-xs text-text-muted">Klicka på bilden för att visa den i full storlek.</p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border mt-8">
                {features.map(([title, text], index) => (
                    <article key={title} className="bg-background p-5">
                        <span className="text-xs font-mono text-secondary">0{index + 1}</span>
                        <h3 className="font-serif font-bold text-text text-lg mt-2 mb-2">{title}</h3>
                        <p className="text-sm leading-6 text-text-muted">{text}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}
