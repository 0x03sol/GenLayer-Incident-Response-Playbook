import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0f",
        foreground: "#f0f0f5",
        card: "#12121a",
        "card-foreground": "#f0f0f5",
        primary: "#6366f1",
        "primary-foreground": "#ffffff",
        secondary: "#1e1e2e",
        "secondary-foreground": "#f0f0f5",
        muted: "#1e1e2e",
        "muted-foreground": "#a0a0b0",
        accent: "#22d3ee",
        "accent-foreground": "#0a0a0f",
        destructive: "#ef4444",
        "destructive-foreground": "#ffffff",
        border: "#2a2a3a",
        ring: "#6366f1",
      },
      borderRadius: {
        lg: "0.625rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
