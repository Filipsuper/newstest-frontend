export const parseSummary = (summary) => {
    return summary.split("\n").map((line, index) => {
        if (line.includes("##")) {
            return <h2 className=" font-bold text-text font-serif italic mt-2 text-lg" key={index} >{line.replaceAll("#", "")}</h2>
        } else if (line === "") {
            return
        }

        if (line === "") {
            return null;
        }

        const parts = line.split(/(\[.*?\]\(.*?\)|\&\&[^\&]+\&\&|\*\*[^\*]+\*\*|##[^#]+##|\/red\/[^\/]+\/red\/|\/green\/[^\/]+\/green\/)/);

        return (
            <p className="mb-2 text-text-article" key={index}>
                {parts.map((part, i) => {

                    if (part.startsWith('&&') && part.endsWith('&&')) {
                        return <span key={i} className="font-bold">{part.slice(2, -2)}</span>;
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