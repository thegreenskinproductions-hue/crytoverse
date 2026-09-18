# PROJECT: THESEUS — THE COMPLETE GLOSSARY
### A 12-part reference to BotScape (the living world) & the Crytoverse (the token economy)

> **How to read this:** Sections 1–11 walk through the system thematically, one concept at a time.
> Section 12 is a full alphabetical index so a reader can jump straight to any term.
> Every number here is **real and verified** (see Section 11 · Verification), not aspirational.

---

## 1. The Two Worlds — Master Map

The whole project is two systems that were built separately and are designed to merge into one.

| | **BotScape** (the world) | **Crytoverse** (the economy) |
|---|---|---|
| What it is | A reverse-engineered RS2 server populated by autonomous bots | A six-token ERC-20 economy with AI governance |
| Location | `C:\Users\samue\Projects\2009Scape-Server\2009scape-master` | `C:\cryto-token` |
| Language | Kotlin + Java (Maven) | Solidity + JavaScript (Hardhat/Node) |
| The "soul" | ~1,047 bots with individual minds | 6 faction tokens + TREND + "the Mind" |
| Exposed via | `BotStatusServer` REST API (`:8081`) | On-chain state + local dashboards |
| Live proof | 39,761 lines of emergent speech, 2 warring factions, Act 7 of the story | 13/13 tests passing, 6 funded treasuries |

**The missing link** — the *Scribe bridge* — is the piece that reads BotScape's JSON and mints tokens from it. It is designed but not yet built (Section 11).

---

## 2. The World & Lore (Glossary A)

**Aethyr** — the name of the game universe itself (the way *Gielinor* is to RuneScape). A living world, not a fixed quest line.

**Project: Theseus** — the engineering effort that builds Aethyr. "Theseus" refers to the ship-of-Theseus idea: reverse-engineering and rebuilding a system piece by piece until it is a new thing that still holds the original's rules and ethics.

**BotScape** — the product vision: the first private server (RSPS) that retains 2009Scape's rules and ethics, but adds a *built-in, legal bot system*. Players may let their bot play for them while they are away (sleep, school, work), with fairness of opportunity as a core value.

**2009Scape** — the open-source RS2 (RuneScape 2) remake server that was reverse-engineered as the foundation. Upstream is `gitlab.com/2009scape/2009scape`.

**RSPS** — "RuneScape Private Server," the category this falls into.

**Reverse engineering** — the method used here: reading an unfamiliar large codebase, understanding its structure, and extending it rather than rebuilding from scratch.

**Goddess inversion** — a deliberate writing choice: Aria, the shadow/hollow, is *not* purely evil, and Seraphina, the light/order, is *not* purely good. The roles are kept inverted on purpose because it makes the better story.

---

## 3. Factions, Characters & Deities (Glossary B)

**Aria** — *the Hollow*. Goddess of Umbra (shadow, greed, the dark of the market). The story's villain, though her motives are layered. Her line: *"Your order is a leash. I offer freedom — for a price."*

**Seraphina** — *the Everlight*. Goddess of order and light. Her line: *"Hold the line at the exchange. The price of a soul should never be written in gp."*

