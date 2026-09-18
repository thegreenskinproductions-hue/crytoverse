// Direct HTTP probe against an ALREADY-RUNNING market server on :3001.
const http = require("http");
const HOST = "127.0.0.1";
const PORT = 3001;

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: HOST, port: PORT, path, timeout: 15000 }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve({ status: res.statusCode, type: res.headers["content-type"], body: d }));
    });
    req.on("timeout", () => { req.destroy(new Error("timeout")); });
    req.on("error", reject);
  });
}

(async () => {
  try {
    const home = await get("/");
    console.log("GET / ->", home.status, home.type, home.body.length, "bytes");

    const market = await get("/api/market");
    const m = JSON.parse(market.body);
    console.log("GET /api/market ->", market.status, "real:", m.real.length, "ours:", m.ours.length, "leaderboard:", m.leaderboard.length);
    console.log("\nTOP 8 LEADERBOARD:");
    m.leaderboard.slice(0, 8).forEach((e, i) =>
      console.log(i + 1, e.symbol.padEnd(10), e.side.padEnd(6), "24h=" + (e.chg24h == null ? "—" : Number(e.chg24h).toFixed(2)), "score=" + e.score, e.bias)
    );

    const race = await get("/api/race");
    const r = JSON.parse(race.body);
    console.log("\nGET /api/race ->", race.status, "| ours24:", r.ours24, "| mkt24:", r.mkt24, "| gap24:", r.gap24, "| verdict:", r.verdict.side);
  } catch (e) {
    console.error("PROBE FAIL:", e.message);
    process.exitCode = 1;
  }
})();
