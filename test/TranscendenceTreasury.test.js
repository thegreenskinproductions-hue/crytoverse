const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("TranscendenceTreasury", function () {
  let token, treasury;
  let mind, funder, recipient;

  const SUPPLY = ethers.parseUnits("1000000", 18);
  const DELAY = 60 * 60 * 24; // 1 day in seconds
  const DEPOSIT = ethers.parseUnits("1000", 18);
  const PAYOUT = ethers.parseUnits("400", 18);

  beforeEach(async function () {
    [mind, funder, recipient] = await ethers.getSigners();

    const CrytoToken = await ethers.getContractFactory("CrytoToken");
    token = await CrytoToken.deploy(SUPPLY);
    await token.waitForDeployment();

    const TranscendenceTreasury = await ethers.getContractFactory(
      "TranscendenceTreasury"
    );
    treasury = await TranscendenceTreasury.deploy(
      await token.getAddress(),
      mind.address,
      DELAY
    );
    await treasury.waitForDeployment();
  });

  async function fundTreasury() {
    // funder sends CRYTO to the treasury via approve + deposit
    await token.transfer(funder.address, DEPOSIT);
    await token.connect(funder).approve(await treasury.getAddress(), DEPOSIT);
    await treasury.connect(funder).deposit(DEPOSIT);
  }

  it("sets the Mind and token correctly", async function () {
    expect(await treasury.mind()).to.equal(mind.address);
    expect(await treasury.token()).to.equal(await token.getAddress());
    expect(await treasury.delay()).to.equal(DELAY);
  });

  it("accepts deposits into the treasury", async function () {
    await fundTreasury();
    expect(await token.balanceOf(await treasury.getAddress())).to.equal(DEPOSIT);
  });

  it("rejects proposals from non-Mind", async function () {
    await fundTreasury();
    await expect(
      treasury.connect(funder).propose(recipient.address, PAYOUT, "not allowed")
    ).to.be.revertedWith("only the Mind");
  });

  it("enforces the time-lock before execution", async function () {
    await fundTreasury();
    const tx = await treasury
      .connect(mind)
      .propose(recipient.address, PAYOUT, "AI payout #1");
    const id = (await treasury.proposalCount()) - 1n;
    await tx.wait();

    // Too early — must fail
    await expect(
      treasury.connect(mind).execute(id)
    ).to.be.revertedWith("time-lock still active");
  });

  it("executes a matured proposal and pays the recipient", async function () {
    await fundTreasury();
    await treasury
      .connect(mind)
      .propose(recipient.address, PAYOUT, "AI payout #2");
    const id = (await treasury.proposalCount()) - 1n;

    // advance time past the delay
    await network.provider.send("evm_increaseTime", [DELAY + 1]);
    await network.provider.send("evm_mine");

    await treasury.connect(mind).execute(id);
    expect(await token.balanceOf(recipient.address)).to.equal(PAYOUT);
    expect(await token.balanceOf(await treasury.getAddress())).to.equal(
      DEPOSIT - PAYOUT
    );
  });

  it("can cancel a pending proposal", async function () {
    await fundTreasury();
    await treasury
      .connect(mind)
      .propose(recipient.address, PAYOUT, "cancel me");
    const id = (await treasury.proposalCount()) - 1n;

    await treasury.connect(mind).cancel(id);
    await expect(
      treasury.connect(mind).execute(id)
    ).to.be.revertedWith("already cancelled");
  });

  it("transfers the Mind role", async function () {
    await treasury.connect(mind).changeMind(recipient.address);
    expect(await treasury.mind()).to.equal(recipient.address);

    // old mind no longer has authority
    await expect(
      treasury.connect(mind).propose(recipient.address, PAYOUT, "denied")
    ).to.be.revertedWith("only the Mind");
  });
});
