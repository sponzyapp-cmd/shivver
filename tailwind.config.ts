import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--color-border))",
        input: "hsl(var(--color-border))",
        ring: "hsl(var(--color-accent))",
        background: "hsl(var(--color-base))",
        foreground: "hsl(var(--color-text))",
        primary: {
          DEFAULT: "hsl(var(--color-accent))",
          foreground: "hsl(var(--color-base))",
        },
        secondary: {
          DEFAULT: "hsl(var(--color-surface-secondary))",
          foreground: "hsl(var(--color-text))",
        },
        destructive: {
          DEFAULT: "hsl(var(--color-error))",
          foreground: "hsl(var(--color-base))",
        },
        muted: {
          DEFAULT: "hsl(var(--color-surface-secondary))",
          foreground: "hsl(var(--color-text-tertiary))",
        },
        accent: {
          DEFAULT: "hsl(var(--color-accent))",
          foreground: "hsl(var(--color-base))",
        },
        popover: {
          DEFAULT: "hsl(var(--color-surface))",
          foreground: "hsl(var(--color-text))",
        },
        card: {
          DEFAULT: "hsl(var(--color-surface))",
          foreground: "hsl(var(--color-text))",
        },
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
    },
  },
  plugins: [],
};

export default config;
