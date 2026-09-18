// Mission Control — live wallet + deploy watcher for the Crytoverse launch.
// Serves a browser dashboard at http://localhost:4000 and polls the deployer
// wallet across all major EVM networks every 10 seconds (read-only).
//
//   node wallet-watch.js
const http = require("http");
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const WALLET = (process.env.DEPLOYER_ADDRESS || "").toLowerCase();
const PORT = process.env.WATCH_PORT || 4000;

const NETWORKS = [
  ["Ethereum mainnet", "https://ethereum-rpc.publicnode.com", 1],
  ["Base",             "https://mainnet.base.org",            8453],
  ["Arbitrum One",     "https://arbitrum-one-rpc.publicnode.com", 42161],
  ["Optimism",         "https://optimism-rpc.publicnode.com", 10],
  ["Sepolia (test)",   "https://ethereum-sepolia-rpc.publicnode.com", 11155111],
];

// In-memory event log
const log = [];
function pushLog(level, msg) {
  log.unshift({ t: new Date().toISOString(), level, msg });
  if (log.length > 200) log.pop();
}
pushLog("info", `Mission Control started — watching ${WALLET}`);

async function scan() {
  const rows = [];
  for (const [name, rpc, chainId] of NETWORKS) {
    try {
      const p = new ethers.JsonRpcProvider(rpc);
      const bal = await p.getBalance(WALLET);
      rows.push({ name, chainId, balance: ethers.formatEther(bal), ok: true });
    } catch (e) {
      rows.push({ name, chainId, balance: null, ok: false, err: (e.message || e).slice(0, 60) });
    }
  }
  return rows;
}

const HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>🚀 Crytoverse Mission Control</title>
<style>
:root{--bg:#070b14;--panel:#0e1526;--line:#1c2740;--txt:#e6edf7;--dim:#8b98b0;--green:#2dd4a7;--amber:#f5b04c;--red:#f0606a;--blue:#5aa2ff}
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--txt)}
header{padding:20px 28px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:14px}
header h1{font-size:20px;margin:0;letter-spacing:.5px}
.badge{font-size:11px;padding:4px 10px;border-radius:999px;background:var(--green);color:#04120c;font-weight:700}
.wrap{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:24px 28px}
@media(max-width:820px){.wrap{grid-template-columns:1fr}}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 20px}
.card h2{font-size:14px;margin:0 0 14px;color:var(--dim);text-transform:uppercase;letter-spacing:1px}
.addr{font-family:ui-monospace,monospace;font-size:13px;color:var(--blue);word-break:break-all;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{text-align:left;padding:9px 8px;border-bottom:1px solid var(--line)}
th{color:var(--dim);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
.bal{font-family:ui-monospace,monospace;text-align:right}
.fund{color:var(--green);font-weight:700}.zero{color:var(--dim)}
#log{max-height:420px;overflow:auto;font-family:ui-monospace,monospace;font-size:12px;line-height:1.7}
.l{display:flex;gap:10px;border-bottom:1px solid #141c2e;padding:4px 0}
.t{color:var(--dim);flex:0 0 86px}.m{color:var(--txt)}
.info .m{color:var(--txt)}.ok .m{color:var(--green)}.warn .m{color:var(--amber)}.err .m{color:var(--red)}
.foot{color:var(--dim);font-size:11px;padding:0 28px 24px}
</style></head><body>
<header><h1>🚀 Crytoverse Mission Control</h1><span class="badge" id="state">SCANNING</span></header>
<div class="wrap">
  <div class="card">
    <h2>Deployer Wallet</h2>
    <div class="addr" id="addr"></div>
    <table><thead><tr><th>Network</th><th style="text-align:right">Balance (ETH)</th></tr></thead>
    <tbody id="rows"></tbody></table>
  </div>
  <div class="card">
    <h2>Event Log</h2>
    <div id="log"></div>
  </div>
</div>
<div class="foot" id="foot">auto-refresh every 10s · read-only monitor</div>
<script>
let fund=0;
async function tick(){
  try{
    const r=await fetch('/api/status');
    const j=await r.json();
    document.getElementById('addr').textContent=j.wallet;
    document.getElementById('rows').innerHTML=j.rows.map(n=>{
      const bal=n.balance==null?'ERR':(+n.balance).toFixed(6);
      const cls=n.ok&&n.balance>0?'fund':'zero';
      if(n.ok&&n.balance>0)fund=1;
      return '<tr><td>'+n.name+'</td><td class="bal '+cls+'">'+bal+'</td></tr>';
    }).join('');
    document.getElementById('state').textContent=fund?'FUNDED':'WAITING';
    document.getElementById('state').style.background=fund?'var(--green)':'var(--amber)';
    document.getElementById('log').innerHTML=j.log.map(e=>
      '<div class="l '+e.level+'"><span class="t">'+e.t.slice(11,19)+'</span><span class="m">'+e.msg+'</span></div>'
    ).join('');
    document.getElementById('foot').textContent='last update '+j.updated+' · auto-refresh 10s · read-only monitor';
  }catch(e){}
}
tick();setInterval(tick,10000);
</script></body></html>`;

const server = http.createServer(async (req, res) => {
  if (req.url === "/" || req.url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(HTML);
  }
  if (req.url === "/api/status") {
    const rows = await scan();
    const funded = rows.find(r => r.ok && parseFloat(r.balance) > 0);
    if (funded) pushLog("ok", `FUNDED: ${funded.name} = ${funded.balance} ETH`);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      wallet: WALLET, rows, log,
      updated: new Date().toISOString()
    }));
  }
  res.writeHead(404);
  res.end("not found");
});

server.listen(PORT, () => {
  console.log(`\n🚀 Mission Control: http://localhost:${PORT}\n`);
  console.log("Watching wallet:", WALLET);
});
