// tracker/market.js — real-market tracker + momentum/trend signals
// ---------------------------------------------------------------------------
// Fetches the top real cryptocurrencies (CoinGecko, no key) and joins them
// with our fictional six tokens so Mission Control can rank EVERYTHING on one
// leaderboard by 24h / 7d / 30d momentum.
//
// HONEST NOTE: the "signal" here is a momentum score computed from *recent*
// price change only. It is descriptive (what moved, and how hard), NOT a
// predictive edge. It does not know the future.
const https = require("https");
const fs = require("fs");
const path = require("path");
const pricing = require("./pricing");

const CACHE_FILE = path.join(__dirname, ".market-cache.json");
const CACHE_TTL = 60 * 1000; // 60s for market data (free tier friendly)

function httpJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "crytoverse-mission-control/1.0" } }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch { reject(new Error("bad JSON from " + url)); }
      });
    });
    req.on("error", reject);
    req.setTimeout(20000, () => req.destroy(new Error("timeout")));
  });
}

function loadCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")); } catch { return {}; }
}
function saveCache(c) {
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(c)); } catch {}
}

async function getTopCoins(limit = 20) {
  const cache = loadCache();
  if (cache.top && Date.now() - cache.top.t < CACHE_TTL) return cache.top.v;

  const url =
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc" +
    `&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h,7d,30d`;

  let data;
  try {
    data = await httpJson(url);
  } catch (e) {
    // rate-limited / offline -> serve last known good cache
    if (cache.top) return cache.top.v;
    throw e;
  }

  const out = data.map((c) => ({
    id: c.id,
    symbol: String(c.symbol || "").toUpperCase(),
    name: c.name,
    rank: c.market_cap_rank,
    price: c.current_price,
    marketCap: c.market_cap,
    chg24h: c.price_change_percentage_24h ?? null,
    chg7d: c.price_change_percentage_7d ?? null,
    chg30d: c.price_change_percentage_30d ?? null,
  }));

  cache.top = { t: Date.now(), v: out };
  saveCache(cache);
  return out;
}

function momentum(x) {
  const s = 0.5 * (x.chg24h ?? 0) + 0.3 * (x.chg7d ?? 0) + 0.2 * (x.chg30d ?? 0);
  const bias = s > 2 ? "bullish" : s < -2 ? "bearish" : "neutral";
  return { score: round(s), bias };
}

function round(n) { return Math.round(n * 100) / 100; }

async function getOurs() {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
  const symbols = config.tokens.map((t) => t.symbol);
  let prices = {};
  try { prices = (await pricing.getPriceMap(symbols)) || {}; } catch {}

  return config.tokens.map((t) => {
    const p = prices[t.symbol] || {};
    return {
      symbol: t.symbol,
      name: t.name,
      role: t.role,
      price: p.price ?? null,
      chg24h: p.chg24h ?? null,
      chg7d: p.chg7d ?? null,
      chg30d: null,
      source: p.source || "simulated",
      side: "ours",
    };
  });
}

async function getMarket(limit = 20) {
  const [real, ours] = await Promise.all([getTopCoins(limit), getOurs()]);

  const tag = (x) => ({ ...x, ...momentum(x) });
  const all = [
    ...ours.map((x) => tag({ ...x, side: "ours" })),
    ...real.map((x) => tag({ ...x, side: "market" })),
  ];

  const leaderboard = [...all].sort((a, b) => (b.score ?? -1e9) - (a.score ?? -1e9));
  const movers24 = [...all].sort((a, b) => (b.chg24h ?? -1e9) - (a.chg24h ?? -1e9)).slice(0, 8);
  const movers7 = [...all].sort((a, b) => (b.chg7d ?? -1e9) - (a.chg7d ?? -1e9)).slice(0, 8);

  return {
    updatedAt: new Date().toISOString(),
    real,
    ours,
    leaderboard,
    movers24,
    movers7,
    sources: { coingecko: real.length, simulated: ours.length },
  };
}

module.exports = { getMarket, getTopCoins, getOurs, momentum };
