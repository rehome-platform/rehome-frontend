/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Design tokens.pdf
        "primary": "#006B2C",
        "primary-hover": "#005523",
        "secondary": "#FEA619",
        "secondary-hover": "#E59412",
        "accent": "#00685F",
        "accent-hover": "#005049",
        "neutral": "#DDE5D9",
        "neutral-light": "#EBF1E8",
        "background": "#F6F9F4",
        "surface": "#FFFFFF",
        "text": "#1F2A37",
        "textSecondary": "#5B6776",
        "error": "#D92D20",
        "error-light": "#FEE4E2",
        "success": "#006B2C",
        "success-light": "#E8F5E9",
        
        // Backward-compatibility aliases for existing code
        "on-primary": "#ffffff",
        "on-secondary": "#1F2A37",
        "on-surface": "#1F2A37",
        "on-surface-variant": "#5B6776",
        "outline": "#717971",
        "outline-variant": "#DDE5D9",
        "surface-container": "#F6F9F4",
        "surface-container-low": "#F6F9F4",
        "surface-container-lowest": "#FFFFFF",
        "surface-container-high": "#EBF1E8",
        "surface-container-highest": "#DDE5D9",
      },
      borderRadius: {
        "DEFAULT": "0.5rem",
        "input": "12px",
        "button": "12px",
        "card": "16px",
        "xl": "12px",
        "2xl": "16px",
        "full": "9999px",
      },
      boxShadow: {
        "card": "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
        "card-hover": "0 8px 24px -4px rgba(0, 107, 44, 0.08)",
        "elevated": "0 12px 32px -4px rgba(0, 107, 44, 0.12)",
      },
      fontFamily: {
        sans: ["'Be Vietnam Pro'", "sans-serif"],
        heading: ["'Be Vietnam Pro'", "sans-serif"],
      }
    }
  },
  plugins: [],
};
