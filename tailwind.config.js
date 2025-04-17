/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Add your custom colors here
        'google-blue': '#1a73e8',
        'google-red': '#ea4335',
        'google-green': '#34a853',
        'google-yellow': '#fbbc04',
      },
    },
  },
  plugins: [],
} 