// Deploy TranscendenceTreasury and fund it with CRYTO.
// The "Mind" (AI keeper) is a dedicated signer from MIND_PRIVATE_KEY.
// Usage: npm run treasury:deploy
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

const CONFIG_PATH = path.join(__dirname, "..", "tracker", "config.json");
const STATE_PATH = path.join(__dirname, "..", "mind", "state.json");

async function main() {
  const mindKey = process.env.MIND_PRIVATE_KEY;
  if (!mindKey) throw new Error("MIND_PRIVATE_KEY not set in .env");

  const delay = Number(process.env.TREASURY_DELAY || 60); // seconds
  const fundAmount = ethers.parseUnits(process.env.TREASURY_FUND || "10000", 18);

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const crto = config.tokens.find((t) => t.symbol === "CRYTO");
  if (!crto) throw new Error("CRYTO not found in tracker/config.json — run `npm run seed` first");

  const [deployer] = await hre.ethers.getSigners();
  const provider = deployer.provider;
  const mind = new ethers.Wallet(mindKey, provider);

  console.log("deployer :", deployer.address);
  console.log("mind     :", mind.address);
  console.log("CRYTO    :", crto.address);

  const Factory = await hre.ethers.getContractFactory("TranscendenceTreasury");
  const treasury = await Factory.deploy(crto.address, mind.address, delay);
  await treasury.waitForDeployment();
  const treasuryAddr = await treasury.getAddress();
  console.log("Treasury :", treasuryAddr);

  // Fund the treasury: deployer approves CRYTO, then deposit() pulls it in.
  const crtoC = await hre.ethers.getContractAt("CrytoverseToken", crto.address, deployer);
  let bal = await crtoC.balanceOf(deployer.address);
  if (bal < fundAmount) {
    console.log("deployer balance low, minting", fundAmount.toString(), "CRYTO");
    await (await crtoC.mint(deployer.address, fundAmount)).wait();
  }
  await (await crtoC.approve(treasuryAddr, fundAmount)).wait();
  await (await treasury.deposit(fundAmount)).wait();

  const state = {
    network: "localhost",
    treasury: treasuryAddr,
    token: crto.address,
    tokenSymbol: "CRYTO",
    mind: mind.address,
    delay,
    funded: fundAmount.toString(),
    createdAt: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));

  const treasuryBal = await crtoC.balanceOf(treasuryAddr);
  console.log("\n✅ Treasury ready. Treasury CRYTO balance:", ethers.formatUnits(treasuryBal, 18));
  console.log("mind/state.json ->", STATE_PATH);
}

main().catch((e) => {
  console.error("DEPLOY ERROR:", e.message || e);
  process.exit(1);
});
