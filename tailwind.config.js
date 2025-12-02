/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.jsx",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // Primary Brand Color
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        slate: {
          850: '#151f32', // Custom dark background
          900: '#0f172a',
          950: '#020617',
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'premium': '0 2px 8px -2px rgba(0,0,0,0.05), 0 8px 24px -4px rgba(0,0,0,0.02)',
        'premium-hover': '0 4px 12px -2px rgba(0,0,0,0.08), 0 12px 32px -4px rgba(0,0,0,0.04)',
        'btn': '0 2px 4px rgba(37,99,235,0.2)',
        'btn-hover': '0 4px 12px rgba(37,99,235,0.3)',
      }
    },
  },
  plugins: [],
}
