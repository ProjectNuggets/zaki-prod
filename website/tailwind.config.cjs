module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        zk: {
          bg: "var(--zk-bg)",
          "bg-raised": "var(--zk-bg-raised)",
          surface: "var(--zk-surface)",
          "surface-hover": "var(--zk-surface-hover)",
          "surface-active": "var(--zk-surface-active)",
          text: "var(--zk-text)",
          "text-secondary": "var(--zk-text-secondary)",
          "text-tertiary": "var(--zk-text-tertiary)",
          "text-ghost": "var(--zk-text-ghost)",
          accent: "var(--zk-accent)",
          "accent-hover": "var(--zk-accent-hover)",
          "accent-muted": "var(--zk-accent-muted)",
          "accent-glow": "var(--zk-accent-glow)",
          "accent-subtle": "var(--zk-accent-subtle)",
          border: "var(--zk-border)",
          "border-strong": "var(--zk-border-strong)",
          "border-accent": "var(--zk-border-accent)",
          success: "var(--zk-success)",
          warning: "var(--zk-warning)",
          error: "var(--zk-error)",
        },
        /* Legacy aliases for unmigrated components */
        chat: {
          bg: "var(--zk-bg)",
          surface: "var(--zk-surface)",
          "surface-raised": "var(--zk-surface-hover)",
          text: "var(--zk-text)",
          muted: "var(--zk-text-secondary)",
          accent: "var(--zk-accent)",
          "accent-hover": "var(--zk-accent-hover)",
        },
        bot: {
          bg: "var(--zk-bg)",
          surface: "var(--zk-surface)",
          "surface-raised": "var(--zk-surface-hover)",
          text: "var(--zk-text)",
          muted: "var(--zk-text-secondary)",
          accent: "var(--zk-accent)",
          "accent-hover": "var(--zk-accent-hover)",
        },
        line: {
          DEFAULT: "var(--zk-border)",
          light: "var(--zk-border)",
          strong: "var(--zk-border-strong)",
          "dark-strong": "var(--zk-border-strong)",
        },
      },
      fontFamily: {
        display: ['"Cabinet Grotesk"', "sans-serif"],
        logo: ['"Climate Crisis"', '"Cabinet Grotesk"', "sans-serif"],
        "mono-ui": ['"DM Mono"', "monospace"],
        arabic: ['"Zain"', "sans-serif"],
        body: ['"Plus Jakarta Sans"', "sans-serif"],
      },
      borderRadius: {
        card: "20px",
        pill: "14px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "border-beam": {
          "0%": { offsetDistance: "0%" },
          "100%": { offsetDistance: "100%" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-scale": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "number-tick": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.25s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2.5s linear infinite",
        "border-beam": "border-beam 4s linear infinite",
        "fade-in": "fade-in 0.6s ease-out forwards",
        "fade-in-scale": "fade-in-scale 0.5s ease-out forwards",
      },
    },
  },
  plugins: [],
};
