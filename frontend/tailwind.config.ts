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
        ink: "#16211f",
        pine: "#0f513f",
        mint: "#dff7ec",
        saffron: "#f5b544",
        skyglass: "#edf7fb",
      },
      boxShadow: {
        soft: "0 16px 40px rgba(22, 33, 31, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
