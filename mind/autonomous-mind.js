// The Mind — AUTONOMOUS governance keeper (reflex + deliberation).
// Closes the full loop with zero babysitting:
//   watch on-chain state → reflex-execute matured proposals → deliberate
//   (LLM if key present, else deterministic policy) → propose → journal.
//
// Two brain layers:
//   1. REFLEX (always on, no API): auto-executes any MATURED proposal, and
//      never proposes while a PENDING proposal already exists.
//   2. DELIBERATION: asks the LLM for nuanced decisions when OPENAI_API_KEY is
//      set; otherwise falls back to a deterministic ReflexBrain policy so the
//      Mind runs truly autonomously even with no external dependency.
//
// Usage:
//   npm run mind:auto        -> keeper loop every MIND_INTERVAL seconds
//   npm run mind:auto:once   -> one full cycle (execute matured + deliberate)
//   npm run mind:auto:cycle  -> one closed loop: propose, wait out time-lock, execute
//   (append --reflex to force the deterministic brain, ignoring any LLM key)
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const REGISTRY_PATH = path.join(__dirname, "registry.json");
const LOG_PATH = path.join(__dirname, "log.jsonl");
const JOURNAL_PATH = path.join(__dirname, "journal.md");

const RPC = process.env.RPC_URL || "http://127.0.0.1:8545";
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MIND_KEY = process.env.MIND_PRIVATE_KEY;
const RESERVE_RATIO = Number(process.env.MIND_RESERVE_RATIO || 0.9); // keep 90% of funded
const DISBURSE_RATIO = Number(process.env.MIND_DISBURSE_RATIO || 0.01); // release 1% when above reserve

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

const SYSTEM_PROMPT = `You are "the Mind" — the autonomous AI governance keeper of the Crytoverse. You govern MULTIPLE treasuries, one per token.
HARD RULES:
- You may ONLY propose outflows to the listed council addresses (never to yourself, never to zero, never to an arbitrary address).
- Never propose while a PENDING proposal exists for that token; never propose more than the reserve allows (keep at least 90% of the funded amount).
- Every outflow is time-locked and its memo is recorded on-chain forever. Write a short honest memo.
- Prefer "wait" unless there is a clear reason to disburse (yield distribution, community seeding, rebalancing).
Respond with STRICT JSON: {"decisions":[{"token":"CRYTO","action":"propose"|"wait","target":"0x...","amount":"50","memo":"...","reasoning":"..."}]}`;

const fmtUnits = (v, dec = 18) => {
  const n = BigInt(v);
  const div = BigInt(10) ** BigInt(dec);
  const whole = n / div;
  const frac = (n % div).toString().padStart(dec, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac.slice(0, 4)}` : String(whole);
};

let mind;
let provider;
let nonce;  // sequential tx nonce for the Mind wallet (Hardhat automining safe)

function loadRegistry() {
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
}

function logEntry(entry) {
  fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n");
}

function journal(cycle, entry) {
  const head = `# Mind Decision Journal\n\nAutonomous governance keeper. Reflex + deliberation. Latest cycle first.\n\n`;
  if (!fs.existsSync(JOURNAL_PATH)) fs.writeFileSync(JOURNAL_PATH, head);
  const block = `## ${entry.ts} — cycle ${cycle}\n` + entry.lines.map((l) => `- ${l}`).join("\n") + "\n\n";
  const prev = fs.readFileSync(JOURNAL_PATH, "utf8").replace(head, "");
  fs.writeFileSync(JOURNAL_PATH, head + block + prev);
}

async function gatherAll(registry) {
  const latest = await provider.getBlock("latest");
  const chainNow = BigInt(latest.timestamp);
  const states = [];
  for (const t of registry.treasuries) {
    const treasury = new ethers.Contract(t.treasury, TREASURY_ABI, mind);
    const token = new ethers.Contract(t.token, ERC20_ABI, mind);
    const [decBn, treasuryBal, totalSupply, count] = await Promise.all([
      token.decimals(), token.balanceOf(t.treasury), token.totalSupply(), treasury.proposalCount(),
    ]);
    const dec = Number(decBn);
    const now = chainNow;
    const proposals = [];
    for (let i = 0; i < Number(count); i++) {
      const p = await treasury.proposals(i);
      const status = p.executed ? "EXECUTED" : p.cancelled ? "CANCELLED" : now >= p.eta ? "MATURED" : "PENDING";
      proposals.push({ id: i, status, target: p.target, amount: fmtUnits(p.amount, dec), memo: p.memo, eta: p.eta.toString() });
    }
    states.push({
      symbol: t.symbol, tokenAddr: t.token, treasuryAddr: t.treasury,
      funded: t.funded, dec, treasuryBalance: fmtUnits(treasuryBal, dec),
      treasuryBalanceWei: treasuryBal, totalSupply: fmtUnits(totalSupply, dec),
      now: now.toString(), proposals, treasury, token,
    });
  }
  return states;
}

