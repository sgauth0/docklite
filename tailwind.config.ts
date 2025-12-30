import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        '3xl': '2560px',
      },
      gridTemplateColumns: {
        '8': 'repeat(8, minmax(0, 1fr))',
      }
    },
  },
  plugins: [],
}
export default config
