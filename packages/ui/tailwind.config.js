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
      // Animations pour les bulles colorées et effets premium
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
        gradient: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'glow-pulse': {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(147, 51, 234, 0.3), 0 0 40px rgba(147, 51, 234, 0.1)' 
          },
          '50%': { 
            boxShadow: '0 0 30px rgba(147, 51, 234, 0.5), 0 0 60px rgba(147, 51, 234, 0.2)' 
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        ...sharedConfig.theme.extend.animation,
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        blob: 'blob 7s infinite',
        gradient: 'gradient 4s ease infinite',
        shimmer: 'shimmer 2s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(147, 51, 234, 0.3), 0 0 40px rgba(147, 51, 234, 0.1)',
        'glow-pink': '0 0 20px rgba(236, 72, 153, 0.3), 0 0 40px rgba(236, 72, 153, 0.1)',
        'glow-purple-lg': '0 10px 40px rgba(147, 51, 234, 0.4)',
      }
    }
  },
  plugins: []
};