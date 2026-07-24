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
        // Backgrounds: light grey page → grey cards. ink-3 kept dark for
        // modal scrims / overlays (not a page background).
        ink: {
          0: "#f4f4f5", // page background (light grey)
          1: "#e7e7ea", // card / secondary surface (grey)
          2: "#dcdce0", // pressed / active surface
          3: "#1c1c25", // dark — scrims, overlays, dark surfaces
        },
        // Borders + muted text on the light surface.
        gray: {
          soft: "#d4d4d8", // borders
          mid: "#9ca3af",  // tertiary text / hints
          fade: "#6b7280", // secondary text / labels
        },
        // Accent ramp (dark blue) + repurposed text tokens.
        blue: {
          50: "#1c1c25", // primary text — dark slate
          100: "#ffffff", // text on accent surfaces
          200: "#1d4ed8", // links, badge numbers
          300: "#1e3a8a", // errors / deeper emphasis
          400: "#1d4ed8", // accent — buttons, focus, active
          500: "#1e40af", // hover accent
          600: "#172554", // deepest / pressed
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
