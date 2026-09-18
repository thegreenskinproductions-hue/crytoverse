// Check deployer ETH balance on Sepolia (read-only) — and whether the RPC works.
require("dotenv").config();
const { ethers } = require("ethers");

const RPC = process.env.SEPOLIA_RPC || "https://rpc.sepolia.org";
const addr = process.env.DEPLOYER_ADDRESS;

(async () => {
  console.log("RPC      :", RPC);
  console.log("Address  :", addr);
  try {
    const p = new ethers.JsonRpcProvider(RPC);
    const net = await p.getNetwork();
    const bal = await p.getBalance(addr);
    console.log("Network  : chainId", Number(net.chainId));
    console.log("Balance  :", ethers.formatEther(bal), "ETH");
    if (bal === 0n) {
      console.log("STATUS   : WALLET EMPTY — needs faucet ETH before any deploy.");
    } else {
      console.log("STATUS   : READY — enough for gas.");
    }
  } catch (e) {
    console.log("RPC ERROR:", e.message || e);
  }
})();
