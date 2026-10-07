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
        "primary": "#006b2c",
        "primary-container": "#00873a",
        "primary-fixed": "#7ffc97",
        "primary-fixed-dim": "#62df7d",
        "on-primary": "#ffffff",
        "on-primary-container": "#f7fff2",
        "secondary": "#855300",
        "secondary-container": "#fea619",
        "secondary-fixed": "#ffddb8",
        "on-secondary": "#ffffff",
        "tertiary": "#a72d51",
        "tertiary-container": "#c74668",
        "on-tertiary": "#ffffff",
        "surface": "#f4fcf0",
        "surface-dim": "#d5dcd1",
        "surface-bright": "#f4fcf0",
        "surface-container": "#e9f0e5",
        "surface-container-low": "#eff6ea",
        "surface-container-high": "#e3eadf",
        "surface-container-highest": "#dde5d9",
        "surface-container-lowest": "#ffffff",
        "on-surface": "#171d16",
        "on-surface-variant": "#3e4a3d",
        "outline": "#6e7b6c",
        "outline-variant": "#bdcaba",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      fontFamily: {
        sans: ["Inter", "Be Vietnam Pro", "sans-serif"],
        heading: ["Be Vietnam Pro", "sans-serif"],
      }
    }
  },
  plugins: [
    // Plugins can be enabled if installed
  ],
};
