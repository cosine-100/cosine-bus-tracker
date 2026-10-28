/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./views/**/*.ejs', './public/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        ink: '#000000',
        charcoal: '#1c1c1c',
        gold: { DEFAULT: '#C8A24A', deep: '#9C7A1E', soft: '#F7F1E1' },
        line: '#E8E4D9',
        muted: '#6b6b6b',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Jost', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 40px -12px rgba(0,0,0,0.14)',
        lift: '0 24px 60px -18px rgba(0,0,0,0.28)',
        gold: '0 12px 32px -10px rgba(200,162,74,0.55)',
      },
      keyframes: {
        rise: { '0%': { opacity: 0, transform: 'translateY(22px)' }, '100%': { opacity: 1, transform: 'none' } },
        ring: { '0%': { transform: 'scale(.6)', opacity: 0.7 }, '100%': { transform: 'scale(2.2)', opacity: 0 } },
      },
      animation: {
        rise: 'rise .9s cubic-bezier(.2,.7,.2,1) both',
        ring: 'ring 2.4s ease-out infinite',
      },
    },
  },
  plugins: [],
};
