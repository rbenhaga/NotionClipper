/** @type {import('tailwindcss').Config} */
module.exports = {
    theme: {
        extend: {
            colors: {
                'notion-gray': {
                    50: '#f7f7f5',
                    100: '#ededed',
                    200: '#e3e2e0',
                    300: '#d3d3d1',
                    400: '#b8b7b5',
                    500: '#9b9a97',
                    600: '#7c7b78',
                    700: '#5e5d5b',
                    800: '#3f3e3c',
                    900: '#25241f',
                },
                purple: {
                    50: '#faf5ff',
                    100: '#f3e8ff',
                    200: '#e9d5ff',
                    300: '#d8b4fe',
                    400: '#c084fc',
                    500: '#a855f7',
                    600: '#8B5CF6',
                    700: '#7c3aed',
                    800: '#6b21a8',
                    900: '#581c87',
                },
                blue: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#3b82f6',
                    600: '#3B82F6',
                    700: '#2563eb',
                    800: '#1d4ed8',
                    900: '#1e40af',
                },
                emerald: {
                    50: '#ecfdf5',
                    100: '#d1fae5',
                    200: '#a7f3d0',
                    300: '#6ee7b7',
                    400: '#34d399',
                    500: '#10b981',
                    600: '#059669',
                    700: '#047857',
                    800: '#065f46',
                    900: '#064e3b',
                }
            },
            animation: {
                'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'spin': 'spin 1s linear infinite',
                'bounce': 'bounce 1s infinite',
            },
            backdropBlur: {
                sm: '4px',
                md: '8px',
                lg: '12px',
            }
        }
    }
};