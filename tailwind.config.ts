import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ⚠️ Agora essas cores leem as CSS vars (que mudam com o tema)
        // em vez de hex fixo. O formato "rgb(var(--x) / <alpha-value>)"
        // é o que permite bg-surface/80, bg-surface/95 etc funcionarem
        // corretamente em QUALQUER tema.
        void: "rgb(var(--bg-void) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--bg-surface) / <alpha-value>)",
          raised: "rgb(var(--bg-surface-raised) / <alpha-value>)",
          "raised-2": "rgb(var(--bg-surface-raised-2) / <alpha-value>)",
          border: "rgb(var(--border-surface) / <alpha-value>)",
        },
        ink: {
          primary: "rgb(var(--text-ink-primary) / <alpha-value>)",
          muted: "rgb(var(--text-ink-muted) / <alpha-value>)",
          faint: "rgb(var(--text-ink-faint) / <alpha-value>)",
        },
        // Cores fixas — não dependem de tema, continuam hex normal
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
