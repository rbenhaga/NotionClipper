/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{html,tsx,ts}'],
    theme: {
        extend: {
            colors: {
                notion: {
                    DEFAULT: '#000000',
                    gray: '#787774',
                    lightgray: '#F7F6F3',
                }
            }
        },
    },
    plugins: [],
}