// Deploy the generalized Mind governance system:
//   MindRegistry + one MindTreasury per token in tracker/config.json.
// Funds each treasury from the deployer, then writes mind/registry.json so the
// off-chain Mind agent and the dashboard can discover everything automatically.
// Usage: npm run mind:deploy
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

const CONFIG_PATH = path.join(__dirname, "..", "tracker", "config.json");
const REGISTRY_PATH = path.join(__dirname, "..", "mind", "registry.json");

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function approve(address,uint256) returns (bool)",
];

async function main() {
  const mindKey = process.env.MIND_PRIVATE_KEY;
  if (!mindKey) throw new Error("MIND_PRIVATE_KEY not set in .env");
  const delay = Number(process.env.TREASURY_DELAY || 60);
  const fundAmt = ethers.parseUnits(process.env.TREASURY_FUND || "2000", 18);

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const [deployer] = await hre.ethers.getSigners();
  const provider = deployer.provider;
  const mind = new ethers.Wallet(mindKey, provider);

  console.log("deployer:", deployer.address);
  console.log("mind    :", mind.address);

  // 1) Registry (deployed by deployer; `mind` is the only registrar)
  const Registry = await hre.ethers.getContractFactory("MindRegistry");
  const registry = await Registry.deploy(mind.address);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("Registry:", registryAddr);
  const registryAsMind = registry.connect(mind);

  // 2) One treasury per token
  const Treasury = await hre.ethers.getContractFactory("MindTreasury");
  const treasuries = [];

  for (const t of config.tokens) {
    const tAddr = t.address;
    const treasury = await Treasury.deploy(tAddr, mind.address, delay);
    await treasury.waitForDeployment();
    const treasuryAddr = await treasury.getAddress();

    // Register on-chain (must be called by the Mind)
    await (await registryAsMind.register(tAddr, treasuryAddr)).wait();

    // Fund from deployer (deployer holds the seeded supply; deposit is permissionless)
    const tokenC = await hre.ethers.getContractAt(ERC20_ABI, tAddr, deployer);
    const bal = await tokenC.balanceOf(deployer.address);
    let amount = fundAmt;
    if (amount > bal) amount = bal;
    const symbol = await tokenC.symbol();
    if (amount > 0n) {
      await (await tokenC.approve(treasuryAddr, amount)).wait();
      await (await treasury.deposit(amount)).wait();
    }

    treasuries.push({
      symbol,
      token: tAddr,
      treasury: treasuryAddr,
      role: t.role || "",
      funded: amount.toString(),
    });
    console.log(`  ${symbol.padEnd(9)} -> treasury ${treasuryAddr}  funded=${ethers.formatUnits(amount, 18)}`);
  }

  const out = {
    network: "localhost",
    mind: mind.address,
    registry: registryAddr,
    delay,
    createdAt: new Date().toISOString(),
    treasuries,
  };
  fs.mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(out, null, 2));
  console.log("\n✅ Mind governance deployed for", treasuries.length, "tokens.");
  console.log("mind/registry.json ->", REGISTRY_PATH);
}

main().catch((e) => {
  console.error("DEPLOY ERROR:", e.message || e);
  process.exit(1);
});
