// Mind governance indexer — reads on-chain treasury/proposal state plus the
// Mind's decision journal, and returns a single governance snapshot for the UI.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const REGISTRY_PATH = path.join(__dirname, "..", "mind", "registry.json");
const LOG_PATH = path.join(__dirname, "..", "mind", "log.jsonl");

const RPC = process.env.RPC_URL || "http://127.0.0.1:8545";

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
];
const TREASURY_ABI = [
  "function mind() view returns (address)",
  "function token() view returns (address)",
  "function delay() view returns (uint256)",
  "function proposalCount() view returns (uint256)",
  "function proposals(uint256) view returns (address target, uint256 amount, string memo, uint256 eta, bool executed, bool cancelled)",
];

const LORE = {
  CRYTO: { role: "base currency", blurb: "Citizen token & unit of account — Crypto, the 137th clone, carries the economy." },
  POX: { role: "governance", blurb: "Governance — Orthopox 13 speaks for the chorus; $POX is how the Mind proposes." },
  NATA: { role: "bridge / trust", blurb: "Bridge & trust — Natalya moves value across faction lines." },
  BLISK: { role: "systemic-risk marker", blurb: "Risk marker — concentration-of-power dominance metric." },
  MILENKOV: { role: "incentive / yield", blurb: "Incentive / yield — drips to those who keep the system running." },
  BONGWATER: { role: "community / tipping", blurb: "Community / tipping — the meme that greases social life." },
};

function loadRegistry() {
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
}

function loadJournal(max = 40) {
  if (!fs.existsSync(LOG_PATH)) return [];
  const lines = fs.readFileSync(LOG_PATH, "utf8").trim().split("\n").filter(Boolean);
  return lines
    .map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    })
    .filter(Boolean)
    .slice(-max);
}

function fmtUnits(wei, dec) {
  try { return Number(ethers.formatUnits(wei, dec)); } catch { return 0; }
}

function proposalStatus(p, chainNow) {
  if (p.executed) return "EXECUTED";
  if (p.cancelled) return "CANCELLED";
  if (BigInt(p.eta) <= chainNow) return "MATURED";
  return "PENDING";
}

async function getGovernance() {
  const registry = loadRegistry();
  const provider = new ethers.JsonRpcProvider(RPC);
  const latest = await provider.getBlock("latest");
  const chainNow = BigInt(latest.timestamp);

  const treasuries = [];
  let totalProposals = 0, executed = 0, pending = 0, matured = 0, cancelled = 0;
  let totalDisbursedWei = 0n;

  for (const t of registry.treasuries) {
    const tokenC = new ethers.Contract(t.token, ERC20_ABI, provider);
    const treasuryC = new ethers.Contract(t.treasury, TREASURY_ABI, provider);

    const [dec, symbol, balanceWei, count] = await Promise.all([
      tokenC.decimals(),
      tokenC.symbol(),
      tokenC.balanceOf(t.treasury),
      treasuryC.proposalCount(),
    ]);
    const n = Number(count);

    const proposals = [];
    for (let id = 0; id < n; id++) {
      const raw = await treasuryC.proposals(id);
      const status = proposalStatus(raw, chainNow);
      proposals.push({
        id,
        target: raw.target,
        amount: fmtUnits(raw.amount, dec),
        memo: raw.memo,
        eta: Number(raw.eta),
        executed: raw.executed,
        cancelled: raw.cancelled,
        status,
      });
      totalProposals++;
      if (status === "EXECUTED") { executed++; totalDisbursedWei += raw.amount; }
      else if (status === "CANCELLED") cancelled++;
      else if (status === "MATURED") matured++;
      else pending++;
    }

    treasuries.push({
      symbol,
      role: (LORE[symbol] && LORE[symbol].role) || t.role,
      blurb: (LORE[symbol] && LORE[symbol].blurb) || "",
      token: t.token,
      treasury: t.treasury,
      balance: fmtUnits(balanceWei, dec),
      funded: fmtUnits(BigInt(t.funded), dec),
      decimals: Number(dec),
      proposalCount: n,
      proposals,
    });
  }

  const journal = loadJournal(40).map((o) => ({
    ts: o.ts,
    source: o.source,
    decisions: (o.results || []).map((r) => ({
      token: r.token,
      action: r.decision && r.decision.action,
      target: r.decision && r.decision.target,
      amount: r.decision && r.decision.amount,
      memo: r.decision && r.decision.memo,
      reasoning: r.decision && r.decision.reasoning,
      result: r.result,
      error: r.error,
    })),
  }));

  return {
    updatedAt: new Date().toISOString(),
    chainNow: Number(chainNow),
    mind: registry.mind,
    registry: registry.registry,
    delay: registry.delay,
    network: registry.network,
    stats: {
      treasuries: treasuries.length,
      totalProposals,
      executed,
      pending,
      matured,
      cancelled,
      totalDisbursed: fmtUnits(totalDisbursedWei, 18),
    },
    treasuries,
    journal,
  };
}

module.exports = { getGovernance };
