/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.js", "./src/**/*.{js,jsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#FF6400",
        ink: "#1F2933",
        muted: "#6B7280",
        surface: "#FFF7F3"
      }
    }
  },
  plugins: []
};
