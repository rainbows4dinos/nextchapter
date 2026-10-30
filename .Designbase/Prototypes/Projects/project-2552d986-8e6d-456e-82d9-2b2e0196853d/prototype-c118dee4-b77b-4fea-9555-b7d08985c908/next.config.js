// Designbase-generated config lives in next.config.generated.js and is
// regenerated on every server start. Extend this file if you need custom
// Next.js overrides — your changes here won't be overwritten.
const fs = require("fs");
const path = require("path");

const generatedPath = path.join(__dirname, "next.config.generated.js");
const generated = fs.existsSync(generatedPath)
  ? require(generatedPath)
  : {};

/** @type {import('next').NextConfig} */
module.exports = {
  ...generated,
  // Add your own overrides below:
};
