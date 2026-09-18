// Verify the tracker HTTP server serves the dashboard + API.
const http = require("http");

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: "127.0.0.1", port: 3000, path }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.setTimeout(15000, () => req.destroy(new Error("timeout")));
  });
}

(async () => {
  try {
    const html = await get("/");
    console.log("GET /          ->", html.status, "|", html.body.length, "bytes (dashboard)");

    const api = await get("/api/portfolio");
    console.log("GET /api/portfolio ->", api.status, "|", api.body.length, "bytes");
    const j = JSON.parse(api.body);
    console.log("tokens:", j.tokens.length);
    console.log("sources:", JSON.stringify(j.sources));
    console.log("totalValue:", j.totalValue, "| pnl24h:", j.pnl24h, "| marketCap:", j.totalMarketCap);
    console.log("first token:", j.tokens[0].symbol, "$" + j.tokens[0].price, "src=" + j.tokens[0].source);
  } catch (e) {
    console.log("VERIFY ERROR:", e.message);
    process.exit(1);
  }
})();
