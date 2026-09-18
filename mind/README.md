# 🧠 The Mind — AI Governance Keeper

An OpenAI-powered agent that governs the **TranscendenceTreasury** on-chain.
It can only move funds through **time-locked, on-chain-recorded proposals** —
no instant moves, no secret moves. This is the "transparency / no rug pull"
property, enforced by code, not promises.

## Architecture

```
on-chain state ──► LLM (OpenAI) ──► JSON decision ──► validated on-chain action
  (ethers.js)       (gpt-4o)        propose/execute/cancel/wait
```

- **`TranscendenceTreasury.sol`** — the treasury. `mind` (the agent's address)
  is the only caller allowed to `propose` / `execute` / `cancel`. Every proposal
  has a `memo` stored on-chain forever and a minimum `delay` before execution.
- **`mind/governance-mind.js`** — the agent. Reads treasury balance, supply,
  and all proposals; asks the LLM what to do; validates the decision against
  on-chain constraints; then submits the transaction.
- **`scripts/deploy-treasury.js`** — deploys the treasury with the Mind as
  keeper and funds it with CRYTO.

## Setup

1. Fill `.env` (see `.env.example`):
   - `OPENAI_API_KEY` — your OpenAI key (keep in `.env`, never commit).
   - `MIND_PRIVATE_KEY` — the keeper's private key (a Hardhat default account works locally).
   - `TREASURY_DELAY` — time-lock in seconds (default 60).

2. Make sure the local chain is running and the six tokens are seeded:
   ```
   npm run node     # in one terminal
   npm run seed     # in another
   ```

3. Deploy + fund the treasury:
   ```
   npm run treasury:deploy
   ```

## Run

```
npm run mind:once   # one decision, then act
npm run mind        # keeper loop (every MIND_INTERVAL seconds)
```

## Decision JSON

```json
{ "action": "propose", "target": "0x...", "amount": 100, "memo": "why", "reasoning": "..." }
{ "action": "execute", "proposalId": 0, "reasoning": "..." }
{ "action": "cancel",  "proposalId": 0, "reasoning": "..." }
{ "action": "wait", "reasoning": "..." }
```

Every action is appended to `mind/log.jsonl` for an auditable transcript.

> ⚠️ Testnet / educational only. Not audited. Rotate any API key or private key
> that has been pasted into chat.
