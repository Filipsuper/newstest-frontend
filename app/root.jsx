import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { AppProvider } from "./providers/AppProvider";

import stylesheet from "./app.css?url";
import { ModalProvider } from "./providers/ModalProvider";
import { AuthProvider } from "./providers/AuthProvider";
import { ThemeProvider } from "./providers/ThemeProvider";

export const links = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", href: "/favicon-32x32.png" }
];

export function Layout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <meta property="og:title" content="Omxsum" />
        <meta property="og:description" content="Marknadssummeringar varje morgon 8.00 och kväll 17.30" />
        <meta property="og:image" content="https://omxsum.com/omxsum_og.jpg" />
        <meta property="og:url" content="https://omxsum.com" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Omxsum" />
        <meta name="twitter:description" content="Marknadssummeringar varje morgon 8.00 och kväll 17.30" />
        <meta name="twitter:image" content="https://omxsum.com/omxsum_og.jpg" />
        <script src="https://sponsorapp.io/platform.js?p=73a2a324be7b4690"></script>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3761964510789277"
          crossorigin="anonymous"></script>
      </head>
      <body className="bg-background text-text">
        {children}
        <ScrollRestoration />
        <Scripts />
        <script async src="https://scripts.simpleanalyticscdn.com/latest.js"></script>
      </body>
    </html>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ThemeProvider>
        <AuthProvider>
          <ModalProvider>
            <Outlet />
          </ModalProvider>
        </AuthProvider>
      </ThemeProvider>
    </AppProvider>
  );
}

export function ErrorBoundary({ error }) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto text-text">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}