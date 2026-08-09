const news = [
    { time: "10:42", tag: "ORDER", ticker: "PCELL", title: "PowerCell får order värd 21 MSEK", important: true },
    { time: "10:18", tag: "INSIDER", ticker: "QBNK", title: "Jörgen Karlsson köper 18 500 aktier för 1,2 MSEK" },
    { time: "09:00", tag: "EARNINGS", ticker: "EVO", title: "Rörelseresultatet över analytikernas estimat", important: true },
];

const movers = [
    ["QIIWI", "+12,8%", "3,7×"],
    ["PCELL", "+6,4%", "2,9×"],
    ["EVO", "+4,1%", "1,8×"],
    ["SBB B", "−3,2%", "2,1×"],
];

function TerminalChart() {
    return (
        <div className="min-h-[330px] flex flex-col bg-[#09141d] border border-[#1a2b39]">
            <div className="h-10 px-3 flex items-center justify-between border-b border-[#162634] font-mono text-[11px]">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[#d5e4ef] font-bold text-sm">VOLV B</span>
                    <span className="text-[#567085] truncate">Volvo AB</span>
                    <span className="border border-[#6f9a43]/60 text-[#a9ea5f] px-1.5 py-0.5">NEWS</span>
                </div>
                <span className="text-[#7ddf64] font-bold">+1,24%</span>
            </div>
            <div className="h-9 px-3 flex items-center justify-between border-b border-[#12202c] font-mono text-[10px] text-[#7791a4]">
                <div className="flex gap-1.5">
                    <span className="border border-[#385267] px-2 py-1 text-[#d5e4ef]">1D</span>
                    <span className="px-2 py-1">2D</span>
                    <span className="px-2 py-1">3M</span>
                    <span className="px-2 py-1">6M</span>
                    <span className="px-2 py-1">1Y</span>
                </div>
                <span className="hidden sm:inline">Last: <b className="text-[#d5e4ef]">301,40</b></span>
            </div>
            <div className="relative flex-1 overflow-hidden">
                <div className="absolute inset-x-0 top-[25%] border-t border-[#182a38]" />
                <div className="absolute inset-x-0 top-[50%] border-t border-[#182a38]" />
                <div className="absolute inset-x-0 top-[75%] border-t border-[#182a38]" />
                <span className="absolute inset-0 flex items-center justify-center text-[70px] sm:text-[96px] font-black text-[#82a7be]/[0.06]">VOLV B</span>
                <svg viewBox="0 0 720 250" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
                    <defs>
                        <linearGradient id="terminal-volume" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0" stopColor="#426985" stopOpacity="0.35" />
                            <stop offset="1" stopColor="#426985" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <rect x="0" y="45" width="310" height="17" fill="url(#terminal-volume)" />
                    <rect x="0" y="96" width="220" height="17" fill="url(#terminal-volume)" />
                    <rect x="0" y="151" width="390" height="17" fill="url(#terminal-volume)" />
                    <path
                        d="M0 196 L30 190 L55 201 L80 176 L110 182 L138 163 L170 172 L198 149 L225 154 L255 128 L282 137 L310 119 L338 125 L368 91 L396 103 L426 80 L454 92 L482 66 L510 74 L538 51 L566 62 L596 39 L625 50 L654 33 L684 41 L720 24"
                        fill="none"
                        stroke="#c8f7a0"
                        strokeWidth="3"
                        vectorEffect="non-scaling-stroke"
                    />
                    <circle cx="720" cy="24" r="5" fill="#a9ea5f" />
                </svg>
                <div className="absolute bottom-2 inset-x-3 flex justify-between font-mono text-[9px] text-[#526c7d]">
                    <span>09:00</span><span>11:00</span><span>13:00</span><span>15:00</span><span>17:30</span>
                </div>
            </div>
        </div>
    );
}

function NewsFlow() {
    return (
        <div className="bg-[#09141d] border border-[#1a2b39] min-h-[196px]">
            <div className="h-10 px-3 flex items-center justify-between border-b border-[#162634] font-mono text-[11px]">
                <span className="font-bold tracking-wider text-[#b8ccd9]">NEWS FLOW</span>
                <span className="flex items-center gap-1.5 text-[#7ddf64]"><i className="w-1.5 h-1.5 rounded-full bg-current" />LIVE</span>
            </div>
            <div className="divide-y divide-[#142431]">
                {news.map((item) => (
                    <div key={`${item.time}-${item.ticker}`} className={`px-3 py-3 ${item.important ? "bg-[#e8c268]/[0.06]" : ""}`}>
                        <div className="flex items-center gap-1.5 mb-1 font-mono text-[9px]">
                            <span className="text-[#60798b]">{item.time}</span>
                            <span className={`border px-1 ${item.important ? "border-[#e8c268]/50 text-[#e8c268]" : "border-[#4b9dcd]/50 text-[#83c8ed]"}`}>{item.tag}</span>
                            <span className="text-[#a9ea5f]">{item.ticker}</span>
                        </div>
                        <p className="text-[11px] leading-4 text-[#c4d6e2]">{item.title}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Movers() {
    return (
        <div className="bg-[#09141d] border border-[#1a2b39] min-h-[170px]">
            <div className="h-10 px-3 flex items-center justify-between border-b border-[#162634] font-mono text-[11px]">
                <span className="font-bold tracking-wider text-[#b8ccd9]">MOVERS</span>
                <span className="text-[#60798b]">RVOL ▾</span>
            </div>
            <div className="font-mono text-[10px]">
                <div className="grid grid-cols-[1fr_62px_52px] px-3 py-1.5 text-[#526c7d] border-b border-[#142431]">
                    <span>TICKER</span><span className="text-right">MOVE</span><span className="text-right">RVOL</span>
                </div>
                {movers.map(([ticker, move, rvol]) => (
                    <div key={ticker} className="grid grid-cols-[1fr_62px_52px] px-3 py-2 border-b border-[#12202c] last:border-0">
                        <span className="text-[#c4d6e2] font-bold">{ticker}</span>
                        <span className={`text-right ${move.startsWith("+") ? "text-[#7ddf64]" : "text-[#e86868]"}`}>{move}</span>
                        <span className="text-right text-[#83c8ed]">{rvol}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

const features = [
    ["Live arbetsyta", "Följ flera aktier, jämför avkastning och växla mellan tick-, minut- och dagsdata."],
    ["Nyheter som går att agera på", "Filtrerade nyhetsflashar med bolagskoppling, etiketter och tydligt markerade rapporter och order."],
    ["Hitta dagens case", "Movers och intradagsscreener för spread, rörelse, relativ volym, volymspikar och nyhetsdrivna aktier."],
    ["Fundamenta utan sidbyte", "Års- och kvartalsdata, estimat, rapportkalender och senaste vd-ord direkt i aktiefönstret."],
];

export default function TerminalShowcase() {
    return (
        <section className="max-w-6xl mx-auto px-4 md:px-6 pb-20 font-sans">
            <div className="text-center max-w-2xl mx-auto mb-9">
                <p className="text-xs font-bold tracking-[0.18em] text-secondary mb-3">BYGGD FÖR HANDELSDAGEN</p>
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-text mb-3">Allt viktigt i samma arbetsyta</h2>
                <p className="text-text-muted">
                    Se marknaden röra sig, förstå varför och öppna rätt bolag utan att hoppa mellan flera tjänster.
                </p>
            </div>

            <div className="rounded-lg overflow-hidden border border-[#263b4b] shadow-2xl shadow-black/20 bg-[#060d14]">
                <div className="h-10 px-3 flex items-center justify-between border-b border-[#1a2b39] bg-[#081018] font-mono text-[10px]">
                    <div className="flex items-center gap-2 text-[#cfe2ef] font-bold tracking-widest">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#fcbb00]" />OMXSUM <span className="text-[#5d7a8f] font-normal">TERMINAL</span>
                    </div>
                    <span className="text-[#60798b]">EXEMPELVY</span>
                </div>
                <div className="grid lg:grid-cols-[minmax(0,1fr)_310px] gap-1.5 p-1.5">
                    <TerminalChart />
                    <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-1.5">
                        <NewsFlow />
                        <Movers />
                    </div>
                </div>
            </div>

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
