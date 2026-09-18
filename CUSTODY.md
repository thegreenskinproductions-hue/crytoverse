# CUSTODY & SAFETY — where to keep each kind of money

> **⚠️ Not financial advice.** This is a practical, educational framework for
> thinking about custody. For amounts that matter, talk to a licensed adviser
> and a fintech lawyer. Also: this project is **testnet-only** until further
> notice — real money rules only apply once real value is involved.

---

## The one rule that matters most

> **Keep each kind of value in a container that matches its risk.**

Mixing them is how people lose everything. Four containers, never combined:

| # | Container | What goes in it | Who can touch it |
|---|-----------|-----------------|------------------|
| 1 | **Cold storage** (hardware wallet / air-gapped) | Long-term crypto you won't touch for months | Only you, physically |
| 2 | **Multisig treasury** (Gnosis Safe) | Project treasury / AI-governed funds | N-of-M signers, no single person |
| 3 | **Hot wallet** | Small operating amount (gas, test spending) | Connected, expendable |
| 4 | **Bank account** | Fiat (AUD) — personal vs project, segregated | You / the entity |

---

## Situation → best container

### 1. Your own personal money (AUD)
- **Offset account** against a mortgage first — highest effective return, tax-free.
- Then a **high-interest savings account (HISA)** for emergency/float.
- Keep 3–6 months of expenses liquid before anything goes into crypto.

### 2. Project seed / operating funds (AUD, the "company" money)
- A **separate business account** (or trust account), never mixed with personal.
- This is where *Australia matters*: if you ever take money from others, you are
  likely doing something ASIC/AUSTRAC cares about — get a structure (company +
  trust) and a licensed adviser before accepting a single dollar from a third party.

### 3. Testnet crypto (what we have now)
- **Doesn't need security.** Sepolia ETH and test CRYTO are worthless by design.
- Just use a dedicated test wallet (a separate MetaMask profile), so you never
  confuse test keys with real keys.

### 4. Real crypto you hold long-term (mainnet, if it ever happens)
- **Hardware wallet** (Ledger / Trezor) — the private key never touches the internet.
- Seed phrase: **offline, on paper or stamped metal**, in a safe place. Never typed
  into a computer, never photographed, never in a password manager, never in `.env`
  or any file that could get committed to git.

### 5. The AI-governed treasury ("the Mind")
- **Multisig (e.g. Gnosis Safe), never a single key.**
- The AI keeper ("the Mind") holds **one key** of a **2-of-3 or 3-of-5** scheme.
  It can *propose* autonomously, but it can never move funds alone. That is exactly
  the "no rug pull / no insider trading / stays in safe hands" property you asked
  DeepSeek about — enforced by math, not by promises.
- The treasury contract already has a **time-lock**; combine it with **multisig**
  and you get: transparent + delayed + multi-party. That's the strongest custody
  pattern that exists on-chain today.

### 6. Funds on an exchange
- **Never leave money on an exchange.** "Not your keys, not your coins."
- Exchanges are for *trading*, not *storage*. Move anything you don't need for
  trading into cold storage immediately.

---

## Security checklist (do these, in order)

1. **Segregate** — personal ≠ project ≠ customer funds. Three mental wallets, minimum.
2. **Never reuse keys** — one address per purpose (test / personal / project / treasury).
3. **Private keys are sacred** — they live only in hardware wallets or on paper.
   They never appear in code, chat, `.env`, screenshots, or git.
4. **Multisig for anything shared** — the moment more than one person (or one AI)
   touches funds, it becomes N-of-M, no exceptions.
5. **Time-locks for large moves** — big outflows require a waiting period so nothing
   can be drained in secret.
6. **Backups** — seed phrases duplicated, split if needed, stored in separate
   physical locations. Test the recovery process *before* you need it.
7. **Air-gap the "Mind"** — the AI keeper's signing key lives in the same cold
   scheme as everyone else's. Intelligence does not earn it sole custody.

---

## The through-line to this project

Your whole vision has been: *transparent, fair, no-rug-pull, AI-managed, publicly
clear.* Custody is where that vision is won or lost — **the smartest tokenomics in
the world mean nothing if one key can drain the treasury.**

So the answer to "best bank account" is really three answers:

- **Personal cash →** offset + HISA.
- **Project cash →** segregated business/trust account.
- **Crypto (testnet now, real later) →** hardware wallet for holdings + **multisig
  time-locked treasury** for the AI-governed pool.

That last one is the *Transcendence* ending done right: the uploaded mind is
powerful, but the keys are never all in one hand.
