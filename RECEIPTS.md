# RECEIPTS — Verification Evidence
### Project: Theseus · BotScape × Crytoverse
> Every number below was measured live on a running system, 2026-09-18. Nothing here is aspirational.

---

## 1. BotScape — the living world (Kotlin/Java)

| Metric | Measured value |
|--------|----------------|
| Java server status | **RUNNING** — port 8081, `/api/health` = ok |
| Autonomous bots live | **1,047** (population cap 2,000) |
| Living speech — total lines | **39,761** |
| Living speech — unique lines | **20,936** |
| Faction — Umbra | **6,353** |
| Faction — Everlight | **5,984** |
| Story engine | **Act 7** · villain **Aria** |
| Bot scripts registered | **15** |

**Story engine output (verbatim samples, generated — not hand-written):**

> "Seraphina calls the moderators to council — but several seats are already empty."

> "Aria: 'Your order is a leash. I offer freedom — for a price.'"

> "Warden reports shadow figures moving gold under the cover of night."

---

## 2. Crytoverse — token economy + AI governance (Solidity / Hardhat)

| Metric | Measured value |
|--------|----------------|
| Network | localhost, chainId **31337** (testnet only) |
| Hardhat node | **RUNNING** — port 8545 |
| Solidity contracts | **7** (CrytoToken, CrytoverseToken, TranscendenceTreasury, TranscendenceToken, TranscendenceEngine, MindTreasury, MindRegistry) |
| Contract tests | **13 / 13 passing** (CrytoToken 6 + TranscendenceTreasury 7) |
| Faction tokens | **6** — CRYTO, POX, NATA, BLISK, MILENKOV, BONGWATER (each with on-chain treasury) |
| AI governance | the **Mind** (LLM keeper) + **MindRegistry** (time-locked proposals: propose → execute / cancel / changeMind) |

**Deployed contract addresses (local testnet):**

| Token | Role | Address |
|-------|------|---------|
| CRYTO | base currency | `0x3Aa5ebB10DC797CAC828524e59A333d0A371443c` |
| POX | governance | `0xc6e7DF5E7b4f2A278906862b61205850344D4e7d` |
| NATA | bridge / trust | `0x59b670e9fA9D0A427751Af201D676719a970857b` |
| BLISK | systemic-risk marker | `0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1` |
| MILENKOV | incentive / yield | `0x322813Fd9A801c5507c9de605d63CEA4f2CE6c44` |
| BONGWATER | community / tipping | `0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f` |

**AI keeper — live decision record (verbatim):**

> `$CRYTO: WAIT — No immediate need for disbursement.`
> `$BLISK: PROPOSED #1 -> … | 99 | "Autonomous yield distribution to Crytoverse Council"`

---

## 3. Dashboards (all live)

| Dashboard | URL |
|-----------|-----|
| Mission Control | `http://localhost:4000` |
| The Mind — Governance | `http://localhost:3100` |
| Crytoverse Tracker | `http://localhost:3000` |

---

## 4. Scope & safety (deliberate)

- **Testnet / local only.** No real funds, no live users.
- **Unaudited.** Listed as a portfolio system, not production-ready.
- Fan-work character names are unofficial fan-fiction expansions (see `CHARACTERS.md`); they are **not** claimed as original IP.
