import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        pine: "rgb(var(--color-pine) / <alpha-value>)",
        mint: "rgb(var(--color-mint) / <alpha-value>)",
        saffron: "rgb(var(--color-saffron) / <alpha-value>)",
        skyglass: "rgb(var(--color-skyglass) / <alpha-value>)",
        cream: "rgb(var(--color-cream) / <alpha-value>)",
      },
      boxShadow: {
        soft: "0 16px 40px rgba(22, 33, 31, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
