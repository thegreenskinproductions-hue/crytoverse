// Advance the local Hardhat chain's timestamp by N seconds (default 61),
// so the Mind's time-locked proposals mature deterministically.
// Usage: node scripts/advance-time.js [seconds]
require("dotenv").config();
const { ethers } = require("ethers");

const RPC = process.env.RPC_URL || "http://127.0.0.1:8545";
const seconds = Number(process.argv[2] || 61);

(async () => {
  const p = new ethers.JsonRpcProvider(RPC);
  const before = (await p.getBlock("latest")).timestamp;
  await p.send("evm_increaseTime", [seconds]);
  await p.send("evm_mine", []);
  const after = (await p.getBlock("latest")).timestamp;
  console.log(`chain time advanced: ${before} -> ${after} (+${after - before}s)`);
})().catch((e) => {
  console.error("advance-time error:", e.message || e);
  process.exit(1);
});
