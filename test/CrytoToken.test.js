const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrytoToken", function () {
  let token;
  let owner, addr1, addr2;

  const INITIAL = ethers.parseUnits("1000000", 18); // 1,000,000 THECRYPTO

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const CrytoToken = await ethers.getContractFactory("CrytoToken");
    token = await CrytoToken.deploy(INITIAL);
    await token.waitForDeployment();
  });

  it("sets metadata correctly", async function () {
    expect(await token.name()).to.equal("TheCrypto");
    expect(await token.symbol()).to.equal("THECRYPTO");
    expect(await token.decimals()).to.equal(18);
    expect(await token.totalSupply()).to.equal(INITIAL);
  });

  it("mints initial supply to deployer", async function () {
    expect(await token.balanceOf(owner.address)).to.equal(INITIAL);
  });

  it("transfers tokens", async function () {
    const amount = ethers.parseUnits("100", 18);
    await token.transfer(addr1.address, amount);
    expect(await token.balanceOf(addr1.address)).to.equal(amount);
    expect(await token.balanceOf(owner.address)).to.equal(INITIAL - amount);
  });

  it("rejects transfer exceeding balance", async function () {
    const tooMuch = INITIAL + 1n;
    await expect(token.transfer(addr1.address, tooMuch)).to.be.revertedWith(
      "insufficient balance"
    );
  });

  it("handles approve + transferFrom", async function () {
    const amount = ethers.parseUnits("500", 18);
    await token.approve(addr1.address, amount);
    expect(await token.allowance(owner.address, addr1.address)).to.equal(amount);

    await token
      .connect(addr1)
      .transferFrom(owner.address, addr2.address, amount);
    expect(await token.balanceOf(addr2.address)).to.equal(amount);
    expect(await token.allowance(owner.address, addr1.address)).to.equal(0);
  });

  it("mints and burns", async function () {
    const amount = ethers.parseUnits("50", 18);
    await token.mint(addr1.address, amount);
    expect(await token.balanceOf(addr1.address)).to.equal(amount);
    expect(await token.totalSupply()).to.equal(INITIAL + amount);

    await token.connect(addr1).burn(amount);
    expect(await token.balanceOf(addr1.address)).to.equal(0);
    expect(await token.totalSupply()).to.equal(INITIAL);
  });
});
