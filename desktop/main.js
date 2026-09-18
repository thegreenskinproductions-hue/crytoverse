// Crytoverse Statistics — desktop app (Electron)
// Auto-starts the local chain (if down), the tracker/indexer (if down), and
// the market-intelligence server (if down), then opens native windows on both
// dashboards.
//
// Launch:  npm run app     (or double-click start-stats.bat)
const { app, BrowserWindow, Menu, shell } = require("electron");
const { spawn } = require("child_process");
const net = require("net");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CHAIN_PORT = 8545;
const APP_PORT = Number(process.env.PORT || 3000);
const MARKET_PORT = Number(process.env.MARKET_PORT || 3001);

let chainProc = null;
let serverProc = null;
let marketProc = null;
let marketWin = null;

function portOpen(port) {
  return new Promise((resolve) => {
    const s = net.connect(port, "127.0.0.1");
    s.once("connect", () => { s.destroy(); resolve(true); });
    s.once("error", () => resolve(false));
  });
}

async function waitFor(port, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await portOpen(port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function ensureChain() {
  if (await portOpen(CHAIN_PORT)) {
    console.log("[stats] chain already running on :" + CHAIN_PORT);
    return true;
  }
  console.log("[stats] starting local chain (hardhat node)…");
  chainProc = spawn("npx", ["hardhat", "node"], { cwd: ROOT, shell: true, stdio: "ignore" });
  const ok = await waitFor(CHAIN_PORT, 40000);
  console.log("[stats] chain " + (ok ? "ready" : "failed to start"));
  return ok;
}

async function ensureServer() {
  if (await portOpen(APP_PORT)) {
    console.log("[stats] tracker already running on :" + APP_PORT);
    return true;
  }
  console.log("[stats] starting tracker/indexer…");
  serverProc = spawn("node", ["tracker/server.js"], { cwd: ROOT, shell: true, stdio: "ignore" });
  const ok = await waitFor(APP_PORT, 40000);
  console.log("[stats] tracker " + (ok ? "ready" : "failed to start"));
  return ok;
}

async function ensureMarketServer() {
  if (await portOpen(MARKET_PORT)) {
    console.log("[stats] market intelligence already running on :" + MARKET_PORT);
    return true;
  }
  console.log("[stats] starting market intelligence…");
  marketProc = spawn("node", ["tracker/market-server.js"], { cwd: ROOT, shell: true, stdio: "ignore" });
  const ok = await waitFor(MARKET_PORT, 40000);
  console.log("[stats] market intelligence " + (ok ? "ready" : "failed to start"));
  return ok;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 920,
    minWidth: 900,
    minHeight: 600,
    title: "Crytoverse — Statistics",
    backgroundColor: "#070a10",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadURL(`http://localhost:${APP_PORT}`);
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  return win;
}

function openMarketWindow() {
  if (marketWin && !marketWin.isDestroyed()) {
    marketWin.focus();
    return marketWin;
  }
  marketWin = new BrowserWindow({
    width: 1400,
    height: 920,
    minWidth: 900,
    minHeight: 600,
    title: "Crytoverse — Market Intelligence",
    backgroundColor: "#070a10",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  marketWin.loadURL(`http://localhost:${MARKET_PORT}`);
  marketWin.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  marketWin.on("closed", () => { marketWin = null; });
  return marketWin;
}

function buildMenu() {
  const template = [
    {
      label: "Crytoverse",
      submenu: [
        { label: "Statistics Dashboard", accelerator: "CmdOrCtrl+1", click: () => createWindow() },
        { label: "Market Intelligence", accelerator: "CmdOrCtrl+2", click: () => openMarketWindow() },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  await ensureChain();
  await ensureServer();
  await ensureMarketServer();
  buildMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  // Clean up only the processes this app spawned.
  if (serverProc) { try { serverProc.kill(); } catch {} }
  if (marketProc) { try { marketProc.kill(); } catch {} }
  if (chainProc) { try { chainProc.kill(); } catch {} }
  app.quit();
});
