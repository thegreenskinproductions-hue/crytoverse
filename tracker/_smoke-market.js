// Smoke test for tracker/market-server.js (:3001)
// Starts the server, hits / , /api/market , /api/race, prints a summary, exits.
const { spawn } = require("child_process");
const http = require("http");
const net = require("net");

const PORT = 3001;
const HOST = "127.0.0.1";

function get(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: HOST, port: PORT, path }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve({ status: res.statusCode, type: res.headers["content-type"], body: d }));
    }).on("error", reject);
  });
}

function portOpen() {
  return new Promise((resolve) => {
    const s = net.connect(PORT, HOST);
    s.once("connect", () => { s.destroy(); resolve(true); });
    s.once("error", () => resolve(false));
  });
}

async function waitFor() {
  const t0 = Date.now();
  while (Date.now() - t0 < 15000) {
    if (await portOpen()) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

(async () => {
  const child = spawn("node", ["market-server.js"], { stdio: "ignore", shell: true });
  try {
    const ready = await waitFor();
    if (!ready) throw new Error("server did not become ready on :" + PORT);

    const home = await get("/");
    const market = await get("/api/market");
    const race = await get("/api/race");

    const m = JSON.parse(market.body);
    const r = JSON.parse(race.body);

    console.log("GET /           ->", home.status, "|", home.type, "|", home.body.length, "bytes (market.html)");
    console.log("GET /api/market ->", market.status, "| real:", m.real.length, "| ours:", m.ours.length, "| leaderboard:", m.leaderboard.length);
    console.log("GET /api/race   ->", race.status, "| gap24:", r.gap24, "| verdict:", r.verdict.side);

    console.log("\nTOP 6 LEADERBOARD:");
    m.leaderboard.slice(0, 6).forEach((e, i) =>
      console.log(i + 1, e.symbol.padEnd(10), e.side.padEnd(6), "24h=" + (e.chg24h == null ? "—" : e.chg24h.toFixed(2)), "score=" + e.score, e.bias)
    );
  } catch (e) {
    console.error("SMOKE FAIL:", e.message);
    process.exitCode = 1;
  } finally {
    try { child.kill(); } catch {}
  }
})();
