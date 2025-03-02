/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./app/components/**/*.{js,ts,jsx,tsx}",
    "public/*/*.jsx",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}