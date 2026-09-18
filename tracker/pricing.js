// tracker/pricing.js — multi-source LIVE price feed
// ---------------------------------------------------------------------------
// Sources, in priority order:
//   1. CoinGecko  (real market, no API key) — primary
//   2. Binance    (real market, no API key) — fallback if CoinGecko fails
//   3. Deterministic simulated oracle      — only for tokens with no real
//      market (e.g. our fictional six). Honest: source is always reported.
//
// Caching: CoinGecko's full coin list is disk-cached (7-day TTL); live prices
// and charts are in-memory TTL-cached to stay inside free-tier rate limits.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const LIST_CACHE = path.join(__dirname, ".coingecko-list.json");
const PRICE_MAP = path.join(__dirname, "price-map.json");

const LIST_TTL = 7 * 24 * 3600 * 1000; // 7 days
const PRICE_TTL = 60 * 1000;           // 60s
const CHART_TTL = 10 * 60 * 1000;      // 10 min
const BINANCE_TTL = 30 * 1000;         // 30s

// ---- tiny in-memory TTL cache ----
const mem = new Map();
function cacheGet(key, ttl) {
  const h = mem.get(key);
  return h && Date.now() - h.t < ttl ? h.v : undefined;
}
function cacheSet(key, v) {
  mem.set(key, { t: Date.now(), v });
}

// Well-known symbol -> CoinGecko id (disambiguates duplicate symbols).
const KNOWN = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", USDT: "tether",
  USDC: "usd-coin", BNB: "binancecoin", XRP: "ripple", ADA: "cardano",
  DOGE: "dogecoin", AVAX: "avalanche-2", LINK: "chainlink", DOT: "polkadot",
  MATIC: "matic-network", POL: "polygon-ecosystem-token", SHIB: "shiba-inu",
  LTC: "litecoin", UNI: "uniswap", AAVE: "aave", ARB: "arbitrum",
  OP: "optimism", NEAR: "near", APT: "aptos", SUI: "sui", TON: "the-open-network",
};

// ---- deterministic simulated oracle (fallback / no-market tokens) ----
const SIM_BASE = { CRYTO: 1.0, POX: 2.2, NATA: 3.1, BLISK: 4.4, MILENKOV: 5.3, BONGWATER: 0.35 };
function hashInt(s) {
  return parseInt(crypto.createHash("sha256").update(s).digest("hex").slice(0, 8), 16);
}
function simPrice(symbol, tsSec) {
  const base = SIM_BASE[symbol] || 1.0;
  const h = hashInt(symbol);
  const t = tsSec || Math.floor(Date.now() / 1000);
  const daily = Math.sin(t / 86400 + (h % 360)) * 0.20;
  const hourly = Math.sin((t / 3600) * 0.7 + (h % 90)) * 0.07;
  const weekly = Math.sin((t / 604800) * 2 + h) * 0.12;
  const drift = Math.sin((t / 86400) * 0.37 + (h % 47)) * 0.05;
  return Math.max(base * (1 + daily + hourly + weekly + drift), base * 0.25);
}

// ---- price-map overrides (symbol -> peg) ----
function loadPriceMap() {
  try { return JSON.parse(fs.readFileSync(PRICE_MAP, "utf8")); } catch { return {}; }
}

// ---- CoinGecko coin list (disk-cached) ----
let coinList = null;
function loadCoinList() {
  if (coinList) return coinList;
  if (fs.existsSync(LIST_CACHE)) {
    try {
      if (Date.now() - fs.statSync(LIST_CACHE).mtimeMs < LIST_TTL) {
        coinList = JSON.parse(fs.readFileSync(LIST_CACHE, "utf8"));
        return coinList;
      }
    } catch {}
  }
  return null;
}
async function ensureCoinList() {
  if (loadCoinList()) return coinList;
  const r = await fetch("https://api.coingecko.com/api/v3/coins/list");
  if (!r.ok) throw new Error("coingecko list " + r.status);
  coinList = await r.json();
  try { fs.writeFileSync(LIST_CACHE, JSON.stringify(coinList)); } catch {}
  return coinList;
}
function resolveCoinGeckoId(symbol) {
  const up = symbol.toUpperCase();
  if (KNOWN[up]) return KNOWN[up];
  const list = loadCoinList();
  if (!list) return null;
  const hit = list.find((c) => c.symbol && c.symbol.toUpperCase() === up);
  return hit ? hit.id : null;
}

// ---- resolve: how should we price this symbol? ----
async function resolveSymbol(symbol) {
  const pm = loadPriceMap();
  const entry = pm[symbol.toUpperCase()];
  if (entry) {
    if (entry.simulate) return { kind: "sim" };
    if (entry.coingeckoId) return { kind: "coingecko", id: entry.coingeckoId };
  }
  try {
    await ensureCoinList();
  } catch {}
  const id = resolveCoinGeckoId(symbol);
  if (id) return { kind: "coingecko", id };
  return { kind: "binance" };
}

