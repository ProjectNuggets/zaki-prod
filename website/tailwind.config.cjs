module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: ["class", ".theme-bot"],
  theme: {
    extend: {
      colors: {
        chat: {
          bg: "var(--chat-bg)",
          surface: "var(--chat-surface)",
          "surface-raised": "var(--chat-surface-raised)",
          text: "var(--chat-text)",
          muted: "var(--chat-muted)",
          accent: "var(--chat-accent)",
          "accent-hover": "var(--chat-accent-hover)",
        },
        bot: {
          bg: "var(--bot-bg)",
          surface: "var(--bot-surface)",
          "surface-raised": "var(--bot-surface-raised)",
          text: "var(--bot-text)",
          muted: "var(--bot-muted)",
          accent: "var(--bot-accent)",
          "accent-hover": "var(--bot-accent-hover)",
        },
        line: {
          DEFAULT: "var(--line)",
          light: "var(--line-light)",
          strong: "var(--line-strong)",
          "dark-strong": "var(--line-dark-strong)",
        },
      },
      fontFamily: {
        display: ['"Cabinet Grotesk"', "sans-serif"],
        "mono-ui": ['"DM Mono"', "monospace"],
        arabic: ['"IBM Plex Sans Arabic"', '"Plus Jakarta Sans"', "sans-serif"],
      },
      borderRadius: {
        card: "28px",
        pill: "18px",
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
        "cursor-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.25s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
