import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'app-bg': '#0e1117',
        'app-card': '#1e2227',
        'app-green': '#4CAF50',
        'app-cyan': '#00BCD4',
      },
    },
  },
  plugins: [],
};
export default config;