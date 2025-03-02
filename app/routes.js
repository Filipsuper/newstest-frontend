import { index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.jsx"),
    route("/article/:id", "routes/article.jsx"),
];
