// tracker/race.js — "Ours vs Market" head-to-head race
// ---------------------------------------------------------------------------
// Compares our six tokens against the real market basket on recent momentum,
// and persists a time-series so Mission Control can show how the gap evolves.
//
// HONEST NOTE: this is a *descriptive* comparison of recent returns. It tells
// you who moved harder over the last 24h/7d — it does not predict the future.
const fs = require("fs");
const path = require("path");
const market = require("./market");

const HISTORY = path.join(__dirname, "race-history.json");
const MIN_INTERVAL = 60 * 1000; // one snapshot per minute max

function loadHistory() {
  try { return JSON.parse(fs.readFileSync(HISTORY, "utf8")); } catch { return []; }
}
function saveHistory(h) {
  try { fs.writeFileSync(HISTORY, JSON.stringify(h.slice(-720), null, 2)); } catch {}
}

const avg = (arr, key) => (arr.length ? arr.reduce((s, x) => s + (x[key] ?? 0), 0) / arr.length : 0);
const round = (n) => Math.round(n * 100) / 100;

async function getRace() {
  const m = await market.getMarket();
  const ours = m.ours, real = m.real;

  const ours24 = round(avg(ours, "chg24h"));
  const mkt24 = round(avg(real, "chg24h"));
  const ours7 = round(avg(ours, "chg7d"));
  const mkt7 = round(avg(real, "chg7d"));
  const gap24 = round(ours24 - mkt24);
  const gap7 = round(ours7 - mkt7);

  // snapshot
  const hist = loadHistory();
  const last = hist[hist.length - 1];
  const now = Date.now();
  if (!last || now - last.t >= MIN_INTERVAL) {
    hist.push({ t: now, gap24, gap7, ours24, mkt24 });
    saveHistory(hist);
  }

  const verdict = gap24 >= 0
    ? { side: "OURS", text: "OURS is outpacing the market" }
    : { side: "MARKET", text: "The market is outpacing ours" };

  return {
    updatedAt: new Date().toISOString(),
    ours24, mkt24, gap24,
    ours7, mkt7, gap7,
    verdict,
    top24: m.movers24,
    top7: m.movers7,
    history: hist,
  };
}

module.exports = { getRace };
