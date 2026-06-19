/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.js", "./src/**/*.{js,jsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#FF6400",
        success: "#00A85A",
        danger: "#DC2626",
        ink: "#1F2933",
        muted: "#6B7280",
        surface: "#FFF7F3",
        border: "#E5E7EB"
      }
    }
  },
  plugins: []
};
