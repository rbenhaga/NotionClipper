const sharedConfig = require('../../packages/ui/tailwind.config.shared');

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./entrypoints/**/*.{ts,tsx}",
        "../../packages/ui/src/**/*.{js,jsx,ts,tsx}"
    ],
    theme: {
        extend: {
            ...sharedConfig.theme.extend
        }
    },
    plugins: [],
};