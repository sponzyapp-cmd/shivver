import type {Config} from 'tailwindcss';

const {fontFamily} = require('tailwindcss/defaultTheme');

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      spacing: {
        '14': '3.5rem',
        '15': '3.75rem',
        '16': '4rem',
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
      },
      fontWeight: {
        thin: '200',
        extralight: '200',
        light: '300',
        normal: '300',
        semibold: '600',
        bold: '700',
      },
      colors: {
        'sponzy-mint': '#e8f0ee',
        'sponzy-coral': '#ff9e86',
        'sponzy-lime': '#78e490',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
        '3xl': 'calc(var(--radius) + 16px)',
      },
      keyframes: {
        'accordion-down': {
          from: {height: '0'},
          to: {height: 'var(--radix-accordion-content-height)'},
        },
        'accordion-up': {
          from: {height: 'var(--radix-accordion-content-height)'},
          to: {height: '0'},
        },
        'fade-in-up': {
          '0%': {opacity: '0', transform: 'translateY(1rem)'},
          '100%': {opacity: '1', transform: 'translateY(0)'},
        },
        'pulse-slow': {
          '0%, 100%': {transform: 'scale(1)', opacity: '0.3'},
          '50%': {transform: 'scale(1.1)', opacity: '0.5'},
        },
        'ticket-confetti-fall': {
          '0%': {transform: 'translateY(-15px) rotate(0deg) scale(0.8)', opacity: '0'},
          '15%': {opacity: '1'},
          '100%': {transform: 'translateY(340px) rotate(780deg) scale(1)', opacity: '0'},
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in-up': 'fade-in-up 0.3s ease-out forwards',
        'pulse-slow': 'pulse-slow 8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      boxShadow: {
        primary: '0 0 20px hsl(var(--primary) / 0.5)',
        'soft-sm': '0 2px 4px hsl(var(--foreground) / 0.03), 0 1px 2px hsl(var(--foreground) / 0.06)',
        'soft': '0 4px 8px hsl(var(--foreground) / 0.05), 0 2px 4px hsl(var(--foreground) / 0.1)',
        'soft-md': '0 6px 12px hsl(var(--foreground) / 0.05), 0 3px 6px hsl(var(--foreground) / 0.1)',
        'soft-lg': '0 10px 20px hsl(var(--foreground) / 0.08), 0 5px 10px hsl(var(--foreground) / 0.13)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;