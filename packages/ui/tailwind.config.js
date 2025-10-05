const sharedConfig = require('./tailwind.config.shared');

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/**/*.{tsx,ts,jsx,js}"
    ],
    theme: {
        extend: {
            ...sharedConfig.theme.extend
        }
    },
    plugins: [],
};