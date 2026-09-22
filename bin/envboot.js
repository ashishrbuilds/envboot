#!/usr/bin/env node

const path = require("path");
const fs = require("fs");

const distCli = path.join(__dirname, "..", "dist", "cli.js");

if (fs.existsSync(distCli)) {
  require(distCli);
} else {
  try {
    require("tsx/cli");
    require(path.join(__dirname, "..", "src", "cli", "index.ts"));
  } catch (err) {
    console.error("envboot: please run 'npm run build' before running the CLI.");
    process.exit(1);
  }
}
