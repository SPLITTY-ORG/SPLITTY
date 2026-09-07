/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      colors: {
        bg: "#15100B",
        panel: "#1D1712",
        "panel-raised": "#241B14",
        amber: "#F2B134",
        "amber-dim": "#8A6A2C",
        "amber-glow": "rgba(242,177,52,0.32)",
        cream: "#EDE3D0",
        "cream-dim": "#9C917E",
        line: "rgba(242,177,52,0.16)",
        success: "#4ADE80",
        danger: "#C4553D",
      },
      boxShadow: {
        "amber-glow": "0 0 20px rgba(242,177,52,0.2)",
      },
      borderRadius: {
        DEFAULT: "5px",
      },
    },
  },
  plugins: [],
};
