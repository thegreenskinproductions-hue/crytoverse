const { ethers } = require("hardhat");

async function main() {
  // 1,000,000 CRYTO with 18 decimals = 1e24 wei
  const initialSupply = ethers.parseUnits(
    process.env.INITIAL_SUPPLY || "1000000",
    18
  );

  console.log("Deploying CrytoToken...");
  console.log("Initial supply:", initialSupply.toString(), "wei");
  console.log("             =", ethers.formatUnits(initialSupply, 18), "CRYTO");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log(
    "Deployer balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  const CrytoToken = await ethers.getContractFactory("CrytoToken");
  const token = await CrytoToken.deploy(initialSupply);

  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("\n✅ CrytoToken deployed to:", address);
  console.log("   Name:   ", await token.name());
  console.log("   Symbol: ", await token.symbol());
  console.log("   Supply: ", ethers.formatUnits(await token.totalSupply(), 18), "CRYTO");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
