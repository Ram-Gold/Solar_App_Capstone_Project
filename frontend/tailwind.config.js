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
        /* === shadcn/ui CSS variable tokens (keep for existing components) === */
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

        /* === JD Solar Design System (DESIGN.md) — prefixed with jds- === */
        // Surfaces
        "jds-surface": "#fff8f3",
        "jds-surface-dim": "#e5d8c8",
        "jds-surface-bright": "#fff8f3",
        "jds-surface-container-lowest": "#ffffff",
        "jds-surface-container-low": "#fff2e1",
        "jds-surface-container": "#f9ecdc",
        "jds-surface-container-high": "#f3e6d6",
        "jds-surface-container-highest": "#ede1d1",
        "jds-surface-variant": "#ede1d1",
        "jds-surface-tint": "#7c5800",

        // On-surface
        "jds-on-surface": "#211b11",
        "jds-on-surface-variant": "#504533",
        "jds-on-background": "#211b11",

        // Primary
        "jds-primary": "#7c5800",
        "jds-on-primary": "#ffffff",
        "jds-primary-container": "#fdb813",
        "jds-on-primary-container": "#6b4b00",
        "jds-primary-fixed": "#ffdea7",
        "jds-primary-fixed-dim": "#ffbb1e",
        "jds-on-primary-fixed": "#271900",
        "jds-on-primary-fixed-variant": "#5e4200",

        // Secondary
        "jds-secondary": "#006399",
        "jds-on-secondary": "#ffffff",
        "jds-secondary-container": "#67bafd",
        "jds-on-secondary-container": "#004972",
        "jds-secondary-fixed": "#cde5ff",
        "jds-secondary-fixed-dim": "#94ccff",
        "jds-on-secondary-fixed": "#001d32",
        "jds-on-secondary-fixed-variant": "#004b74",

        // Tertiary
        "jds-tertiary": "#5b5f63",
        "jds-on-tertiary": "#ffffff",
        "jds-tertiary-container": "#c1c4c9",
        "jds-on-tertiary-container": "#4d5156",
        "jds-tertiary-fixed": "#e0e3e8",
        "jds-tertiary-fixed-dim": "#c3c7cc",
        "jds-on-tertiary-fixed": "#181c20",
        "jds-on-tertiary-fixed-variant": "#43474c",

        // Error
        "jds-error": "#ba1a1a",
        "jds-on-error": "#ffffff",
        "jds-error-container": "#ffdad6",
        "jds-on-error-container": "#93000a",

        // Outline
        "jds-outline": "#837560",
        "jds-outline-variant": "#d5c4ac",

        // Inverse
        "jds-inverse-surface": "#362f25",
        "jds-inverse-on-surface": "#fcefdf",
        "jds-inverse-primary": "#ffbb1e",

        // Legacy aliases (used in LandingPage)
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
        "headline-xl": ["clamp(1.75rem, 4.5vw, 2.75rem)", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["clamp(1.25rem, 3.2vw, 1.875rem)", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "700" }],
        "headline-lg-mobile": ["clamp(1.15rem, 2.8vw, 1.45rem)", { lineHeight: "1.25", fontWeight: "700" }],
        "headline-md": ["clamp(1rem, 2.2vw, 1.35rem)", { lineHeight: "1.3", fontWeight: "600" }],
        "headline-sm": ["0.9375rem", { lineHeight: "1.35", fontWeight: "600" }],
        "body-lg": ["clamp(0.925rem, 1.5vw, 1.05rem)", { lineHeight: "1.55", fontWeight: "400" }],
        "body-md": ["clamp(0.8125rem, 1vw, 0.9375rem)", { lineHeight: "1.5", fontWeight: "400" }],
        "label-md": ["0.8125rem", { lineHeight: "1.4", letterSpacing: "0.01em", fontWeight: "500" }],
        "label-sm": ["0.7rem", { lineHeight: "1.25", fontWeight: "600" }],
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
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [],
}
