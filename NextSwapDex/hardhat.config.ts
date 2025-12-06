import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";

import * as dotenv from "dotenv";
dotenv.config(); // 加载环境变量

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.26",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true, // 使用IR编译器获得更好的优化
          evmVersion: "cancun",
        },
      },
    ],
  },
  // 网络配置
  networks: {
    localhost: {
      url: "http://localhost:8545",
    },
    // 测试网示例：Sepolia
    sepolia: {
      url:
        process.env.SEPOLIA_RPC_URL ||
        (process.env.INFURA_PROJECT_ID
          ? `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
          : ""),
      accounts: [
        process.env.PRIVATE_KEY,
        process.env.PRIVATE_KEY_USER1,
        process.env.PRIVATE_KEY_USER2,
        process.env.PRIVATE_KEY_USER3,
      ].filter((key): key is string => !!key), // 过滤掉 undefined 的私钥
      timeout: 180000, // 180秒超时
      gasPrice: "auto",
      gas: "auto",
    },

    // 主网示例
    mainnet: {
      url: process.env.INFURA_PROJECT_ID
        ? `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
        : "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};
export default config;