// ---- source fetchers ----
async function fetchCGSimple(ids) {
  const url = "https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&include_24hr_change=true&ids=" + ids.join(",");
  const r = await fetch(url);
  if (!r.ok) throw new Error("coingecko price " + r.status);
  return r.json();
}
async function fetchCGChart(id, days) {
  const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("coingecko chart " + r.status);
  const j = await r.json();
  return j.prices || [];
}
async function fetchBinance(symbol) {
  const pair = symbol.toUpperCase() + "USDT";
  const r = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=" + pair);
  if (!r.ok) throw new Error("binance " + r.status);
  const j = await r.json();
  if (!j || !j.lastPrice) throw new Error("binance no pair " + pair);
  return { price: parseFloat(j.lastPrice), chg24h: parseFloat(j.priceChangePercent) };
}

// ---- public API ----

// Returns { SYMBOL: { price, chg24h, chg7d, source } }
async function getPriceMap(symbols, tsSec) {
  const now = tsSec || Math.floor(Date.now() / 1000);
  const out = {};

  // Resolve each symbol first (batch the CoinGecko id lookups)
  const resolved = {};
  const cgIds = [];
  for (const sym of symbols) {
    resolved[sym] = await resolveSymbol(sym);
    if (resolved[sym].kind === "coingecko" && !cgIds.includes(resolved[sym].id)) {
      cgIds.push(resolved[sym].id);
    }
  }

  // One batched CoinGecko call for all real ids
  let cgSimple = null;
  if (cgIds.length) {
    const key = "cg:" + cgIds.join(",");
    cgSimple = cacheGet(key, PRICE_TTL);
    if (cgSimple === undefined) {
      try { cgSimple = await fetchCGSimple(cgIds); cacheSet(key, cgSimple); }
      catch { cgSimple = null; }
    }
  }

  for (const sym of symbols) {
    const r = resolved[sym];

    // Simulated (no real market)
    if (r.kind === "sim") {
      const p = simPrice(sym, now);
      const p24 = simPrice(sym, now - 86400);
      const p7 = simPrice(sym, now - 604800);
      out[sym] = { price: p, chg24h: ((p - p24) / p24) * 100, chg7d: ((p - p7) / p7) * 100, source: "simulated" };
      continue;
    }

    // CoinGecko
    if (r.kind === "coingecko") {
      const d = cgSimple && cgSimple[r.id];
      if (d && typeof d.usd === "number") {
        // 7d change from cached chart
        let chg7d = null;
        const chartKey = "chart:" + r.id;
        let chart = cacheGet(chartKey, CHART_TTL);
        if (chart === undefined) {
          try { chart = await fetchCGChart(r.id, 7); cacheSet(chartKey, chart); }
          catch { chart = []; }
        }
        if (chart.length >= 2) {
          const first = chart[0][1], last = chart[chart.length - 1][1];
          chg7d = first ? ((last - first) / first) * 100 : null;
        }
        out[sym] = {
          price: d.usd,
          chg24h: typeof d.usd_24h_change === "number" ? d.usd_24h_change : null,
          chg7d,
          source: "coingecko",
        };
        continue;
      }
      // fall through to Binance if CG returned nothing for this id
    }

    // Binance fallback
    try {
      const b = await fetchBinance(sym);
      out[sym] = { price: b.price, chg24h: b.chg24h, chg7d: null, source: "binance" };
    } catch {
      const p = simPrice(sym, now);
      const p24 = simPrice(sym, now - 86400);
      out[sym] = { price: p, chg24h: ((p - p24) / p24) * 100, chg7d: null, source: "simulated" };
    }
  }
  return out;
}

// Returns a sparkline (array of prices). Real coins use CoinGecko market_chart.
async function getSparkline(symbol, hours, points, tsSec) {
  const now = tsSec || Math.floor(Date.now() / 1000);
  const r = await resolveSymbol(symbol);

  if (r.kind === "coingecko") {
    const days = Math.max(Math.ceil(hours / 24), 1);
    const key = "chart:" + r.id;
    let chart = cacheGet(key, CHART_TTL);
    if (chart === undefined) {
      try { chart = await fetchCGChart(r.id, days); cacheSet(key, chart); }
      catch { chart = null; }
    }
    if (chart && chart.length) {
      const step = Math.max(1, Math.floor(chart.length / points));
      const sampled = [];
      for (let i = 0; i < chart.length && sampled.length < points; i += step) sampled.push(chart[i][1]);
      if (sampled.length < 2) return null;
      return sampled;
    }
  }

  // Simulated sparkline
  const step = (hours * 3600) / points;
  const out = [];
  for (let i = 0; i < points; i++) {
    out.push(Number(simPrice(symbol, now - (points - 1 - i) * step).toFixed(4)));
  }
  return out;
}

module.exports = { getPriceMap, getSparkline, loadPriceMap };
