/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial"],
      },
      colors: {
        roseCustom: {
          50: "#fff5f7",
          100: "#ffeef2",
          200: "#ffd1e0",
          300: "#ffaad1",
          400: "#ff78b6",
          500: "#ff4f9b",
          600: "#e63b86",
          700: "#b92b63",
          800: "#8a1f48",
          900: "#5f1530",
        },
      },
      boxShadow: {
        soft: "0 6px 18px rgba(15, 23, 42, 0.08)",
        glow: "0 8px 30px rgba(255, 79, 155, 0.12)",
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [],
};
