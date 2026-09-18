# Project: Theseus — The Crytoverse

> A self-organizing world of **1,000+ autonomous AI bots** wired to a **six-token ERC-20 economy** governed by an **autonomous AI keeper** through time-locked on-chain proposals.

**Status:** testnet / local only · unaudited · portfolio system — no real funds, no live users.

---

## What this is

Two systems, one idea — *can a population of independent agents govern itself?*

| System | Stack | What it does |
|--------|-------|--------------|
| **BotScape** | Kotlin/Java (2009Scape RS2) | 1,047 autonomous bots, each with its own goals, personality, and emotions — a living, timer-driven story engine |
| **Crytoverse** | Solidity, Hardhat, Node.js | Six faction tokens, each with an on-chain treasury governed by an AI keeper via transparent, time-locked proposals |

---

## The six tokens

| Token | Role |
|-------|------|
| `CRYTO` | Base currency |
| `POX` | Governance |
| `NATA` | Bridge / trust |
| `BLISK` | Systemic-risk marker |
| `MILENKOV` | Incentive / yield |
| `BONGWATER` | Community / tipping |

---

## The Mind — AI as governor

The **Mind** is an LLM-driven keeper that:

1. **Reads** on-chain state (treasury balances, pending proposals).
2. **Decides** (via an LLM, or a no-API "Reflex" layer).
3. **Acts** through time-locked proposals — `propose → execute / cancel / changeMind`.

The "no rug pull" property is enforced by **code, not promises**: the Mind can only move funds through auditable, time-delayed proposals.

---

## Smart contracts (7)

- `CrytoToken.sol` — self-contained ERC-20 (no imports, `mint`/`burn`)
- `CrytoverseToken.sol` — parameterized ERC-20 powering all six tokens
- `TranscendenceTreasury.sol` — AI-governed treasury (the Mind)
- `TranscendenceToken.sol` — `TREND`, staking yield
- `TranscendenceEngine.sol` — yield + a self-taxing "Dream Fund"
- `MindTreasury.sol` — generalized treasury vault
- `MindRegistry.sol` — registry + time-locked proposal engine

**Tests:** 13/13 passing (CrytoToken 6 + TranscendenceTreasury 7).

---

## Run it yourself

```bash
# 1. Install
npm install

# 2. Start a local Hardhat node
npx hardhat node

# 3. Compile + test
npx hardhat compile
npx hardhat test

# 4. Deploy the six tokens (seed demo data)
node scripts/seed-demo.js

# 5. Deploy the Mind governance system
npm run mind:deploy

# 6. Run one decision cycle
npm run mind:once
```

**Dashboards:**

| Dashboard | URL |
|-----------|-----|
| Mission Control | `http://localhost:4000` |
| The Mind — Governance | `http://localhost:3100` |
| Crytoverse Tracker | `http://localhost:3000` |

---

## ⚠️ Honest scope note

- **Testnet / local only.** No real funds, no live users.
- **Unaudited.** This is a portfolio system, not production-ready.
- **Fan-work character names** (`CHARACTERS.md`) are unofficial fan-fiction expansions — they are **not** claimed as original IP.

---

## Author

**Samuel Hinds** — thegreenskinproductions@gmail.com
[github.com/thegreenskinproductions-hue](https://github.com/thegreenskinproductions-hue)
