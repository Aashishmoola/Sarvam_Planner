import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          0: "#000000",
          1: "#0a0a0d",
          2: "#131319",
          3: "#1c1c25",
        },
        gray: {
          soft: "#2a2a35",
          mid: "#5a5a6a",
          fade: "#8a8a95",
        },
        blue: {
          50: "#e8f0ff",
          100: "#c8dbff",
          200: "#8ab0ff",
          300: "#4d84ff",
          400: "#2560ff",
          500: "#0040e6",
          600: "#0030b3",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
