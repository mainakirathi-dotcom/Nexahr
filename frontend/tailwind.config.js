/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B1220",
          900: "#101B2E",
          800: "#16233A",
          700: "#203150",
          600: "#2C4270",
        },
        gold: {
          400: "#E8B85C",
          500: "#D9A441",
          600: "#B9862C",
        },
        midnight: {
          50: "#F3EFFA",
          100: "#E6DBF3",
          400: "#7C3AED",
          500: "#4C1D95",
          600: "#3B0764",
          700: "#2E0854",
        },
        teal: {
          400: "#3FBFA6",
          500: "#279E88",
        },
        sand: {
          50: "#FAF8F4",
          100: "#F3EFE6",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Manrope'", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,27,46,0.06), 0 8px 24px -8px rgba(16,27,46,0.12)",
      },
    },
  },
  plugins: [],
}

