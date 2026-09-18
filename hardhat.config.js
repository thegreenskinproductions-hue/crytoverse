require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : [];

// RPC endpoints (set in .env, never hard-code a live key here)
const RPC = {
  sepolia: process.env.SEPOLIA_RPC || "",
  mainnet: process.env.MAINNET_RPC || "",
  base: process.env.BASE_RPC || "",
  optimism: process.env.OPTIMISM_RPC || "",
  arbitrum: process.env.ARBITRUM_RPC || "",
};

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {},
    localhost: { url: "http://127.0.0.1:8545" },
    // Public testnet first — real network, free faucet ETH. Always go-live here first.
    sepolia: {
      url: RPC.sepolia || "https://rpc.sepolia.org",
      accounts,
      chainId: 11155111,
    },
    // Mainnet + L2s — real money. Enable only when you have a funded, cold wallet.
    mainnet: { url: RPC.mainnet, accounts, chainId: 1 },
    base: { url: RPC.base, accounts, chainId: 8453 },
    optimism: { url: RPC.optimism, accounts, chainId: 10 },
    arbitrum: { url: RPC.arbitrum, accounts, chainId: 42161 },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || "",
      optimism: process.env.ETHERSCAN_API_KEY || "",
      arbitrum: process.env.ARBISCAN_API_KEY || "",
    },
  },
};
