import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          canvas: "#f8fafc",
          card: "#ffffff",
          subtle: "#f1f5f9",
          inset: "#f8fafc",
          border: "#e2e8f0",
        },
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        navy: {
          900: "#0f172a",
          950: "#020617",
        },
        status: {
          draft: {
            bg: "#f1f5f9",
            text: "#334155",
            border: "#cbd5e1",
          },
          pending: {
            bg: "#fffbeb",
            text: "#b45309",
            border: "#fde68a",
          },
          approved: {
            bg: "#ecfdf5",
            text: "#047857",
            border: "#a7f3d0",
          },
          rejected: {
            bg: "#fef2f2",
            text: "#b91c1c",
            border: "#fecaca",
          },
          withdrawn: {
            bg: "#f8fafc",
            text: "#64748b",
            border: "#e2e8f0",
          },
        },
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        card: "0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)",
        lift: "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;

