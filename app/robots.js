export default function robots() {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/settings"],
        },
        sitemap: "https://omxsum.com/sitemap.xml",
    };
}
