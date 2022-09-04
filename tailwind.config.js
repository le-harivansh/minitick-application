const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ["./index.html", "./src/**/*.vue"],
  theme: {
    fontFamily: {
      heading: ["Rubik"],
      body: ["Titillium Web", ...defaultTheme.fontFamily.sans],
    },
    extend: {},
  },
  plugins: [],
};
