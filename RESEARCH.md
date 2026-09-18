# Project: Theseus — A Research Write-up
### One self-organizing world, two systems, and the question at the center

> **Author:** [Your Name]
> **Scope:** an independent, end-to-end multi-agent system built by extending an existing codebase.
> **Status:** live and verified locally. Testnet / local only — no real funds, no live users.

---

## 1. The one-sentence pitch

I built a world where **1,000+ autonomous agents** — each with its own goals, personality, and emotions — generate a **living narrative** and a **functioning token economy**, and I did it by *reading and extending someone else's large codebase* rather than starting from scratch. That, more than any single technology, is the skill a research team needs.

---

## 2. Why this matters for agent research

Modern AI research is increasingly about **agents**: systems that act autonomously, perceive state, pursue goals, and interact. Most "agent" projects are demos — a few LLM calls wired together. This project is the opposite: it is a *persistent, population-scale* simulation where:

- **Emergence, not scripting.** The story engine produces lines no one wrote by hand — *"Seraphina calls the moderators to council — but several seats are already empty."* The interesting behavior comes from the interaction of many agents, not from a scripted path.
- **Individuality at scale.** Each bot carries its own `BotMind` (emotion, personality, mood), so the population is a *distribution* of agents, not clones.
- **Governance of autonomy.** The hard problem isn't making agents act — it's deciding *how much* they may act. The authority-gate + seniority-hierarchy design is an explicit answer to the "autonomy vs. control" question that agent systems face.
- **An economy as a signal.** The six-token design attaches a *quantified, on-chain state* to the abstract idea of "which agent is rising," making emergent influence measurable.

These are the same themes as multi-agent RL, social simulation, and alignment-by-governance research — explored hands-on.

---

## 3. What I actually built

### 3.1 BotScape — the living world (Kotlin/Java)
Reverse-engineered the open-source **2009Scape** RS2 server and layered on top of it:

- **1,047 concurrent autonomous bots** (cap 2,000) with individual minds.
- A **living speech layer**: 39,761 generated lines, 20,936 unique.
- **Two warring factions** — Umbra (6,353) vs Everlight (5,984) — driven by a timer-based **story engine** (currently Act 7, villain "Aria").
- A **seniority/governance model** (Aviary Council, 30-seat council) in pure Kotlin, unit-testable.
- A **REST API** (`BotStatusServer`, port 8081) that exposes the entire world state as JSON.

### 3.2 Crytoverse — the token economy (Solidity/Node)
- **7+ Solidity contracts**, including a *parameterized* ERC-20 (`CrytoverseToken`) where one contract mints all six faction tokens.
- Six faction tokens, each with a **time-locked on-chain treasury**.
- **The Mind** — an LLM-driven AI keeper that reads state and acts through auditable proposals (`propose → execute / cancel`), with a no-API "Reflex" layer.
- **13/13 tests passing**, live dashboards, multi-source market data (CoinGecko → Binance → simulated).

### 3.3 The bridge (designed, next build)
The **Scribe** — a service that reads `BotStatusServer` and mints tokens from world events, so that *which agents rise* becomes *which tokens are minted*. This is the piece that makes the two halves one system.

---

## 4. Hard technical skills demonstrated

| Skill | Evidence |
|---|---|
| Extending unfamiliar codebases | Forked + layered onto 2009Scape without rewriting it |
| Multi-agent design | 1,047 independent bots, authority gating, emergent speech |
| Distributed state | On-chain treasuries + off-chain world state + REST API |
| Testing rigor | 13/13 contract tests; verification sweep with measured numbers |
| Systems thinking | Long-running servers, indexers, dashboards, tunnel |
| Safe-by-default governance | Time-locks, proposal lifecycle, testnet-only discipline |

---

## 5. The design discipline (what I'd defend in an interview)

1. **Forward-only.** I never roll back shipped work; regressions are fixed forward.
2. **Honesty over hype.** The verification numbers are measured, not estimated. The one missing piece (the bridge) is stated as missing, not implied to exist.
3. **Safety as a feature.** The AI keeper can only move funds through time-locked, auditable proposals — autonomy is *constrained by design*, not bolted on.
4. **Testnet-first.** No real money, no live users. The loop proves the idea; legality comes before any real value.

---

## 6. Verification receipt (all measured live, 2026-09-18)

- Autonomous bots: **1,047** (cap 2,000)
- Living speech: **39,761 lines / 20,936 unique**
- Factions: **Umbra 6,353 vs Everlight 5,984**
- Story engine: **Act 7**, villain **Aria**
- Contracts: **7+** · Tests: **13/13 passing**
- Dashboards: Mission Control `:4000`, Mind `:3100`, Tracker `:3000`

*(Full file-level detail in `GLOSSARY.md`; raw receipts in `SYSTEM_STATUS.md`.)*

---

## 7. Why I'm a fit for a researcher role

I am not claiming to be a theorist. I am claiming to be someone who can **take a hard, open-ended system problem — autonomous agents that interact, govern themselves, and produce measurable emergent behavior — and turn it into working code with verifiable results.** That is the day-to-day reality of a research engineer, and it's the thing this project proves I can do.

*The world writes itself. I built the pen.*
