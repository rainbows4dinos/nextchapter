// Designbase-generated PostCSS config lives in postcss.config.generated.js and
// is regenerated on every server start. Extend this file if you need to add
// your own PostCSS plugins — your changes here won't be overwritten.
const generated = require("./postcss.config.generated.js");

/** @type {import('postcss-load-config').Config} */
module.exports = {
  // plugins must be an object: { 'plugin-name-or-path': optionsObject }
  plugins: {
    ...(generated.plugins || {}),
    // Add your own PostCSS plugins below:
  },
};
