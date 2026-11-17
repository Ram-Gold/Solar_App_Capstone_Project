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

        /* === JD Solar Warm Ivory Design System — prefixed with jds- === */
        // Chrome (Unified Topbar + Left Sidebar L-frame)
        "jds-chrome": "#efe9df",
        "jds-chrome-hover": "#e6dfd3",
        "jds-chrome-border": "#dfd7c8",

        // Surfaces
        "jds-surface": "#fcfbf8",
        "jds-surface-dim": "#ebe4d7",
        "jds-surface-bright": "#fcfbf8",
        "jds-surface-container-lowest": "#ffffff",
        "jds-surface-container-low": "#f9f6f0",
        "jds-surface-container": "#f4efe6",
        "jds-surface-container-high": "#ebe4d7",
        "jds-surface-container-highest": "#e2d9c8",
        "jds-surface-variant": "#eae3d7",
        "jds-surface-tint": "#b45309",

        // On-surface
        "jds-on-surface": "#211b11",
        "jds-on-surface-variant": "#655a4b",
        "jds-on-background": "#211b11",

        // Primary (Solar Amber — WCAG AA >= 4.5:1 with #ffffff)
        "jds-primary": "#b45309",
        "jds-on-primary": "#ffffff",
        "jds-primary-container": "#fdb813",
        "jds-on-primary-container": "#271900",
        "jds-primary-fixed": "#fef3c7",
        "jds-primary-fixed-dim": "#fde68a",
        "jds-on-primary-fixed": "#271900",
        "jds-on-primary-fixed-variant": "#78350f",

        // Secondary
        "jds-secondary": "#0369a1",
        "jds-on-secondary": "#ffffff",
        "jds-secondary-container": "#e0f2fe",
        "jds-on-secondary-container": "#0c4a6e",
        "jds-secondary-fixed": "#e0f2fe",
        "jds-secondary-fixed-dim": "#bae6fd",
        "jds-on-secondary-fixed": "#082f49",
        "jds-on-secondary-fixed-variant": "#075985",

        // Tertiary
        "jds-tertiary": "#655a4b",
        "jds-on-tertiary": "#ffffff",
        "jds-tertiary-container": "#ebe4d7",
        "jds-on-tertiary-container": "#3f382e",
        "jds-tertiary-fixed": "#f4efe6",
        "jds-tertiary-fixed-dim": "#e5ddd0",
        "jds-on-tertiary-fixed": "#211b11",
        "jds-on-tertiary-fixed-variant": "#504533",

        // Error
        "jds-error": "#b91c1c",
        "jds-on-error": "#ffffff",
        "jds-error-container": "#fee2e2",
        "jds-on-error-container": "#991b1b",

        // Outline
        "jds-outline": "#8c7f6d",
        "jds-outline-variant": "#eae3d7",

        // Inverse
        "jds-inverse-surface": "#362f25",
        "jds-inverse-on-surface": "#fcfbf8",
        "jds-inverse-primary": "#fdb813",

        // Legacy aliases (used in LandingPage)
        "jd-primary": "#b45309",
        "jd-primary-container": "#fdb813",
        "jd-on-primary": "#ffffff",
        "jd-on-primary-container": "#271900",
        "jd-secondary": "#0369a1",
        "jd-secondary-container": "#e0f2fe",
        "jd-on-secondary": "#ffffff",
        "jd-on-secondary-container": "#0c4a6e",
        "jd-surface": "#fcfbf8",
        "jd-surface-container": "#f4efe6",
        "jd-surface-container-low": "#f9f6f0",
        "jd-surface-container-high": "#ebe4d7",
        "jd-surface-container-highest": "#e2d9c8",
        "jd-on-surface": "#211b11",
        "jd-on-surface-variant": "#655a4b",
        "jd-on-background": "#211b11",
        "jd-outline": "#8c7f6d",
        "jd-outline-variant": "#eae3d7",
        "jd-inverse-surface": "#362f25",
        "jd-inverse-primary": "#fdb813",
        "jd-primary-fixed": "#fef3c7",
        "jd-secondary-fixed": "#e0f2fe",
        "jd-tertiary": "#655a4b",
        "jd-error": "#b91c1c",
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
      boxShadow: {
        "2xs": "0 1px 1px 0 rgb(33 27 17 / 0.03)",
        xs: "0 1px 2px 0 rgb(33 27 17 / 0.05)",
      },
      backdropBlur: {
        xs: "2px",
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
