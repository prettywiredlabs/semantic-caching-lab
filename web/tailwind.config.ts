import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#F5F1EA",
          50: "#FBF8F2",
          100: "#F5F1EA",
          200: "#EFE7D8",
          300: "#E5D9C2",
        },
        ink: {
          DEFAULT: "#1F2421",
          muted: "#5A5C58",
          subtle: "#8A8B85",
          line: "#D9D1BF",
        },
        forest: {
          DEFAULT: "#1F3D2E",
          deep: "#16301F",
          soft: "#3F6B53",
          mist: "#C8D6CC",
        },
        warm: {
          50: "#FAF7EF",
          100: "#F1EBDB",
          200: "#E5DCC4",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        label: "0.18em",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(31, 36, 33, 0.04), 0 8px 24px -12px rgba(31, 36, 33, 0.08)",
        drawer: "0 10px 40px -10px rgba(31, 36, 33, 0.25)",
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
