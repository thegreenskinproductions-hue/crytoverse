// tracker/market-server.js — "Market Intelligence" HTTP server (port 3001)
// Serves the extended live market tracker + race leaderboard. Runs alongside
// tracker/server.js (portfolio dashboard on :3000) — they share the chain.
const http = require("http");
const fs = require("fs");
const path = require("path");
const market = require("./market");
const race = require("./race");

const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = process.env.MARKET_PORT || 3001;

function sendJson(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  const u = (req.url || "/").split("?")[0];

  if (u === "/api/market" || u === "/api/leaders" || u === "/api/signals") {
    try { sendJson(res, 200, await market.getMarket()); }
    catch (e) { sendJson(res, 500, { error: e.message }); }
    return;
  }
  if (u === "/api/race") {
    try { sendJson(res, 200, await race.getRace()); }
    catch (e) { sendJson(res, 500, { error: e.message }); }
    return;
  }

  const file = u === "/" || u === "" ? "market.html" : path.basename(u);
  const fp = path.join(PUBLIC_DIR, file);
  if (file.endsWith(".html") && fs.existsSync(fp)) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(fp));
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found");
  }
});

server.listen(PORT, () => {
  console.log(`📈 Market Intelligence → http://localhost:${PORT}\n`);
});
