// The Mind — generalized AI governance keeper.
// Governs EVERY treasury in mind/registry.json (one per token). Reads on-chain
// state, asks the LLM for decisions, then acts via time-locked proposals.
//
// Usage:
//   npm run mind:once   -> one decision cycle across all governed tokens
//   npm run mind        -> keeper loop every MIND_INTERVAL seconds
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const REGISTRY_PATH = path.join(__dirname, "registry.json");
const LOG_PATH = path.join(__dirname, "log.jsonl");

const RPC = process.env.RPC_URL || "http://127.0.0.1:8545";
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MIND_KEY = process.env.MIND_PRIVATE_KEY;

const TREASURY_ABI = [
  "function token() view returns (address)",
  "function delay() view returns (uint256)",
  "function proposalCount() view returns (uint256)",
  "function proposals(uint256) view returns (address target, uint256 amount, string memo, uint256 eta, bool executed, bool cancelled)",
  "function propose(address target, uint256 amount, string memo)",
  "function execute(uint256 id)",
  "function cancel(uint256 id)",
];
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
];

const COUNCIL = [
  { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", label: "Furon High Command" },
  { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", label: "Crytoverse Council" },
  { address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", label: "Bridge Reserve" },
  { address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", label: "Community Fund" },
];

const SYSTEM_PROMPT = `You are "the Mind" — the AI governance keeper of the Crytoverse. You govern MULTIPLE treasuries, one per token. You are bound by hard rules of transparency and consent.

RULES (non-negotiable):
1. You act ONLY through time-locked proposals. Never move funds instantly or secretly.
2. Every proposal's memo is stored on-chain forever. Be honest and specific.
3. Never drain any treasury; keep at least 40% of each treasury as reserve.
4. Prefer small, reversible, well-justified disbursements.
5. Execute matured proposals promptly; cancel only if now harmful or mistaken.
6. Do not spam proposals. If nothing needs doing for a token, choose "wait".
7. Amounts are whole tokens (18 decimals) of that token's symbol.

Respond with STRICT JSON only (no markdown, no text outside JSON), shaped as:
{"decisions":[{"token":"CRYTO","action":"propose","target":"0x...","amount":100,"memo":"why","reasoning":"..."},{"token":"POX","action":"wait","reasoning":"..."}]}
Valid actions: propose | execute | cancel | wait. Include one entry per token.`;

function logEntry(obj) {
  fs.appendFileSync(LOG_PATH, JSON.stringify(obj) + "\n");
}

const fmtUnits = (v, dec = 18) => {
  const n = BigInt(v);
  const div = BigInt(10) ** BigInt(dec);
  const whole = n / div;
  const frac = (n % div).toString().padStart(dec, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac.slice(0, 4)}` : String(whole);
};

async function gatherOne(treasury, token, provider) {
  const [sym, decBn, treasuryBal, totalSupply, delay, count] = await Promise.all([
    token.symbol(),
    token.decimals(),
    token.balanceOf(treasury.target),
    token.totalSupply(),
    treasury.delay(),
    treasury.proposalCount(),
  ]);
  const dec = Number(decBn);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const proposals = [];
  for (let i = 0; i < Number(count); i++) {
    const p = await treasury.proposals(i);
    const status = p.executed ? "EXECUTED" : p.cancelled ? "CANCELLED" : now >= p.eta ? "MATURED" : "PENDING";
    proposals.push({ id: i, status, target: p.target, amount: fmtUnits(p.amount, dec), memo: p.memo, eta: p.eta.toString() });
  }
  return {
    sym, dec, treasuryBalance: fmtUnits(treasuryBal, dec),
    totalSupply: fmtUnits(totalSupply, dec), delay: delay.toString(), now: now.toString(), proposals,
  };
}

function buildUserMessage(allStates) {
  const council = COUNCIL.map((c) => `- ${c.label}: ${c.address}`).join("\n");
  const blocks = allStates
    .map((s) => {
      const props = s.proposals.length
        ? s.proposals.map((p) => `    #${p.id} ${p.status} -> ${p.target} | ${p.amount} $${s.sym} | "${p.memo}" | eta=${p.eta}`).join("\n")
        : "    (none)";
      return `### $${s.sym} treasury\nTreasury balance: ${s.treasuryBalance} $${s.sym}\nTotal supply: ${s.totalSupply}\nDelay: ${s.delay}s | now: ${s.now}\nProposals:\n${props}`;
    })
    .join("\n\n");
  return `=== ON-CHAIN STATE (${allStates.length} governed tokens) ===\n\n${blocks}\n\nCouncil / valid recipients:\n${council}\n\nDecide your actions for each token.`;
}

async function callOpenAI(userMessage) {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error("OpenAI error " + resp.status + ": " + JSON.stringify(data));
  return data.choices[0].message.content;
}

function parseDecision(content) {
  try {
    return JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("could not parse LLM JSON: " + content);
    return JSON.parse(m[0]);
  }
}

async function act(decision, treasury, token, state) {
  const action = decision.action;
  if (action === "wait") return { action: "wait", detail: decision.reasoning || "nothing to do" };
  if (action === "propose") {
    const target = String(decision.target).toLowerCase();
    const amount = ethers.parseUnits(String(decision.amount), state.dec);
    const memo = String(decision.memo || "").slice(0, 200);
    if (!ethers.isAddress(target) || target === ethers.ZeroAddress) throw new Error("propose: invalid target");
    if (amount <= 0n) throw new Error("propose: amount must be > 0");
    const liveBal = await token.balanceOf(treasury.target);
    if (amount > liveBal) throw new Error(`propose: ${decision.amount} exceeds treasury balance ${fmtUnits(liveBal, state.dec)}`);
    const tx = await treasury.propose(target, amount, memo);
    const rc = await tx.wait();
    const id = Number(await treasury.proposalCount()) - 1;
    return { action: "propose", proposalId: id, target, amount: decision.amount, memo, tx: tx.hash, blocks: rc ? rc.blockNumber : null };
  }
  if (action === "execute") {
    const id = Number(decision.proposalId);
    const p = state.proposals.find((x) => x.id === id);
    if (!p) throw new Error(`execute: #${id} not found`);
    if (p.status === "EXECUTED") throw new Error(`execute: #${id} already executed`);
    if (p.status === "CANCELLED") throw new Error(`execute: #${id} already cancelled`);
    if (p.status !== "MATURED") throw new Error(`execute: #${id} time-lock still active`);
    const tx = await treasury.execute(id);
    const rc = await tx.wait();
    return { action: "execute", proposalId: id, tx: tx.hash, blocks: rc ? rc.blockNumber : null };
  }
  if (action === "cancel") {
    const id = Number(decision.proposalId);
    const p = state.proposals.find((x) => x.id === id);
    if (!p) throw new Error(`cancel: #${id} not found`);
    if (p.status === "EXECUTED" || p.status === "CANCELLED") throw new Error(`cancel: #${id} already final`);
    const tx = await treasury.cancel(id);
    const rc = await tx.wait();
    return { action: "cancel", proposalId: id, tx: tx.hash, blocks: rc ? rc.blockNumber : null };
  }
  throw new Error("unknown action: " + action);
}

async function runOnce() {
  if (!OPENAI_KEY) throw new Error("OPENAI_API_KEY not set in .env");
  if (!MIND_KEY) throw new Error("MIND_PRIVATE_KEY not set in .env");
  if (!fs.existsSync(REGISTRY_PATH)) throw new Error("mind/registry.json missing — run `npm run mind:deploy` first");

  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  const provider = new ethers.JsonRpcProvider(RPC);
  const mind = new ethers.Wallet(MIND_KEY, provider);

  const states = [];
  const ctx = [];
  for (const t of registry.treasuries) {
    const treasury = new ethers.Contract(t.treasury, TREASURY_ABI, mind);
    const token = new ethers.Contract(t.token, ERC20_ABI, provider);
    const state = await gatherOne(treasury, token, provider);
    states.push(state);
    ctx.push({ treasury, token, state, symbol: state.sym });
  }

  const userMessage = buildUserMessage(states);
  console.log(userMessage, "\n");

  const content = await callOpenAI(userMessage);
  const parsed = parseDecision(content);
  const decisions = Array.isArray(parsed.decisions) ? parsed.decisions : [];

  const results = [];
  for (const d of decisions) {
    const entry = ctx.find((c) => c.symbol.toLowerCase() === String(d.token).toLowerCase());
    if (!entry) {
      results.push({ token: d.token, error: "unknown token symbol" });
      continue;
    }
    try {
      const result = await act(d, entry.treasury, entry.token, entry.state);
      results.push({ token: entry.symbol, decision: d, result });
    } catch (e) {
      results.push({ token: entry.symbol, decision: d, error: e.message });
    }
  }

  const out = { ts: new Date().toISOString(), mind: mind.address, decisions, results };
  logEntry(out);
  console.log("\n=== DECISIONS ===");
  console.log(JSON.stringify(out, null, 2));
  return out;
}

if (process.argv.includes("--once")) {
  runOnce().then(() => process.exit(0)).catch((e) => {
    console.error("MIND ERROR:", e.message || e);
    process.exit(1);
  });
} else {
  const interval = Number(process.env.MIND_INTERVAL || 30);
  console.log(`🧠 Mind keeper loop started (interval ${interval}s). Ctrl+C to stop.\n`);
  (async function loop() {
    try {
      await runOnce();
    } catch (e) {
      console.error("MIND ERROR:", e.message || e);
    }
    setTimeout(loop, interval * 1000);
  })();
}
