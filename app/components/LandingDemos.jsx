"use client";

// Hand-built, non-interactive miniatures of the product UI for the landing
// page. Pure markup + SVG in the site's own design system — always crisp,
// theme-aware and never out of date like screenshots.

const intraday = [
    62, 78, 88, 74, 66, 58, 50, 54, 44, 38, 42, 34, 30, 35, 27, 22, 26, 18, 22, 16,
    20, 14, 17, 12, 16, 10, 14, 9, 13, 11, 15, 12, 16, 13, 11, 14, 12, 15, 13, 16,
];

const toPath = (values, width, height, pad = 6) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const step = width / (values.length - 1);
    return values
        .map((value, idx) => {
            const x = (idx * step).toFixed(1);
            const y = (pad + (height - pad * 2) * (1 - (value - min) / span)).toFixed(1);
            return `${idx === 0 ? "M" : "L"}${x},${y}`;
        })
        .join(" ");
};

function Sparkline({ values, color, width = 600, height = 190, dots = [] }) {
    const path = toPath(values, width, height);
    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block" aria-hidden="true">
            <defs>
                <linearGradient id={`fill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <line x1="0" y1={height * 0.32} x2={width} y2={height * 0.32} stroke="#6b7280" strokeWidth="1" strokeDasharray="5 5" opacity="0.5" />
            <path d={`${path} L${width},${height} L0,${height} Z`} fill={`url(#fill-${color.replace("#", "")})`} stroke="none" />
            <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
            {dots.map((dot, idx) => {
                const min = Math.min(...values);
                const max = Math.max(...values);
                const span = max - min || 1;
                const x = (dot.at * (width / (values.length - 1))).toFixed(1);
                const y = (6 + (height - 12) * (1 - (values[dot.at] - min) / span)).toFixed(1);
                return <circle key={idx} cx={x} cy={y} r="5" fill={dot.color} stroke="var(--color-background)" strokeWidth="2" />;
            })}
        </svg>
    );
}

function Chip({ color, children }) {
    return (
        <span className={`border px-1.5 py-0.5 uppercase tracking-wide text-[10px] font-sans ${color}`}>
            {children}
        </span>
    );
}

const card = "bg-foreground shadow-2xl shadow-black/40 select-none pointer-events-none";

export function DemoStock() {
    return (
        <div className={`${card} p-6`} aria-hidden="true">
            <div className="flex flex-row justify-between items-start mb-5">
                <div>
                    <p className="text-2xl font-serif font-bold italic text-text">Volvo B</p>
                    <p className="font-sans text-xs text-text-muted mt-0.5">VOLV B • VOLV-B.ST • Industrials</p>
                </div>
                <div className="text-right font-sans">
                    <p className="text-2xl font-bold text-text">366,50 kr</p>
                    <p className="text-xs font-semibold text-secondary">−3,90 (−1,06%)</p>
                </div>
            </div>

            <div className="flex flex-row justify-between items-center border-b border-border mb-4 font-sans text-xs">
                <div className="flex flex-row">
                    <span className="px-2.5 py-1.5 text-text border-b-2 border-secondary font-semibold -mb-px">Kurs</span>
                    <span className="px-2.5 py-1.5 text-text-muted">Analys</span>
                    <span className="px-2.5 py-1.5 text-text-muted">Kalender</span>
                    <span className="px-2.5 py-1.5 text-text-muted">Historik</span>
                </div>
                <div className="hidden sm:flex flex-row gap-1">
                    <span className="px-1.5 text-text border-b-2 border-secondary">Idag</span>
                    <span className="px-1.5 text-text-muted">6 mån</span>
                    <span className="px-1.5 text-text-muted">1 år</span>
                </div>
            </div>

            <Sparkline
                values={intraday}
                color="#fbbf24"
                dots={[{ at: 8, color: "#34d399" }, { at: 24, color: "#fbbf24" }]}
            />

            <div className="mt-4 pt-3">
                <div className="flex flex-row items-center gap-2 font-sans text-[11px] mb-1">
                    <span className="text-text-muted font-semibold">09:00</span>
                    <Chip color="text-emerald-400 border-emerald-400/40">Rapport</Chip>
                </div>
                <p className="font-serif font-bold italic text-text text-sm">Volvo Car publicerar rapport</p>
            </div>
        </div>
    );
}

export function DemoLetter() {
    return (
        <div className={`${card} p-6`} aria-hidden="true">
            <div className="flex flex-row justify-between items-center mb-3 font-sans text-xs text-text-muted">
                <span className="font-bold text-text">Morgonens brev</span>
                <span>08:00 • varje vardag</span>
            </div>
            <p className="text-xl font-serif font-black italic text-text leading-snug mb-4">
                Risk-on på rekordbörs: oljeras och rapportfokus på svensk energi
            </p>
            <div className="flex flex-col gap-1.5 mb-4">
                {[
                    "Försiktigt positiv öppning för OMXS30, +0,31%",
                    "Rapportfokus: Lundin Gold och Int. Petroleum",
                    "Stoxx 600 +0,4% efter fallande räntor",
                ].map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2 border border-secondary/30 bg-bullet text-amber-500 px-3 py-1 text-xs font-bold font-serif w-fit">
                        <svg className="w-1.5 h-1.5 fill-amber-500 shrink-0" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" /></svg>
                        {line}
                    </div>
                ))}
            </div>
            <div className="flex flex-row items-center gap-4 font-sans text-xs mb-4">
                <div>
                    <p className="text-text-muted">Dagens sentiment</p>
                    <p className="font-bold text-text">Bullish 🐂</p>
                </div>
                <div className="border-l border-border pl-4">
                    <p className="text-text-muted">OMXS30</p>
                    <p className="font-bold text-text">3 287,68 <span className="text-primary font-semibold">+0,31%</span></p>
                </div>
            </div>
            <p className="font-sans text-xs text-text-muted leading-relaxed line-clamp-2">
                Stockholmsbörsen väntas öppna försiktigt positivt. Dagens fokus blir svensk
                energi- och råvarusektor med delårsrapporter från <span className="font-bold text-text-article underline decoration-dotted">Lundin Gold</span> och
                hög utdelningsaktivitet i <span className="font-bold text-text-article underline decoration-dotted">Volati Pref</span>…
            </p>
        </div>
    );
}

