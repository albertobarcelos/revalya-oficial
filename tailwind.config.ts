import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        // AIDEV-NOTE: Fontes padronizadas conforme Omie
        sans: ['"Open Sans"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        body: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      fontSize: {
        // AIDEV-NOTE: Tamanhos padronizados conforme Omie (valores fixos em px)
        'xs': '12px',           // Select Omie (sobrescreve padrão Tailwind)
        'sm': '13.2px',         // Tables Omie (sobrescreve padrão Tailwind)
        'base': '14px',         // Body, Inputs, Buttons Omie (sobrescreve padrão Tailwind)
        'lg': '16px',           // Headings Omie (sobrescreve padrão Tailwind)
        'xl': '22px',           // Labels grandes Omie (sobrescreve padrão Tailwind)
        '2xl': '24px',          // Tamanho extra grande
        '3xl': '30px',          // Tamanho extra extra grande
        // Tamanhos específicos Omie (mantidos para referência)
        'omie-xs': '12px',      // Select
        'omie-sm': '13.2px',    // Tables
        'omie-base': '14px',    // Body, Inputs, Buttons, Links (padrão)
        'omie-md': '16px',      // Headings (H1, H2, H3)
        'omie-lg': '22px',      // Labels grandes
      },
      lineHeight: {
        // AIDEV-NOTE: Line heights padronizados conforme Omie
        'omie-tight': '15.4px',   // H4
        'omie-normal': '17.6px',  // H1, H2, H3
        'omie-base': '20px',      // Body, Inputs, Buttons
        'omie-relaxed': '18.48px', // Tables
        'omie-loose': '31.4286px', // Labels grandes
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
          light: "hsl(var(--primary-light))",
          dark: "hsl(var(--primary-dark))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          light: "hsl(var(--success-light))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
          light: "hsl(var(--danger-light))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          light: "hsl(var(--warning-light))",
        },
        neutral: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;