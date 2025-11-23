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
