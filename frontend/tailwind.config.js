/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors for conditional formatting
        'status-completed': '#C8E6C9',
        'status-na': '#E0E0E0',
        'status-overdue': '#FFCDD2',
        'status-due-soon': '#FFF9C4',
        'hgba1c-green': '#C8E6C9',
        'hgba1c-orange': '#FFE0B2',
        'hgba1c-red': '#FFCDD2',
        'hgba1c-gray': '#E0E0E0',
      },
    },
  },
  plugins: [],
}
