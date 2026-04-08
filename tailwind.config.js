/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Indivara deep-blue brand palette (matches Avantrade mobile UI)
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // primary buttons
          700: '#1d4ed8',
          800: '#1e40af', // headers / banners
          900: '#1e3a8a', // deepest accent
        },
        accent: {
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
        },
        // Light banner background for page headers
        bannerBg: '#eff6ff',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
