/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./app/components/**/*.{js,ts,jsx,tsx}",
    "public/*/*.jsx",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: 'var(--background)',
        },
        text: {
          DEFAULT: 'var(--text)',
          article: 'var(--text-article)',
          muted: 'var(--text-muted)',
        },
        border: {
          DEFAULT: 'var(--border)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
        },
      },
    },
  },
  plugins: [],
}