// --- REFLEX LAYER (deterministic, always runs) ---
async function reflexExecute(states) {
  const executed = [];
  for (const s of states) {
    for (const p of s.proposals) {
      if (p.status !== "MATURED") continue;
      const tx = await s.treasury.execute(p.id, { nonce: nonce++ });
      await tx.wait();
      executed.push(`${s.symbol} #${p.id} (${p.amount} -> ${p.target})`);
    }
  }
  return executed;
}

// --- DELIBERATION LAYER ---
function reflexPolicy(states) {
  const decisions = [];
  for (const s of states) {
    const hasPending = s.proposals.some((p) => p.status === "PENDING");
    const hasMatured = s.proposals.some((p) => p.status === "MATURED");
    if (hasPending || hasMatured) { decisions.push({ token: s.symbol, action: "wait", reasoning: "pending/matured proposal in flight" }); continue; }

    const bal = s.treasuryBalanceWei;
    const reserve = BigInt(s.funded) * BigInt(Math.round(RESERVE_RATIO * 1000)) / 1000n;
    if (bal <= reserve) { decisions.push({ token: s.symbol, action: "wait", reasoning: "below reserve threshold" }); continue; }

    const amountWei = bal * BigInt(Math.round(DISBURSE_RATIO * 1000)) / 1000n;
    const c = COUNCIL[Number(s.proposals.length) % COUNCIL.length];
    decisions.push({
      token: s.symbol, action: "propose", target: c.address,
      amount: fmtUnits(amountWei, s.dec),
      memo: `Autonomous yield distribution to ${c.label}`,
      reasoning: "treasury above reserve; releasing routine yield",
    });
  }
  return decisions;
}

async function callOpenAI(userMessage) {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: OPENAI_MODEL, temperature: 0.2, response_format: { type: "json_object" },
      messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userMessage }],
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error("OpenAI error " + resp.status + ": " + JSON.stringify(data));
  return data.choices[0].message.content;
}

function parseJSON(content) {
  try { return JSON.parse(content); } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("could not parse JSON: " + content);
    return JSON.parse(m[0]);
  }
}

async function deliberate(states) {
  const council = COUNCIL.map((c) => `- ${c.label}: ${c.address}`).join("\n");
  const blocks = states.map((s) => {
    const props = s.proposals.length ? s.proposals.map((p) => `    #${p.id} ${p.status} -> ${p.target} | ${p.amount} $${s.symbol} | "${p.memo}" | eta=${p.eta}`).join("\n") : "    (none)";
    return `### $${s.symbol}\nbalance=${s.treasuryBalance} funded=${fmtUnits(s.funded, s.dec)} supply=${s.totalSupply}\nproposals:\n${props}`;
  }).join("\n\n");
  const userMessage = `=== ON-CHAIN STATE (${states.length} tokens) ===\n\n${blocks}\n\nCouncil / valid recipients:\n${council}\n\nDecide per token.`;

  let decisions;
  let source;
  if (OPENAI_KEY && !process.argv.includes("--reflex")) {
    const content = await callOpenAI(userMessage);
    const parsed = parseJSON(content);
    decisions = Array.isArray(parsed.decisions) ? parsed.decisions : [];
    source = "llm";
  } else {
    decisions = reflexPolicy(states);
    source = "reflex";
  }
  return { decisions, source };
}

async function act(decision, s) {
  if (decision.action === "wait") return { action: "wait", detail: decision.reasoning || "nothing to do" };
  if (decision.action === "propose") {
    const target = String(decision.target).toLowerCase();
    const amount = ethers.parseUnits(String(decision.amount), s.dec);
    const memo = String(decision.memo || "").slice(0, 200);
    if (!ethers.isAddress(target) || target === ethers.ZeroAddress) throw new Error("invalid target");
    if (amount <= 0n) throw new Error("amount must be > 0");
    if (s.proposals.some((p) => p.status === "PENDING")) throw new Error("pending proposal exists");
    const tx = await s.treasury.propose(target, amount, memo, { nonce: nonce++ });
    const rc = await tx.wait();
    const id = Number(await s.treasury.proposalCount()) - 1;
    return { action: "propose", proposalId: id, target, amount: decision.amount, memo, tx: tx.hash, block: rc ? rc.blockNumber : null };
  }
  throw new Error("unsupported action: " + decision.action);
}

