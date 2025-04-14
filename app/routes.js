import { index, layout, route } from "@react-router/dev/routes";

export default [
    layout("routes/rootLayout.jsx", [
        index("routes/home.jsx"),
        route("/article/:id", "routes/article.jsx"),
        route("/about", "routes/about.jsx"),
        route("/morgonbrevet", "routes/morning.jsx"),
        route("/kvallsbrevet", "routes/aftermarket.jsx"),
        route("/alla-nyhetsbrev", "routes/allArticles.jsx"),
        route("/settings", "routes/settings.jsx"),
        route("/skanna", "routes/scan.jsx")
    ])
];