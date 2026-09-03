import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      fontFamily: {
        sans: ["Archivo", "ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"],
        display: ["Fraunces", "Georgia", "Times New Roman", "serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          muted: "hsl(var(--sidebar-muted))",
          active: "hsl(var(--sidebar-active))",
          border: "hsl(var(--sidebar-border))",
        },
        /* Fixed editorial palette (theme-independent) */
        ink: {
          DEFAULT: "#191611",
          soft: "#3A362D",
        },
        cream: {
          DEFAULT: "#F0EADB",
          dim: "#C4BCA9",
          faint: "#8B8574",
        },
        /* The always-dark interview room ("the study") */
        room: {
          DEFAULT: "#10150F",
          panel: "#1A211A",
          raised: "#232B23",
          line: "#39423A",
        },
        /* Fixed accents for the always-dark room (theme-independent) */
        mint: "#7EBD97",
        ember: "#E8763B",
        brand: {
          green: "#205741",
          persimmon: "#C7561B",
          gold: "#B58A2C",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        press: "4px 4px 0 0 hsl(var(--shadow-hard))",
        "press-sm": "2px 2px 0 0 hsl(var(--shadow-hard))",
        "press-lg": "6px 6px 0 0 hsl(var(--shadow-hard))",
        card: "0 1px 0 0 hsl(var(--shadow-hard) / 0.06)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.55", transform: "scale(0.82)" },
        },
        "stamp-in": {
          "0%": { opacity: "0", transform: "scale(1.6) rotate(-2deg)" },
          "60%": { opacity: "1", transform: "scale(0.94) rotate(-11deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(-9deg)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.55s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        "pulse-dot": "pulse-dot 1.4s ease-in-out infinite",
        "stamp-in": "stamp-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "spin-slow": "spin-slow 24s linear infinite",
        marquee: "marquee 36s linear infinite",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
