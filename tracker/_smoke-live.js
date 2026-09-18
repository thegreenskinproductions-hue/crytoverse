// Quick live-feed smoke test: resolve real symbols via CoinGecko/Binance.
const pricing = require("./pricing");

(async () => {
  const now = Math.floor(Date.now() / 1000);
  const m = await pricing.getPriceMap(["BTC", "ETH", "DOGE", "SOL"], now);
  console.log(JSON.stringify(m, null, 2));
  const sp = await pricing.getSparkline("BTC", 24, 12, now);
  console.log("BTC sparkline:", JSON.stringify(sp));
})().catch((e) => {
  console.error("LIVE FEED ERROR:", e.message);
  process.exit(1);
});
