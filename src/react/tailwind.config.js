/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        notion: {
          gray: {
            50: '#f7f6f3',
            100: '#f1f1ef', 
            200: '#e9e9e7',
            300: '#dfdedb',
            400: '#cdcbc7',
            500: '#b8b5b2',
            600: '#8d8b89',
            700: '#73726f',
            800: '#5c5b58',
            900: '#373530',
          }
        }
      },
      boxShadow: {
        'notion': '0 1px 3px rgba(15, 15, 15, 0.1)',
        'notion-lg': '0 4px 12px rgba(15, 15, 15, 0.15)',
        'notion-xl': '0 8px 25px rgba(15, 15, 15, 0.1)',
      },
      borderRadius: {
        'notion': '6px',
      }
    },
  },
  plugins: [],
}