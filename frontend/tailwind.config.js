/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                gold: {
                    50: '#fffbf0',
                    100: '#fef3d1',
                    200: '#fce5a3',
                    300: '#f9d16b',
                    400: '#f6b83f',
                    500: '#f19d20',
                    600: '#d97d16',
                    700: '#b45d14',
                    800: '#924a16',
                    900: '#783e15',
                    950: '#452008',
                },
                luxury: {
                    dark: '#0a0a0b',
                    card: '#141417',
                    border: '#2a2a2e',
                }
            },
            backgroundImage: {
                'gold-gradient': 'linear-gradient(135deg, #f9d16b 0%, #f19d20 50%, #b45d14 100%)',
                'dark-gradient': 'radial-gradient(circle at top left, #1c1c21 0%, #0a0a0b 100%)',
            },
            boxShadow: {
                'gold-glow': '0 0 20px rgba(241, 157, 32, 0.2)',
            }
        },
    },
    plugins: [],
}
