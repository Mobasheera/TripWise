import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#171716",
        paper: "#f4f0e6",
        sand: "#e9e1cf",
        brass: "#b58b3b",
        pine: "#1f332c",
        moss: "#52665a",
        line: "#d8cfbb"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(33, 31, 25, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
