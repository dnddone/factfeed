/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        cream: "#F7F1E7",
        keep: "#E9A23B",
        pass: "#8FA0B4",
      },
    },
  },
  plugins: [],
};
