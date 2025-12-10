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
      {
        version: "0.8.15", // Nextswap V3 Periphery 合约
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000000,
          },
          metadata: {
            bytecodeHash: "none",
          },
        },
      },
      {
        version: "0.8.12", // Nextswap V3 核心合约
        settings: {
          optimizer: {
            enabled: true,
            runs: 625, // runs=1: 最大化压缩字节码（优先部署成本）
          },
          metadata: {
            bytecodeHash: "none", // 移除元数据哈希，减小约 53 字节
          },
        },
      },
    ],
  },
  // 网络配置
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    localhost: {
      url: "http://localhost:8545",
      allowUnlimitedContractSize: false,
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
  // Etherscan 验证配置
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  // 源代码验证
  sourcify: {
    enabled: true,
  },
};
export default config;
