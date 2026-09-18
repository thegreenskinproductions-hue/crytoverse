// Verify Electron is installed and the binary downloaded.
const path = require("path");
const fs = require("fs");

let bin = null;
try {
  bin = require("electron");
  console.log("electron module resolves to:", bin);
} catch (e) {
  console.log("electron module NOT resolvable:", e.message);
}

const candidates = [
  path.join("node_modules", "electron", "dist", "electron.exe"),
  path.join("node_modules", "electron", "dist", "electron"),
];
for (const c of candidates) {
  console.log(c, "->", fs.existsSync(c) ? "EXISTS" : "missing");
}
