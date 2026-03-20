/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./services/**/*.{js,jsx,ts,tsx}",
    "./contexts/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        surface: "#111111",
        surface2: "#1a1a1a",
        border: "#222222",
        txt: "#e0e0e0",
        muted: "#666666",
        muted2: "#888888",
        lime: "#c8ff00",
        cyan: "#00e5ff",
        warn: "#ffaa00",
        ok: "#00e676",
        danger: "#ff5252",
        pink: "#ff6b9d",
        purple: "#c084fc",
      },
      fontFamily: {
        barlow: ["Barlow"],
        "barlow-bold": ["Barlow-Bold"],
        "barlow-semibold": ["Barlow-SemiBold"],
      },
    },
  },
  plugins: [],
};
