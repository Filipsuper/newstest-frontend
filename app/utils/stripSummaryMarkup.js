// The summaries contain custom markup tokens (&&bold&&, **bold**, ##heading##,
// /red/text/red/, /green/text/green/, [link](url)). Strip them so the plain
// text can be used in meta descriptions and OG images.
export function stripSummaryMarkup(text = "") {
    return text
        .replace(/\[(.*?)\]\(.*?\)/g, "$1")
        .replaceAll("&&", "")
        .replaceAll("**", "")
        .replaceAll("##", "")
        .replaceAll("/red/", "")
        .replaceAll("/green/", "")
        .replace(/\s+/g, " ")
        .trim();
}

export function summaryExcerpt(article, maxLength = 200) {
    const source = article?.introText || article?.summary || "";
    const plain = stripSummaryMarkup(source);
    if (plain.length <= maxLength) return plain;
    return plain.slice(0, maxLength - 1).trimEnd() + "…";
}
