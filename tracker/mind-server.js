// Mind governance dashboard server.
// Usage:
//   node tracker/mind-server.js          -> dashboard at http://localhost:3100
//   node tracker/mind-server.js --once   -> print governance JSON and exit
const http = require("http");
const fs = require("fs");
const path = require("path");
const { getGovernance } = require("./mind");

const PUBLIC_DIR = path.join(__dirname, "public");

function sendJson(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

if (process.argv.includes("--once")) {
  getGovernance()
    .then((g) => { console.log(JSON.stringify(g, null, 2)); process.exit(0); })
    .catch((e) => { console.error("ERROR: " + e.message); process.exit(1); });
} else {
  const server = http.createServer(async (req, res) => {
    if (req.url.startsWith("/api/mind") || req.url.startsWith("/api/governance")) {
      try {
        sendJson(res, 200, await getGovernance());
      } catch (e) {
        sendJson(res, 500, { error: e.message });
      }
      return;
    }
    const file = path.join(PUBLIC_DIR, "mind.html");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(file));
  });

  const PORT = process.env.MIND_PORT || 3100;
  server.listen(PORT, () => {
    console.log(`\n🧠 Mind Governance → http://localhost:${PORT}\n`);
  });
}
