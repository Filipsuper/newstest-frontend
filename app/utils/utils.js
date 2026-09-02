// Newsletter tickers ("VOLV B") -> newswire/Yahoo symbols ("VOLV-B.ST")
export const tickerToSymbol = (ticker = "") => {
    const trimmed = ticker.trim().toUpperCase();
    if (!trimmed) return "";
    if (trimmed.includes(".")) return trimmed;
    return trimmed.replace(/\s+/g, "-") + ".ST";
};

export const pnlColor = (value) => {
    if (value > 0) {
        return "market-positive";
    } else if (value < 0) {
        return "market-negative";
    } else {
        return "text-text-muted";
    }
};

export const importanceColor = (importance) => {
    if (importance > 9) {
        return "market-negative";
    } else if (importance > 7) {
        return "text-secondary";
    } else if (importance > 5) {
        return "market-positive";
    } else if (importance > 3) {
        return "text-primary";
    } else if (importance > 1) {
        return "text-text-article";
    } else {
        return "text-text-muted";
    }
};
