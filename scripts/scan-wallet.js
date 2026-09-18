// Scan ALL major EVM networks for the deployer wallet balance (read-only).
require("dotenv").config();
const { ethers } = require("ethers");

const addr = process.env.DEPLOYER_ADDRESS;
const networks = [
  ["Ethereum mainnet", "https://ethereum-rpc.publicnode.com"],
  ["Base",            "https://mainnet.base.org"],
  ["Base (publicnode)","https://base-rpc.publicnode.com"],
  ["Arbitrum One",    "https://arbitrum-one-rpc.publicnode.com"],
  ["Optimism",        "https://optimism-rpc.publicnode.com"],
  ["Sepolia (test)",  "https://ethereum-sepolia-rpc.publicnode.com"],
];

(async () => {
  console.log("Wallet :", addr, "\n");
  let anyFunds = false;
  for (const [name, rpc] of networks) {
    try {
      const p = new ethers.JsonRpcProvider(rpc);
      const bal = await p.getBalance(addr);
      const eth = ethers.formatEther(bal);
      const flag = bal > 0n ? "  ✅ FUNDED" : "";
      if (bal > 0n) anyFunds = true;
      console.log(`${name.padEnd(22)} ${eth.padStart(14)} ETH${flag}`);
    } catch (e) {
      console.log(`${name.padEnd(22)} ERROR ${(e.message || e).slice(0, 60)}`);
    }
  }
  console.log("\n" + (anyFunds ? "RESULT : funds detected on at least one network" : "RESULT : no funds detected yet (may still be pending)"));
})();
