// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'notion-gray': {
          50: '#f7f7f5',
          100: '#ebebea',
          200: '#d7d7d4',
          300: '#b3b3ad',
          400: '#9b9b93',
          500: '#82827a',
          600: '#65655d',
          700: '#50504a',
          800: '#37352f',
          900: '#191919',
        }
      },
      borderRadius: {
        'notion': '6px',
      },
      boxShadow: {
        'notion': '0 2px 4px rgba(0, 0, 0, 0.1)',
        'notion-lg': '0 4px 8px rgba(0, 0, 0, 0.1)',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}