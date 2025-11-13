import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

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
      url: process.env.INFURA_PROJECT_ID
        ? `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
        : "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
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
