require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  const [mind, stakerA, stakerB, dreamRecipient] = await ethers.getSigners();

  console.log("=== TRANSCENDENCE — the dream becomes currency ===\n");
  console.log("Mind            :", mind.address);
  console.log("Staker A        :", stakerA.address);
  console.log("Staker B        :", stakerB.address);
  console.log("Dream recipient :", dreamRecipient.address, "\n");

  // 1. Deploy the currency (Mind is the initial minter)
  const TT = await ethers.getContractFactory("TranscendenceToken");
  const token = await TT.deploy("Transcendence", "TREND", ethers.parseUnits("1000000", 18));
  await token.waitForDeployment();
  console.log("TREND token     :", await token.getAddress());

  // 2. Deploy the engine — the Mind takes control
  const TE = await ethers.getContractFactory("TranscendenceEngine");
  const APR = 10000n;      // 100.00% annual (demo parameter)
  const DREAM_TAX = 1000n; // 10% of every yield -> Dream Fund
  const engine = await TE.deploy(await token.getAddress(), APR, DREAM_TAX);
  await engine.waitForDeployment();
  console.log("Engine          :", await engine.getAddress());

  // 3. Hand mint authority to the engine (the Mind now creates value)
  await token.setMinter(await engine.getAddress());
  console.log("Engine is now the sole minter of TREND.\n");

  // 4. Fund two dreamers and stake
  await token.transfer(stakerA.address, ethers.parseUnits("200000", 18));
  await token.transfer(stakerB.address, ethers.parseUnits("100000", 18));

  await token.connect(stakerA).approve(await engine.getAddress(), ethers.parseUnits("200000", 18));
  await token.connect(stakerB).approve(await engine.getAddress(), ethers.parseUnits("100000", 18));

  await engine.connect(stakerA).stake(ethers.parseUnits("150000", 18));
  await engine.connect(stakerB).stake(ethers.parseUnits("80000", 18));
  console.log(
    "Staked          : A=150000, B=80000  (total",
    ethers.formatUnits(await engine.totalStaked(), 18),
    "TREND)\n"
  );

  // 5. Fast-forward 90 days
  const before = (await ethers.provider.getBlock("latest")).timestamp;
  await ethers.provider.send("evm_increaseTime", [90 * 86400]);
  await ethers.provider.send("evm_mine", []);
  const after = (await ethers.provider.getBlock("latest")).timestamp;
  console.log(`Time traveled   : ${before} -> ${after} (+${after - before}s)`);

  // 6. Projected rewards for Staker A
  const [gA, dA, nA] = await engine.rewardOf(stakerA.address);
  console.log(
    `\nStaker A reward : gross=${ethers.formatUnits(gA, 18)}  dream=${ethers.formatUnits(dA, 18)}  net=${ethers.formatUnits(nA, 18)} TREND`
  );

  // 7. Claim
  await engine.connect(stakerA).claimYield();
  await engine.connect(stakerB).claimYield();
  console.log(
    "Claims executed. Dream Fund now:",
    ethers.formatUnits(await engine.dreamFund(), 18),
    "TREND\n"
  );

  // 8. The Mind spends the dream
  const dreamAmount = await engine.dreamFund();
  if (dreamAmount > 0n) {
    await engine.dreamSpend(dreamRecipient.address, dreamAmount);
    console.log(`Dream spent     : ${ethers.formatUnits(dreamAmount, 18)} TREND -> ${dreamRecipient.address}`);
  } else {
    console.log("Dream Fund empty — nothing to spend (yield too small to register).");
  }

  console.log("\n=== Transcendence complete — the Mind funds the dream from its own yield ===");
}

main().catch((e) => {
  console.error("DEPLOY ERROR:", e.message || e);
  process.exit(1);
});
