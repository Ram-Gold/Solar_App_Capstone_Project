/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
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

        /* JD Solar Design System Colors */
        "jd-primary": "#7c5800",
        "jd-primary-container": "#fdb813",
        "jd-on-primary": "#ffffff",
        "jd-on-primary-container": "#6b4b00",
        "jd-secondary": "#006399",
        "jd-secondary-container": "#67bafd",
        "jd-on-secondary": "#ffffff",
        "jd-on-secondary-container": "#004972",
        "jd-surface": "#fff8f3",
        "jd-surface-container": "#f9ecdc",
        "jd-surface-container-low": "#fff2e1",
        "jd-surface-container-high": "#f3e6d6",
        "jd-surface-container-highest": "#ede1d1",
        "jd-on-surface": "#211b11",
        "jd-on-surface-variant": "#504533",
        "jd-on-background": "#211b11",
        "jd-outline": "#837560",
        "jd-outline-variant": "#d5c4ac",
        "jd-inverse-surface": "#362f25",
        "jd-inverse-primary": "#ffbb1e",
        "jd-primary-fixed": "#ffdea7",
        "jd-secondary-fixed": "#cde5ff",
        "jd-tertiary": "#5b5f63",
        "jd-error": "#ba1a1a",
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
      },
      fontSize: {
        "headline-xl": ["48px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "700" }],
        "headline-lg-mobile": ["28px", { lineHeight: "1.25", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "1.4", letterSpacing: "0.01em", fontWeight: "500" }],
        "label-sm": ["12px", { lineHeight: "1.2", fontWeight: "600" }],
      },
      spacing: {
        "gutter": "24px",
        "container-max": "1200px",
        "margin-desktop": "40px",
        "margin-mobile": "16px",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
