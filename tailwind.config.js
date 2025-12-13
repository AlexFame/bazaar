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
      backgroundImage: {
        'anzo-gradient': 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
        'anzo-dark-gradient': 'radial-gradient(circle at 50% 0%, #2a0505 0%, #000000 70%)',
      },
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

        // Airbnb Style
        "airbnb-red": "#FF385C",
        "airbnb-gray": "#F7F7F7",
        "airbnb-text": "#222222",
        "airbnb-text-secondary": "#717171",

        // Semantic Colors (CSS Variables)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",

        // Anzo Dark Mode (Kept for reference or specific use)
        "anzo-black": "#000000",
        "anzo-dark": "#0A0A0A",
        "anzo-card": "#121212",
        "anzo-red": "#DC2626", // Red-600
      },
      boxShadow: {
        'airbnb': '0 6px 16px rgba(0,0,0,0.12)',
        'airbnb-hover': '0 6px 20px rgba(0,0,0,0.15)',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
