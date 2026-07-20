import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#0A0C0F",
        surface: {
          DEFAULT: "#14181D",
          raised: "#1C2128",
          border: "#262C34",
        },
        steel: {
          DEFAULT: "#5B7C99",
          light: "#7C9CB5",
          dark: "#3E566B",
        },
        ice: {
          DEFAULT: "#7DD3FC",
          soft: "#A5E3FE",
        },
        coral: "#E8735C",
        ink: {
          primary: "#E8EBEF",
          muted: "#7C8592",
          faint: "#4A515C",
        },
        // Cores claras (para tema light)
        light: {
          void: "#F1F5F9",
          surface: {
            DEFAULT: "#FFFFFF",
            raised: "#F8FAFC",
            border: "#E2E8F0",
          },
          ink: {
            primary: "#0F172A",
            muted: "#475569",
            faint: "#94A3B8",
          },
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "28px",
        sheet: "32px",
      },
      backdropBlur: {
        glass: "20px",
      },
      boxShadow: {
        vault: "0 8px 32px -8px rgba(0,0,0,0.5)",
        "vault-light": "0 8px 32px -8px rgba(0,0,0,0.08)",
        rivet: "inset 0 1px 0 0 rgba(255,255,255,0.04)",
      },
    },
  },
  plugins: [],
};

export default config;