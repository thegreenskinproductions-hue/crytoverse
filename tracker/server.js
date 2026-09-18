// Crytoverse Mission Control — local indexer + dashboard server.
// Serves /api/portfolio (prices, gains/losses, progress, treasuries) and the UI.
// Usage:
//   node tracker/server.js            -> dashboard at http://localhost:3000
//   node tracker/server.js --once     -> print portfolio JSON and exit
const http = require("http");
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const pricing = require("./pricing");

const CONFIG_PATH = path.join(__dirname, "config.json");
const REGISTRY_PATH = path.join(__dirname, "..", "mind", "registry.json");
const PUBLIC_DIR = path.join(__dirname, "public");

const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];
const TREASURY_ABI = [
  "function proposalCount() view returns (uint256)",
  "function delay() view returns (uint256)",
];

const LORE = {
  CRYTO: { role: "base currency", blurb: "Citizen token & unit of account — Crypto, the 137th clone, carries the economy." },
  POX: { role: "governance", blurb: "Governance — Orthopox 13 speaks for the chorus; $POX is how the Mind proposes." },
  NATA: { role: "bridge / trust", blurb: "Bridge & trust — Natalya moves value across faction lines." },
  BLISK: { role: "systemic-risk marker", blurb: "Risk marker — concentration-of-power dominance metric." },
  MILENKOV: { role: "incentive / yield", blurb: "Incentive / yield — drips to those who keep the system running." },
  BONGWATER: { role: "community / tipping", blurb: "Community / tipping — the meme that greases social life." },
};

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}
function loadRegistry() {
  if (fs.existsSync(REGISTRY_PATH)) return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  return null;
}

async function getPortfolio() {
  const config = loadConfig();
  const registry = loadRegistry();
  const provider = new ethers.JsonRpcProvider(config.rpcUrl || "http://127.0.0.1:8545");
  const now = Math.floor(Date.now() / 1000);

  // First pass: read on-chain metadata + token contracts
  const meta = [];
  for (const t of config.tokens) {
    const c = new ethers.Contract(t.address, ERC20_ABI, provider);
    const [name, symbol, decBn, totalSupply] = await Promise.all([
      c.name(), c.symbol(), c.decimals(), c.totalSupply(),
    ]);
    meta.push({ t, c, name, symbol, dec: Number(decBn), supply: Number(ethers.formatUnits(totalSupply, Number(decBn))) });
  }

  // One batched price-feed call for every symbol (real where available)
  const symbols = meta.map((m) => m.symbol);
  const pm = await pricing.getPriceMap(symbols, now);

  const tokens = [];
  let totalValue = 0;
  let totalValue24h = 0;
  let totalMarketCap = 0;
  let totalHolders = 0;
  const sources = {};

  for (const m of meta) {
    const { t, c, symbol, dec, supply } = m;
    const p = pm[symbol] || { price: 0, chg24h: null, chg7d: null, source: "unknown" };
    sources[p.source] = (sources[p.source] || 0) + 1;

    // Index transfers -> holders, transfer count, burned.
    const events = await c.queryFilter(c.filters.Transfer(), t.fromBlock || 0, "latest");
    const holders = new Set();
    let burned = 0n;
    let transfers = 0;
    for (const e of events) {
      transfers++;
      holders.add(e.args[0]);
      holders.add(e.args[1]);
      if (e.args[1] === ethers.ZeroAddress) burned += e.args[2];
    }
    holders.delete(ethers.ZeroAddress);

    // Treasury (if the Mind governs this token)
    let treasury = null;
    if (registry) {
      const tr = (registry.treasuries || []).find(
        (x) => x.token.toLowerCase() === t.address.toLowerCase()
      );
      if (tr) {
        const tc = new ethers.Contract(tr.treasury, TREASURY_ABI, provider);
        const bal = await c.balanceOf(tr.treasury);
        const proposalCount = await tc.proposalCount();
        treasury = {
          address: tr.treasury,
          balance: Number(ethers.formatUnits(bal, dec)),
          proposals: Number(proposalCount),
        };
      }
    }

    const price = p.price;
    const price24h = p.chg24h != null ? price / (1 + p.chg24h / 100) : price;
    const price7d = p.chg7d != null ? price / (1 + p.chg7d / 100) : null;
    const marketCap = price * supply;
    const spark = await pricing.getSparkline(symbol, 168, 48, now);

    const lore = LORE[symbol] || {};
    const treasuryValue = treasury ? treasury.balance * price : 0;
    const treasuryValue24h = treasury ? treasury.balance * price24h : 0;

    tokens.push({
      name: m.name,
      symbol,
      role: lore.role || t.role || "",
      blurb: lore.blurb || "",
      address: t.address,
      price,
      source: p.source,
      chg24h: p.chg24h,
      chg7d: p.chg7d,
      marketCap,
      holders: holders.size,
      transfers,
      supply,
      burned: Number(ethers.formatUnits(burned, dec)),
      treasury,
      treasuryValue,
      treasuryValue24h,
      spark,
    });

    totalValue += treasuryValue;
    totalValue24h += treasuryValue24h;
    totalMarketCap += marketCap;
    totalHolders += holders.size;
  }

  const pnl24h = totalValue - totalValue24h;
  return {
    updatedAt: new Date().toISOString(),
    now,
    mind: registry ? registry.mind : null,
    registry: registry ? registry.registry : null,
    governedTokens: registry ? (registry.treasuries || []).length : 0,
    sources,
    tokens,
    totalValue,
    pnl24h,
    pnl24hPct: totalValue24h ? (pnl24h / totalValue24h) * 100 : 0,
    totalMarketCap,
    totalHolders,
  };
}

function sendJson(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

if (process.argv.includes("--once")) {
  getPortfolio()
    .then((p) => {
      console.log(JSON.stringify(p, null, 2));
      process.exit(0);
    })
    .catch((e) => {
      console.error("ERROR: " + e.message);
      process.exit(1);
    });
} else {
  const server = http.createServer(async (req, res) => {
    if (req.url.startsWith("/api/portfolio") || req.url.startsWith("/api/stats")) {
      try {
        sendJson(res, 200, await getPortfolio());
      } catch (e) {
        sendJson(res, 500, { error: e.message });
      }
      return;
    }
    const file = path.join(PUBLIC_DIR, "index.html");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(file));
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`\n🧠 Crytoverse Mission Control → http://localhost:${PORT}\n`);
  });
}
