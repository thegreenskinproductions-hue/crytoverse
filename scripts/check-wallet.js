// Verify the .env wallet: confirm the stored key maps to the recorded address.
// Prints only a yes/no match — never the private key.
require("dotenv").config();
const { ethers } = require("ethers");

const key = process.env.PRIVATE_KEY;
const addr = process.env.DEPLOYER_ADDRESS;

if (!key || !key.startsWith("0x") || key.length !== 66) {
  console.log("FAIL: PRIVATE_KEY missing or malformed in .env");
  process.exit(1);
}

const w = new ethers.Wallet(key);
const match = w.address.toLowerCase() === (addr || "").toLowerCase();
console.log("env key -> address :", w.address);
console.log("matches DEPLOYER_ADDRESS :", match);
process.exit(match ? 0 : 1);
