const sharedConfig = require('./tailwind.config.shared');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // ✅ Active le mode sombre avec la classe 'dark'
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{html,js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      ...sharedConfig.theme.extend,
      colors: {
        ...sharedConfig.theme.extend.colors,
        'notion-gray': {
          50: '#F7F6F3',
          100: '#EFEDE8',
          200: '#E6E4E0',
          300: '#D1CFC9',
          400: '#A09D96',
          500: '#787774',
          600: '#5C5A56',
          700: '#3F3E3C',
          800: '#2F2E2C',
          900: '#1A1918'
        }
      },
      // Animations pour les bulles colorées
      keyframes: {
        blob: {
          '0%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
          '33%': {
            transform: 'translate(30px, -50px) scale(1.1)',
          },
          '66%': {
            transform: 'translate(-20px, 20px) scale(0.9)',
          },
          '100%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
        },
      },
      animation: {
        ...sharedConfig.theme.extend.animation,
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        blob: 'blob 7s infinite',
      }
    }
  },
  plugins: []
};