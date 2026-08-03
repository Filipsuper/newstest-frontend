import Link from "next/link";

export const parseSummary = (summary, resolveSymbol) => {
    return summary.split("\n").map((line, index) => {
        if (line === "") {
            return null;
        }

        const parts = line.split(/(\[.*?\]\(.*?\)|\&\&[\s\S]*?\&\&|\*\*[^\*]+\*\*|##[^#]+##|\/red\/[^\/]+\/red\/|\/green\/[^\/]+\/green\/)/);

        return (
            <p className="mb-2 text-text-article" key={index}>
                {parts.map((part, i) => {

                    if (part.startsWith('&&') && part.endsWith('&&')) {
                        const label = part.slice(2, -2);
                        const symbol = resolveSymbol?.(label);
                        if (symbol) {
                            return (
                                <Link
                                    key={i}
                                    href={`/aktie/${encodeURIComponent(symbol)}`}
                                    className="font-bold underline decoration-dotted decoration-text-muted underline-offset-2 hover:text-primary transition-colors"
                                >
                                    {label}
                                </Link>
                            );
                        }
                        return <span key={i} className="font-bold">{label}</span>;
                    } else if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong className="" key={i}>{part.slice(2, -2)}</strong>;
                    } else if (part.startsWith('##') && part.endsWith('##')) {
                        return <h2 key={i} className="text-xl font-semibold">{part.slice(2, -2)}</h2>;
                    } else if (part.startsWith('/red/') && part.endsWith('/red/')) {
                        return <span key={i} className="text-amber-400">{part.slice(5, -5)}</span>;
                    } else if (part.startsWith('/green/') && part.endsWith('/green/')) {
                        return <span key={i} className="text-primary">{part.slice(7, -7)}</span>;
                    }
                    return part;
                })}
            </p >
        );


    })
}