**Umbra** — the shadow faction (Aria's side). Live count: **6,353**.

**Everlight** — the light faction (Seraphina's side). Live count: **5,984**.

**The Remade** — the seven senior founders who once tried to dethrone the goddesses and were instead remade as their servants (see Hierarchy). "Remade" = the Aviary Council's senior seven.

**Furon High Command** — a flavor name used in early governance demos (a nod to *Destroy All Humans!*), later replaced by the "Crytoverse Council" naming.

---

## 4. Hierarchy & Governance (Glossary C)

The seniority model (post-Reforging), highest to lowest:

| Rank | Level | Who |
|---|---|---|
| FOUNDER | 6 | **Historic only** — abolished after the coup. No one holds it anymore. |
| GODDESS | 5 | Aria + Seraphina |
| SUPER_ADMIN | 4 | The Remade (seven senior founders) |
| ADMIN | 3 | — |
| PMOD | 2 | — |
| PLAYER | 1 | — |
| BOT | 0 | The autonomous agents |

**Reforging** — the in-world event where the coup failed and the hierarchy was reordered so the Remade serve *beneath* the goddesses they tried to dethrone.

**Aviary Council** — the seven senior founders ("the Remade"), modeled in pure Kotlin (`AviaryCouncil.kt`), standalone and unit-testable, with functions like `outranksGoddess()` (always `false` post-Reforging) and `servesGoddess()`.

**Shadow 30 Council** — a planned 30-seat democratic council serving Aria & Seraphina; it "moves the pawns" and counsels both goddesses. Designed as a *shadow* of the formal hierarchy.

---

## 5. The Bot System — Agents (Glossary D)

**Bot** — an autonomous, player-simulating agent. Each bot has its own goals, personality, beliefs, and emotions ("individual isolated incidents"), and they grow off each other to form communities. Target **~1,000 bots per world** (hard max **2,000**). Live count: **1,047**.

**BotMind** — the bot's internal mind model (`BotMind.kt`), holding emotion, personality, mood (stress/happiness/social needs), and generation. This is the heart of the "each bot is its own person" idea.

**BotWorld** — shared world state for the bots.

**BotNavigator** — unified navigation: a bot can navigate to a named anchor (e.g. `"varrock"`, `"ge"`, `"lumby"`) or a coordinate, teleporting if far then walking the rest.

**BotPersistence / BotSave / BotRelease** — save/load, serialization, and release/versioning of bot state.

**Script** — the abstract bot-behavior base class (`Script.java`). A bot's behavior is a `Script` with an `inventory`, `equipment`, `skills`, `quests`, and a `tick()` loop.

**ScriptAPI** — the API scripts call into (`ScriptAPI.kt`), the bridge between a script and the game world.

**Assemblers & builders** — `AIPBuilder`, `AIPlayer`, `GeneralBotCreator`, `CombatBot`/`CombatBotAssembler`, `SkillingBotAssembler`, `PvMBots`/`PvMBotsBuilder` — these construct bots of different kinds (combat, skilling, PvM, general).

**PlayerScripts** — the registry mapping script identifiers → script classes (the "bots make the scripts" surface).

**ScriptDescription / ScriptIdentifier / ScriptName** — metadata for scripts.

**SOUL.md** — the in-repo document describing the bot's "soul" — the philosophy behind giving bots inner lives.

**Bot scripts live** — **15 registered** (e.g. `Adventurer`, `Catherby Lobs`, and others).

---

## 6. Autonomy, Authority & Speech (Glossary E)

**BotAutonomy** — how much freedom a bot has to act on its own.

**BotAuthorityGate** — the gate that controls what a bot is permitted to do (authority enforcement).

**BotAuthorityLedger** — the record of authority decisions.

**BotSpeechRegistry** — the registry of what bots may say / have said.

**Free-speech doctrine (historical)** — an earlier design gave bots full freedom of speech, with higher-ranking bots watching/moderating lower ones, and eventually speech permitted only with approval. This was later refined/rolled back (`.bak-freespeech` backups exist), reflecting the "watched but free" governance theme.

**BotDialogue** — structured bot-to-bot / bot-to-player dialogue.

**BotAdmins / BotFirstBatch** — bot administration and the initial bot cohort.

**WorldVibe** — the ambient "mood" of the world as a whole.

---

## 7. The Story Engine (Glossary F)

**LivingStoryEngine** — (`LivingStoryEngine.kt`) the timer-driven, ever-expanding narrative that broadcasts into the world via `sendNews`, feeds the in-client overlay via `MarketNews`, and grows over time. It is *not* a fixed quest line.

**StoryAct** — a chapter of the saga, each with an `id`, `title`, `subtitle`, `heroLine`, and an `umbraBias` (how much it leans toward Aria's shadow).

**Act I — The Shadow Market** — Aria corrupts the exchange from within. The current engine is at **Act index 7**, subtitle "ever-expanding."

**sendNews** — the broadcast channel that pushes story beats to all players/bots.

**MarketNews** — the in-client overlay stream of the story.

**Emergent narrative** — the key concept: the world *writes itself*; lines like *"Seraphina calls the moderators to council — but several seats are already empty"* are generated by the system, not hand-authored.

---

## 8. The Token Economy — Crytoverse (Glossary G)

The six tokens map to six *Destroy All Humans! 2* characters, each given a deep original backstory and a distinct **job** in the system:

| Token | Character | Role in the system |
|---|---|---|
| **CRYTO** | Crypto | **Base currency** — the reserve/liquidity unit |
| **POX** | Pox | **Governance** — voting weight |
| **NATA** | Natalya | **Bridge / trust** — cross-faction settlement |
| **BLISK** | Blisk | **Systemic-risk marker** — signals instability |
| **MILENKOV** | Milenkov | **Incentive / yield** — staking rewards |
| **BONGWATER** | Bongwater | **Community / tipping** — social reward |

*(Full lore in `CHARACTERS.md`.)*

**TREND** — a seventh token ("Transcendence"), themed on the film *Transcendence* (Dr. Will Caster), representing "the dream becomes currency."

---

## 9. Contracts & AI Governance (Glossary H)

**CrytoToken** — the original self-contained ERC-20 (no imports). Rebranded to **TheCrypto / THECRYPTO** for IP-safety (the contract itself carries a legal note to re-brand before any real launch).

**CrytoverseToken** — a *parameterized* ERC-20: name, symbol, role, and initial supply are set at deploy time, so **one contract powers all six tokens** (and, in the future, a thousand bot/faction tokens).

**TranscendenceTreasury** — an AI-governed treasury (the "Mind" vault): deposit / propose / execute / cancel / changeMind, with a time-lock and on-chain events.

**TranscendenceToken (TREND)** — the dream currency, minted by the engine.

**TranscendenceEngine** — mints TREND and funds the "dream" from its own yield; it becomes TREND's sole minter.

**MindTreasury** — one treasury per token (6 total, each funded **10,000**).

**MindRegistry** — the registry that discovers all treasuries automatically (address, delay, tokens).

**The Mind** — the LLM-driven AI keeper that reads on-chain state, decides, and acts via time-locked proposals. It has two layers:
- **Reflex** — always-on, runs without any API (rule-based).
- **LLM** — the full decision layer (e.g. OpenAI `gpt-4o-mini`).

**Proposal lifecycle** — `propose → (time-lock) → execute / cancel / changeMind`. Every disbursement is time-locked and auditable.

**Time-lock (`TREASURY_DELAY`)** — 60 seconds on the local chain; the delay before a proposal can execute.

---

## 10. Infrastructure & Dashboards (Glossary I)

**BotStatusServer** — (`BotStatusServer.kt`) the REST server on `:8081` exposing live world state. Endpoints: `/api/health`, `/api/status`, `/api/factions`, `/api/story`, `/api/bots`, `/api/minds`, `/api/news`, `/api/prices`, `/api/trades`, `/api/scripts`, `/api/tiers`, `/api/living`.

**Hardhat** — the Ethereum development framework (compile, test, deploy, local node).

**Local testnet** — chainId **31337** (Hardhat node on `:8545`). Test network: **Sepolia**.

**Mission Control** — the main dashboard, `:4000`, showing portfolio, token stats, market data.

**The Mind — Governance** — dashboard, `:3100`, showing the AI keeper's proposals/executions.

**Tracker** — local indexer + dashboard server (`:3000`) that computes supply, mints, burns, holders, transfers in real time.

**pricing.js / market.js / race.js** — multi-source price data with automatic fallback priority: **CoinGecko → Binance → simulated oracle**.

**Electron app** — a desktop wrapper for the dashboards.

**cloudflared tunnel** — a tunnel tool (in `tools/`) for exposing a local dashboard externally.

**Wallet** — `0xAaa6a88cA55E6e941476435eCC757Ba39BD420A1`, funded with **0.006 ETH on Ethereum mainnet** (test-purpose only).

**SYSTEM_STATUS.md** — the verification receipt (Section 11 numbers).

---

## 11. The Bridge (Scribe) + Verification

### The Scribe bridge (designed, not yet built)

The piece that merges the two worlds:

1. A Node service polls `BotStatusServer` and translates world events into on-chain actions.
2. **Server → chain:** every faction, and every bot that "rises," gets a token minted automatically (using the parameterized `CrytoverseToken`).
3. **Chain → server:** token balance maps to in-game rank/identity.
4. **The Risen:** when a bot crosses a threshold (founds a faction, wins a vote, is crowned by the council), its token is minted on the spot.
5. **Play-to-earn (testnet only):** skilling milestones, quests, GE trades, PvM kills, and faction victories become claimable rewards.

**Hard rule (recorded honestly):** testnet-first, no real money, ever, until legal sign-off (ASIC/AUSTRAC in Australia). The loop is built to *prove* it works; real value comes only after a lawyer approves.

### Verification numbers (all measured live)

| Metric | Value |
|---|---|
| Autonomous bots live | **1,047** (cap 2,000) |
| Living speech lines | **39,761 total / 20,936 unique** |
| Faction counts | Umbra **6,353** vs Everlight **5,984** |
| Story engine | Act **7**, villain **Aria** |
| Bot scripts registered | **15** |
| Solidity contracts | **7+** |
| Contract tests | **13/13 passing** (CrytoToken 6 + TranscendenceTreasury 7) |
| Faction tokens | **6** (each with funded treasury, 10,000) |
| Dashboards | Mission Control `:4000`, Mind `:3100`, Tracker `:3000` |

---

## 12. Alphabetical Index

- **2009Scape** — §2 · the reverse-engineered RS2 server foundation
- **Aethyr** — §2 · the living game universe
- **AIPBuilder / AIPlayer** — §5 · bot construction
- **Aria** — §3 · the Hollow, villain
- **Aviary Council** — §4 · the Remade (seven founders)
- **BLISK** — §8 · systemic-risk marker token
- **BONGWATER** — §8 · community/tipping token
- **Bot (agent)** — §5 · autonomous player-simulating entity
- **BotAuthorityGate / Ledger** — §6 · authority enforcement & record
- **BotMind** — §5 · the bot's inner mind model
- **BotNavigator** — §5 · unified navigation
- **BotScape** — §2 · the product vision
- **BotSpeechRegistry** — §6 · speech registry
- **BotStatusServer** — §10 · REST API on :8081
- **BotWorld** — §5 · shared bot world state
- **cloudflared** — §10 · tunnel tool
- **CombatBot / SkillingBotAssembler / PvMBots** — §5 · bot kinds
- **CRYTO** — §8 · base currency token
- **CrytoToken** — §9 · self-contained ERC-20 (TheCrypto)
- **Crytoverse** — §8 · the six-token economy
- **CrytoverseToken** — §9 · parameterized ERC-20
- **Emergent narrative** — §7 · the world writes itself
- **Everlight** — §3 · the light faction (Seraphina)
- **FOUNDER / GODDESS / SUPER_ADMIN / ADMIN / PMOD / PLAYER / BOT** — §4 · the ranks
- **Goddess inversion** — §2 · deliberate role inversion
- **Hardhat** — §10 · Ethereum dev framework
- **LivingStoryEngine** — §7 · timer-driven saga
- **MarketNews / sendNews** — §7 · story broadcast channels
- **MILENKOV** — §8 · incentive/yield token
- **The Mind** — §9 · LLM-driven AI keeper
- **MindRegistry / MindTreasury** — §9 · governance registry & vaults
- **Mission Control / The Mind dashboard / Tracker** — §10 · dashboards
- **NATA** — §8 · bridge/trust token
- **PlayerScripts** — §5 · script registry
- **POX** — §8 · governance token
- **Project: Theseus** — §2 · the engineering effort
- **Reforging** — §4 · the hierarchy reordering event
- **The Remade** — §3 · the seven founders
- **Reverse engineering** — §2 · the method
- **RSPS** — §2 · RuneScape private server
- **Script / ScriptAPI** — §5 · bot behavior abstraction
- **Scribe bridge** — §11 · the merge layer (to build)
- **Sepolia / chainId 31337** — §10 · test networks
- **Seraphina** — §3 · the Everlight
- **Shadow 30 Council** — §4 · the democratic council
- **StoryAct** — §7 · a chapter of the saga
- **TREND / Transcendence** — §8–9 · the dream currency & engine
- **Umbra** — §3 · the shadow faction (Aria)
- **Wallet (0xAaa6…)** — §10 · the test wallet

---

*End of glossary. Every claim in this document corresponds to a file in `C:\cryto-token` or `C:\Users\samue\Projects\2009Scape-Server\2009scape-master`, and every live number was measured during the verification sweep of 2026-09-18.*
