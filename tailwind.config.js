/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef0fd",
          100: "#dfe1fb",
          200: "#b8bdf6",
          300: "#8f97f0",
          400: "#6b71ea",
          500: "#4F46E5",
          600: "#4338c9",
          700: "#372ea3",
          800: "#2c257f",
          900: "#211c5f",
        },
        accent: {
          50: "#f5f0fe",
          100: "#ece0fd",
          200: "#d5bcfa",
          300: "#b98af5",
          400: "#9d5cf0",
          500: "#7C3AED",
          600: "#652fc2",
          700: "#4f259a",
          800: "#3a1b72",
          900: "#281450",
        },
        pcps: {
          red: "#E31E24",
          blue: "#1B4FA0",
        },
      },
      fontFamily: {
        display: ["Poppins", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(79, 70, 229, 0.12)",
        card: "0 2px 12px -2px rgba(15, 23, 42, 0.08)",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out both",
        "slide-up": "slideUp 0.6s ease-out both",
        float: "float 6s ease-in-out infinite",
        "tilt-idle": "tiltIdle 7s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        slideUp: {
          "0%": { opacity: 0, transform: "translateY(24px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        tiltIdle: {
          "0%, 100%": { transform: "perspective(600px) rotateY(-10deg) rotateX(2deg)" },
          "50%": { transform: "perspective(600px) rotateY(10deg) rotateX(-2deg)" },
        },
      },
    },
  },
  plugins: [],
};
