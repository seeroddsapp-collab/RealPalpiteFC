import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070910',
          900: '#0D0F1A',
          800: '#141727',
          700: '#1C2035',
        },
        gold: {
          300: '#E2C97E',
          400: '#D4B05A',
          500: '#C9A84C',
          600: '#B8943F',
          700: '#9A7A30',
        },
      },
    },
  },
  plugins: [],
}
export default config
