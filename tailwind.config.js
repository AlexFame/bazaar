/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        xs: ['0.85rem', { lineHeight: '1.2rem' }],
        sm: ['1rem', { lineHeight: '1.5rem' }],
        base: ['1.15rem', { lineHeight: '1.75rem' }],
        lg: ['1.25rem', { lineHeight: '1.75rem' }],
        xl: ['1.5rem', { lineHeight: '2rem' }],
        '2xl': ['1.75rem', { lineHeight: '2.25rem' }],
        '3xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      colors: {
        // фирменные цвета
        "brand-yellow": "#FFD60A",
        "brand-yellow-dark": "#FFC300",
        "brand-yellow-light": "#FFF5CC",

        "brand-black": "#000000",
        "brand-gray-dark": "#1D1D1D",
        "brand-gray": "#6B6B6B",
        "brand-white": "#FFFFFF",

        "brand-purple": "#6F3CF6",
        "brand-purple-dark": "#582DCB",
        "brand-purple-light": "#E6D9FF",
      },
    },
  },
  plugins: [],
};