export function DemoNewsFeed() {
    const items = [
        {
            time: "12:15",
            chips: [["text-sky-400 border-sky-400/40", "Order"]],
            company: "PowerCell Sweden",
            title: "PowerCell får order värd SEK 21 million",
        },
        {
            time: "09:52",
            chips: [["text-secondary border-secondary/40", "Insynshandel"], ["text-primary border-primary/40", "Förvärv"]],
            company: "Fastpartner A",
            title: "Fastpartner A: Sven-Olof Johansson köper 5 787 aktier för 245 948 SEK",
        },
        {
            time: "09:00",
            chips: [["text-emerald-400 border-emerald-400/40", "Rapport"]],
            company: "Volvo Car B",
            title: "Volvo Car publicerar rapport",
        },
    ];

    return (
        <div className={`${card} p-6`} aria-hidden="true">
            <div className="flex flex-row justify-between items-center mb-4 font-sans text-xs">
                <div className="flex flex-row gap-4">
                    <span className="text-text-muted">Vinnare: <span className="text-text">Qiiwi Games</span> <span className="text-primary font-semibold">+70,50%</span></span>
                </div>
                <div className="flex flex-row items-center gap-1.5 text-text-muted">
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span> LIVE
                </div>
            </div>
            <div className="flex flex-col gap-4">
                {items.map((item, idx) => (
                    <div key={idx}>
                        <div className="flex flex-row flex-wrap items-center gap-x-2 gap-y-1 mb-1 font-sans text-[11px]">
                            <span className="text-text-muted font-semibold">{item.time}</span>
                            {item.chips.map(([color, label]) => (
                                <Chip key={label} color={color}>{label}</Chip>
                            ))}
                            <span className="text-primary border border-border px-1.5 py-0.5 text-[10px]">{item.company}</span>
                        </div>
                        <p className="font-serif font-bold italic text-text text-sm leading-snug">{item.title}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function DemoFinancials() {
    const years = [
        { year: 2022, revenue: 62, ebit: 28, third: 31, margin: 0.62 },
        { year: 2023, revenue: 74, ebit: 34, third: 38, margin: 0.63 },
        { year: 2024, revenue: 92, ebit: 46, third: 50, margin: 0.7 },
        { year: 2025, revenue: 90, ebit: 40, third: 44, margin: 0.61 },
    ];
    const width = 560;
    const height = 200;
    const groupWidth = width / years.length;
    const barWidth = 26;
    const scaleY = (value) => height - (value / 100) * height;

    const marginPath = years
        .map((row, idx) => {
            const x = idx * groupWidth + groupWidth / 2;
            const y = height - row.margin * height * 0.9 - 20;
            return `${idx === 0 ? "M" : "L"}${x},${y}`;
        })
        .join(" ");

    return (
        <div className={`${card} p-6`} aria-hidden="true">
            <div className="flex flex-row justify-between items-start mb-4">
                <div>
                    <p className="text-xl font-serif font-bold italic text-text">Evolution</p>
                    <p className="font-sans text-xs text-text-muted mt-0.5">EVO • Analys</p>
                </div>
                <div className="flex flex-row gap-1 font-sans text-xs">
                    <span className="px-1.5 text-text border-b-2 border-secondary">År</span>
                    <span className="px-1.5 text-text-muted">Kvartal</span>
                </div>
            </div>
            <svg viewBox={`0 0 ${width} ${height + 24}`} className="w-full h-auto block" aria-hidden="true">
                {years.map((row, idx) => {
                    const base = idx * groupWidth + groupWidth / 2 - barWidth * 1.5 - 4;
                    return (
                        <g key={row.year}>
                            <rect x={base} y={scaleY(row.revenue)} width={barWidth} height={height - scaleY(row.revenue)} fill="#668CF4" />
                            <rect x={base + barWidth + 4} y={scaleY(row.ebit)} width={barWidth} height={height - scaleY(row.ebit)} fill="#fbbf24" />
                            <rect x={base + (barWidth + 4) * 2} y={scaleY(row.third)} width={barWidth} height={height - scaleY(row.third)} fill="#34d399" />
                            <text x={idx * groupWidth + groupWidth / 2} y={height + 18} textAnchor="middle" fill="#6b7280" fontSize="12" fontFamily="sans-serif">
                                {row.year}
                            </text>
                        </g>
                    );
                })}
                <path d={marginPath} fill="none" stroke="#9ca3af" strokeWidth="2" />
                {years.map((row, idx) => (
                    <circle key={idx} cx={idx * groupWidth + groupWidth / 2} cy={height - row.margin * height * 0.9 - 20} r="3.5" fill="#9ca3af" />
                ))}
            </svg>
            <div className="flex flex-row flex-wrap gap-x-4 gap-y-1 mt-3 font-sans text-[11px] text-text-muted">
                <span><span className="inline-block w-2.5 h-2.5 bg-primary mr-1.5 align-middle"></span>Omsättning</span>
                <span><span className="inline-block w-2.5 h-2.5 bg-secondary mr-1.5 align-middle"></span>EBIT</span>
                <span><span className="inline-block w-2.5 h-2.5 bg-emerald-400 mr-1.5 align-middle"></span>EBITA</span>
                <span><span className="inline-block w-4 h-0.5 bg-gray-400 mr-1.5 align-middle"></span>EBIT-marginal</span>
            </div>
        </div>
    );
}

const terminalSeries = [
    { label: "VOLV B", price: "366,50", change: "−0,79%", up: false, values: [70, 82, 74, 60, 52, 44, 48, 38, 34, 40, 32, 28, 34, 30, 36, 33] },
    { label: "ERIC B", price: "97,42", change: "+1,27%", up: true, values: [30, 44, 38, 52, 46, 40, 48, 56, 50, 60, 54, 62, 58, 68, 64, 72] },
    { label: "EVO", price: "725,20", change: "−0,55%", up: false, values: [60, 52, 66, 58, 48, 56, 50, 44, 52, 46, 40, 48, 42, 38, 44, 41] },
    { label: "SAAB B", price: "626,40", change: "+1,84%", up: true, values: [24, 38, 32, 48, 44, 58, 52, 64, 56, 50, 58, 54, 62, 58, 66, 63] },
];

export function DemoTerminal() {
    return (
        <div className="bg-[#050a0e] p-4 shadow-2xl shadow-black/50 select-none pointer-events-none" aria-hidden="true">
            <div className="flex flex-row justify-between items-center mb-3 px-1 font-mono text-[11px] tracking-wider">
                <span className="text-gray-300 font-bold">STONKS <span className="text-gray-600 font-normal">/ MARKET DATA</span></span>
                <span className="text-green-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> LIVE
                </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
                {terminalSeries.map((tile) => (
                    <div key={tile.label} className="bg-[#0a1118] p-3">
                        <div className="flex flex-row justify-between items-baseline mb-2 font-mono text-[10px]">
                            <span className="text-green-400 font-bold">{tile.label}</span>
                            <span className={tile.up ? "text-green-400" : "text-red-400"}>{tile.price} {tile.change}</span>
                        </div>
                        <svg viewBox="0 0 200 60" className="w-full h-auto block">
                            <path d={toPath(tile.values, 200, 60, 4)} fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinejoin="round" />
                        </svg>
                    </div>
                ))}
            </div>
        </div>
    );
}
