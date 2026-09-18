// Demo: the Mind runs one full propose -> (time passes) -> execute cycle on the
// live treasury, proving autonomous governance authority end to end.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const RPC = process.env.RPC_URL || "http://127.0.0.1:8545";
const STATE_PATH = path.join(__dirname, "..", "mind", "state.json");

const TREASURY_ABI = [
  "function token() view returns (address)",
  "function delay() view returns (uint256)",
  "function proposalCount() view returns (uint256)",
  "function proposals(uint256) view returns (address target, uint256 amount, string memo, uint256 eta, bool executed, bool cancelled)",
  "function propose(address target, uint256 amount, string memo)",
  "function execute(uint256 id)",
];
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function symbol() view returns (string)"];

const fmt = (v) => ethers.formatUnits(v, 18);

async function main() {
  if (!fs.existsSync(STATE_PATH)) throw new Error("mind/state.json missing — run `npm run treasury:deploy` first");
  const st = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));

  const provider = new ethers.JsonRpcProvider(RPC);
  const mind = new ethers.Wallet(process.env.MIND_PRIVATE_KEY, provider);
  const treasury = new ethers.Contract(st.treasury, TREASURY_ABI, mind);
  const token = new ethers.Contract(st.token, ERC20_ABI, provider);

  const sym = await token.symbol();
  const delay = await treasury.delay();
  const recipient = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"; // Community Fund
  const amount = ethers.parseUnits("150", 18);

  console.log("Mind     :", mind.address);
  console.log("Treasury :", st.treasury);
  console.log(`Before   : treasury=${fmt(await token.balanceOf(st.treasury))} ${sym}, recipient=${fmt(await token.balanceOf(recipient))} ${sym}`);

  // 1) Propose a time-locked disbursement
  const tx1 = await treasury.propose(recipient, amount, "Mind demo: community fund seeding (time-locked)");
  await tx1.wait();
  const id = Number(await treasury.proposalCount()) - 1;
  const p = await treasury.proposals(id);
  console.log(`\nProposed : id=${id}, amount=${fmt(p.amount)} ${sym}, memo="${p.memo}"`);
  console.log(`           eta=${p.eta}, delay=${delay}s, tx=${tx1.hash}`);

  // 2) Advance the chain past the time-lock
  await provider.send("evm_increaseTime", [Number(delay) + 1]);
  await provider.send("evm_mine");

  // 3) Execute the matured proposal
  const tx2 = await treasury.execute(id);
  await tx2.wait();
  console.log(`\nExecuted : id=${id}, tx=${tx2.hash}`);

  console.log(`After    : treasury=${fmt(await token.balanceOf(st.treasury))} ${sym}, recipient=${fmt(await token.balanceOf(recipient))} ${sym}`);
  console.log("\n✅ Full propose -> time-lock -> execute cycle complete (autonomous Mind).");
}

main().catch((e) => {
  console.error("DEMO ERROR:", e.message || e);
  process.exit(1);
});