async function runCycle() {
  const registry = loadRegistry();
  nonce = await provider.getTransactionCount(mind.address, "latest");
  const states = await gatherAll(registry);

  // 1) Reflex: execute matured proposals (closes the loop deterministically).
  const executed = await reflexExecute(states);

  // 2) Deliberate: decide next actions.
  const { decisions, source } = await deliberate(states);

  // 3) Act.
  const results = [];
  for (const d of decisions) {
    const s = states.find((x) => x.symbol.toLowerCase() === String(d.token).toLowerCase());
    if (!s) { results.push({ token: d.token, error: "unknown token" }); continue; }
    try { results.push({ token: s.symbol, decision: d, result: await act(d, s) }); }
    catch (e) { results.push({ token: s.symbol, decision: d, error: e.message }); }
  }

  const ts = new Date().toISOString();
  const entry = { ts, mind: mind.address, source, executed, decisions, results };
  logEntry(entry);

  const lines = [];
  if (executed.length) lines.push(...executed.map((e) => `EXECUTED ${e}`));
  else lines.push("no matured proposals to execute");
  for (const r of results) {
    if (r.error) lines.push(`$${r.token}: ERROR ${r.error}`);
    else if (r.result.action === "propose") lines.push(`$${r.token}: PROPOSED #${r.result.proposalId} -> ${r.result.target} | ${r.result.amount} | "${r.result.memo}"`);
    else lines.push(`$${r.token}: WAIT (${r.result.detail})`);
  }
  journal(entry.decisions ? entry.decisions.length : 0, { ts, lines });

  return { ts, source, executed, results };
}

function printSummary(out) {
  console.log(`\n=== MIND CYCLE (${out.source}) ===`);
  console.log("executed:", out.executed.length ? out.executed.join(", ") : "none");
  for (const r of out.results) {
    if (r.error) console.log(`  $${r.token}: ERROR ${r.error}`);
    else if (r.result.action === "propose") console.log(`  $${r.token}: PROPOSED #${r.result.proposalId} -> ${r.result.target} | ${r.result.amount} | "${r.result.memo}"`);
    else console.log(`  $${r.token}: WAIT — ${r.result.detail}`);
  }
}

async function main() {
  if (!MIND_KEY) throw new Error("MIND_PRIVATE_KEY not set in .env");
  provider = new ethers.JsonRpcProvider(RPC);
  mind = new ethers.Wallet(MIND_KEY, provider);

  const cycle = process.argv.includes("--cycle");

  if (cycle) {
    // Closed loop: propose now, wait out the time-lock, then execute.
    const first = await runCycle();
    printSummary(first);
    const proposed = first.results.filter((r) => r.result && r.result.action === "propose");
    if (!proposed.length) { console.log("(nothing proposed — nothing to settle)"); return; }

    const registry = loadRegistry();
    let maxEta = 0;
    for (const s of await gatherAll(registry)) {
      for (const p of s.proposals) if (p.status === "PENDING") maxEta = Math.max(maxEta, Number(p.eta));
    }
    const wait = Math.max(0, maxEta - Math.floor(Date.now() / 1000)) + 3;
    console.log(`\n⏳ time-lock active — waiting ${wait}s for proposals to mature…`);
    await new Promise((r) => setTimeout(r, wait * 1000));

    const second = await runCycle();
    printSummary(second);
    return;
  }

  const out = await runCycle();
  printSummary(out);
}

if (process.argv.includes("--once") || process.argv.includes("--cycle")) {
  main().then(() => process.exit(0)).catch((e) => { console.error("MIND ERROR:", e.message || e); process.exit(1); });
} else {
  const interval = Number(process.env.MIND_INTERVAL || 30);
  console.log(`🧠 Autonomous Mind keeper loop started (interval ${interval}s, source=${OPENAI_KEY ? "llm+reflex" : "reflex"}). Ctrl+C to stop.\n`);
  (async function loop() {
    try { printSummary(await runCycle()); } catch (e) { console.error("MIND ERROR:", e.message || e); }
    setTimeout(loop, interval * 1000);
  })();
}
