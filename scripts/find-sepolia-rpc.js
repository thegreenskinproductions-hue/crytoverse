// Try several known public Sepolia RPC endpoints (read-only) and report balance.
require("dotenv").config();
const { ethers } = require("ethers");

const addr = process.env.DEPLOYER_ADDRESS;
const candidates = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.ethpandaops.io",
  "https://sepolia.gateway.tenderly.co",
  "https://sepolia.drpc.org",
  "https://1rpc.io/sepolia",
];

(async () => {
  console.log("Address :", addr, "\n");
  for (const rpc of candidates) {
    try {
      const p = new ethers.JsonRpcProvider(rpc);
      const net = await p.getNetwork();
      const bal = await p.getBalance(addr);
      console.log("OK  ", rpc);
      console.log("    chainId", Number(net.chainId), "| balance", ethers.formatEther(bal), "ETH");
      if (bal > 0n) {
        console.log("    ✅ FUNDED — usable for deploy");
      } else {
        console.log("    ⚠️  empty (needs faucet ETH)");
      }
    } catch (e) {
      console.log("FAIL", rpc, "->", (e.message || e).slice(0, 80));
    }
    console.log();
  }
})();
