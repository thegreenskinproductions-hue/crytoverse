require("dotenv").config();
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers, run } = hre;

// One script to deploy the full Transcendence system to ANY configured EVM chain:
//   npx hardhat run scripts/deploy-production.js --network sepolia
//   npx hardhat run scripts/deploy-production.js --network base
// It deploys, hands mint authority to the engine, writes a manifest, and verifies
// on the chain's block explorer when an API key is present.

const NAME = "Transcendence";
const SYMBOL = "TREND";
const INITIAL_SUPPLY = ethers.parseUnits("1000000", 18);
const APR_BPS = 10000n;     // 100% annual (demo parameter — adjust before real money)
const DREAM_TAX_BPS = 1000n; // 10% of every yield -> Dream Fund

async function verify(address, args) {
  try {
    await run("verify:verify", { address, constructorArguments: args });
    console.log(`  ✓ verified ${address}`);
  } catch (e) {
    console.log(`  ⚠ verify skipped/failed for ${address}: ${e.message}`);
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const networkName = hre.network.name;
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("\n=== TRANSCENDENCE — go-live deploy ===");
  console.log(`Network  : ${networkName} (chainId ${chainId})`);
  console.log(`Deployer : ${deployer.address}`);
  console.log(`Balance  : ${ethers.formatEther(balance)} ETH\n`);

  // 1. Currency
  const TT = await ethers.getContractFactory("TranscendenceToken");
  const token = await TT.deploy(NAME, SYMBOL, INITIAL_SUPPLY);
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log(`TREND    : ${tokenAddr}`);

  // 2. Engine (the Mind)
  const TE = await ethers.getContractFactory("TranscendenceEngine");
  const engine = await TE.deploy(tokenAddr, APR_BPS, DREAM_TAX_BPS);
  await engine.waitForDeployment();
  const engineAddr = await engine.getAddress();
  console.log(`Engine   : ${engineAddr}`);

  // 3. Hand mint authority to the engine
  await token.setMinter(engineAddr);
  console.log("Engine is now the sole minter of TREND.\n");

  // Manifest
  const manifest = {
    network: networkName,
    chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: { token: tokenAddr, engine: engineAddr },
    params: { name: NAME, symbol: SYMBOL, initialSupply: "1000000", aprBps: 10000, dreamTaxBps: 1000 },
  };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${networkName}.json`);
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2));
  console.log(`Manifest -> ${file}\n`);

  // Verify on explorer if configured
  const explorerKey = process.env.ETHERSCAN_API_KEY || process.env.ARBISCAN_API_KEY || process.env.BASESCAN_API_KEY;
  const isLive = networkName !== "hardhat" && networkName !== "localhost";
  if (explorerKey && isLive) {
    console.log("Verifying on block explorer...");
    await verify(tokenAddr, [NAME, SYMBOL, INITIAL_SUPPLY]);
    await verify(engineAddr, [tokenAddr, APR_BPS, DREAM_TAX_BPS]);
  }

  console.log("\n=== Go-live complete — the Mind funds the dream from its own yield ===\n");
}

main().catch((e) => {
  console.error("DEPLOY ERROR:", e.message || e);
  process.exit(1);
});
