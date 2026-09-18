# GO-LIVE — making the dream real (3 steps)

> *"The path to building a truly intelligent machine is to give it the ability to
> improve itself — and then stand back."* — *Transcendence*

Everything so far runs on `localhost`. Making it **real** means deploying to a
public chain with real gas. This is the exact path, in order. We go **testnet
first, always** — then, only when proven, to mainnet with a cold wallet.

---

## Step 1 — Fund a real wallet (you, one time)

1. Install a wallet: **MetaMask** (browser) or a hardware wallet (Ledger/Trezor) for mainnet.
2. Create a **brand-new account**. Never reuse a key that has ever been pasted anywhere.
3. For **Sepolia testnet** (free, real network): get test ETH from a faucet —
   - https://faucets.chain.link/sepolia
   - https://sepoliafaucet.com
4. Export the account's **private key** (MetaMask → account details → show private key).
   Put it in `.env` as `PRIVATE_KEY=...`.

> ⚠️ **Iron rule:** the `MIND_PRIVATE_KEY` in the current `.env` is a Hardhat dev
> default and is **public knowledge**. It must NEVER hold real value. For mainnet,
> use a hardware wallet and never export its seed.

## Step 2 — Wire an RPC + explorer key (you, one time)

- Create a free **Alchemy** or **Infura** account → get a Sepolia RPC URL → put in `SEPOLIA_RPC`.
- Create a free **Etherscan** API key → put in `ETHERSCAN_API_KEY` (enables contract verification).

## Step 3 — Deploy (me, after you drop in the keys)

```bash
# Testnet first (free):
npx hardhat run scripts/deploy-production.js --network sepolia

# Then mainnet / L2 (real money — only after testnet is proven + audited):
npx hardhat run scripts/deploy-production.js --network base
```

The script will:
1. Deploy `TREND` (TranscendenceToken).
2. Deploy `TranscendenceEngine` and **hand it the sole minter role**.
3. Write `deployments/<network>.json` — your permanent, auditable deployment record.
4. Auto-verify both contracts on the block explorer.

---

## Safety checklist (do not skip — 誠 / Makoto)

- [ ] Deployer key is fresh, never shared, and (for mainnet) on a hardware wallet.
- [ ] Testnet deploy ran clean + verified before any mainnet attempt.
- [ ] `APR_BPS` is set to a sane value (10,000 = 100% is a *demo* number — not sustainable with real money).
- [ ] Contracts are audited (at minimum a manual review by a second party) before real value.
- [ ] No one is promised profit. This is experimental, unaudited-by-default, and educational.
- [ ] `MIND_PRIVATE_KEY` (dev key) is **never** funded with real assets.

**Not financial advice. Not audited. Testnet/local first, always.**
The dream is real the moment we treat it with the discipline of real money. ❤️
