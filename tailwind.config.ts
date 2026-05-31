import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        green: {
          DEFAULT: '#009A51',
          deep: '#007a40',
          bright: '#12b563',
          soft: 'rgba(0,154,81,0.10)',
        },
        forest: {
          DEFAULT: '#003C20',
          soft: 'rgba(0,60,32,0.06)',
        },
        gain: '#009A51',
        loss: '#c0492f',
        gold: '#b98a2e',
      },
      fontFamily: {
        serif: ['Spectral', 'Georgia', 'serif'],
        sans: ['Hanken Grotesk', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '14px',
        lg: '22px',
        xl: '30px',
      },
      boxShadow: {
        sm: '0 1px 4px rgba(0,60,32,0.06), 0 0 0 1px rgba(0,60,32,0.04)',
        DEFAULT: '0 4px 16px rgba(0,60,32,0.08), 0 1px 4px rgba(0,60,32,0.05)',
        lg: '0 8px 32px rgba(0,60,32,0.12), 0 2px 8px rgba(0,60,32,0.07)',
      },
    },
  },
  plugins: [],
}
export default config
