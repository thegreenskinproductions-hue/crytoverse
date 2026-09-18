const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Seeds a local hardhat node with all six Crytoverse tokens + themed
// on-chain activity ("mined" mints, transfers, burns), then writes
// tracker/config.json so the tracker can index the whole ecosystem live.
async function main() {
  const [deployer, alice, bob, carol, dave] = await ethers.getSigners();
  const U = (n) => ethers.parseUnits(String(n), 18);

  const CrytoverseToken = await ethers.getContractFactory("CrytoverseToken");

  // name, symbol, role, initial supply
  const specs = [
    ["TheCrypto", "THECRYPTO", "base currency", 1000000],
    ["Orthopox 13", "POX", "governance", 21000000],
    ["Natalya", "NATA", "bridge / trust", 50000000],
    ["The Blisk", "BLISK", "systemic-risk marker", 1000000],
    ["Milenkov", "MILENKOV", "incentive / yield", 100000000],
    ["Bongwater", "BONGWATER", "community / tipping", 420000000],
  ];

  const tokens = [];
  for (const [name, symbol, role, supply] of specs) {
    const t = await CrytoverseToken.deploy(name, symbol, role, U(supply));
    await t.waitForDeployment();
    const addr = await t.getAddress();
    tokens.push({ name, symbol, role, supply, contract: t, address: addr });
    console.log(`deployed ${symbol} (${role}) at ${addr}`);
  }

  const by = (sym) => tokens.find((t) => t.symbol === sym).contract;

  // ---- themed "mined / gained / movements" activity ----

  // THECRYPTO — the base currency circulates.
  await by("THECRYPTO").transfer(alice.address, U(10000));
  await by("THECRYPTO").connect(alice).transfer(bob.address, U(3000));
  await by("THECRYPTO").connect(bob).transfer(carol.address, U(500));
  await by("THECRYPTO").mint(alice.address, U(5000)); // mined
  await by("THECRYPTO").connect(carol).burn(U(100));

  // POX — governance: minted to the "council" (the Mind + signers).
  await by("POX").mint(alice.address, U(1000000)); // council seeding
  await by("POX").transfer(bob.address, U(100000)); // delegation movement
  await by("POX").connect(alice).transfer(dave.address, U(50000));

  // NATA — bridge: cross-faction settlement both directions.
  await by("NATA").transfer(alice.address, U(2000000));
  await by("NATA").transfer(carol.address, U(1500000));
  await by("NATA").connect(alice).transfer(bob.address, U(500000));

  // BLISK — risk marker: small supply, heavily concentrated, one burn.
  await by("BLISK").transfer(alice.address, U(400000));
  await by("BLISK").connect(alice).burn(U(1000));

  // MILENKOV — incentive/yield: rewards drip to stakers.
  await by("MILENKOV").mint(alice.address, U(10000000));
  await by("MILENKOV").mint(bob.address, U(5000000));
  await by("MILENKOV").connect(alice).transfer(carol.address, U(2500000));

  // BONGWATER — community/tipping: many small peer-to-peer tips.
  await by("BONGWATER").transfer(alice.address, U(50000000));
  await by("BONGWATER").connect(alice).transfer(bob.address, U(5000)); // tip
  await by("BONGWATER").connect(alice).transfer(carol.address, U(5000)); // tip
  await by("BONGWATER").connect(bob).transfer(dave.address, U(1000));
  await by("BONGWATER").connect(carol).transfer(dave.address, U(3000));

  const config = {
    rpcUrl: "http://127.0.0.1:8545",
    tokens: tokens.map((t) => ({
      name: t.name,
      symbol: t.symbol,
      role: t.role,
      address: t.address,
      fromBlock: 0,
    })),
  };
  const configPath = path.join(__dirname, "..", "tracker", "config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log("\ntracker/config.json written ->", configPath);
  console.log(`\n✅ ${tokens.length} tokens seeded.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});