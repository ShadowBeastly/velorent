/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1', // Indigo 500
          600: '#4f46e5', // Indigo 600 - Primary
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        slate: {
          850: '#151f32', // Custom dark background
          900: '#0f172a',
          950: '#020617',
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'premium': '0 4px 20px -2px rgba(0,0,0,0.1), 0 8px 16px -4px rgba(0,0,0,0.05)',
        'premium-hover': '0 10px 25px -5px rgba(79, 70, 229, 0.15), 0 8px 10px -6px rgba(79, 70, 229, 0.1)',
        'btn': '0 2px 4px rgba(79, 70, 229, 0.2)',
        'btn-hover': '0 4px 12px rgba(79, 70, 229, 0.4)',
        'glow': '0 0 15px rgba(79, 70, 229, 0.5)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'conic-gradient(from 180deg at 50% 50%, #4f46e5 0deg, #818cf8 180deg, #4f46e5 360deg)',
      }
    },
  },
  plugins: [],
}
