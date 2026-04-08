/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Indivara brand palette
        brand: {
          50:  '#ecfbfd',
          100: '#d0f4f9',
          200: '#a3e9f2',
          300: '#6dd7e6',
          400: '#3DBFD4', // primary cyan-blue
          500: '#22a8c0',
          600: '#1c8aa1',
          700: '#1b6f82',
          800: '#1c5b6b',
          900: '#1b4b58',
        },
        accent: {
          // Deep blue for buttons
          500: '#2D7CE6',
          600: '#1E5BC6',
          700: '#1849a3',
        },
        bannerBg: '#D8F0F5', // Indivara light banner blue
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
