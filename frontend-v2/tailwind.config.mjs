/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        chatgpt: {
          darkBg: '#212121',
          sidebarDark: '#171717',
          sidebarHoverDark: '#212121',
          cardDark: '#2f2f2f',
          borderDark: '#424242',
          inputDark: '#2f2f2f',
          textDark: '#ececec',
          textMutedDark: '#b4b4b4',
          accentGreen: '#10a37f',
          accentGreenHover: '#0e8e6f',
          lightBg: '#ffffff',
          sidebarLight: '#f9f9f9',
          sidebarHoverLight: '#ececec',
          cardLight: '#f4f4f4',
          borderLight: '#e5e5e5',
          inputLight: '#f4f4f4',
          textLight: '#0d0d0d',
          textMutedLight: '#676767',
        },
      },
      fontFamily: {
        sans: [
          'Söhne',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Ubuntu',
          'Cantarell',
          'Noto Sans',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
