// Generate a fresh, cryptographically-secure deployer wallet and save the
// private key into .env (NEVER printed to stdout). Only the public address
// is shown. The previous .env is backed up to .env.bak first.
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");

// 1. Fresh wallet from secure OS randomness
const w = ethers.Wallet.createRandom();

// 2. Read existing .env, back it up
const env = fs.readFileSync(envPath, "utf8");
fs.writeFileSync(envPath + ".bak", env);

// 3. Upsert PRIVATE_KEY and DEPLOYER_ADDRESS, preserving everything else
let out = env.replace(/^PRIVATE_KEY=.*$/m, `PRIVATE_KEY=${w.privateKey}`);
if (!/^PRIVATE_KEY=/m.test(out)) {
  out += `\nPRIVATE_KEY=${w.privateKey}\n`;
}
if (/^DEPLOYER_ADDRESS=/m.test(out)) {
  out = out.replace(/^DEPLOYER_ADDRESS=.*$/m, `DEPLOYER_ADDRESS=${w.address}`);
} else {
  out += `DEPLOYER_ADDRESS=${w.address}\n`;
}
fs.writeFileSync(envPath, out);

// 4. Print ONLY public info — never the key
console.log("WALLET READY");
console.log("address :", w.address);
console.log("saved   : .env (key never printed) — backup at .env.bak");
