import { index, layout, route } from "@react-router/dev/routes";

export default [
    layout("routes/rootLayout.jsx", [
        index("routes/home.jsx"),
        route("/article/:id", "routes/article.jsx"),
        route("/om-oss", "routes/about.jsx"),
        route("/morgonbrevet", "routes/morning.jsx"),
        route("/kvallsbrevet", "routes/eveningLetter.jsx"),
        route("/alla-nyhetsbrev", "routes/allArticles.jsx"),
        route("/settings", "routes/settings.jsx"),
        route("/skanna", "routes/scan.jsx"),
    ]),
    route("/onboarding", "routes/onboardingFlow.jsx"),
    route("/tack", "routes/tack.jsx"),
    route("subscribe-after-verify", "routes/subscribeAfterVerfiy.jsx"),
];