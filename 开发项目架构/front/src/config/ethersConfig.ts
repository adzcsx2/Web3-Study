/**
 * ethers.js 合约配置文件
 *
 * 配置 RPC 端点、网络信息和其他合约相关设置
 */

// RPC 配置
export const RPC_CONFIG = {
  // 主网
  mainnet: {
    chainId: 1,
    name: "Ethereum Mainnet",
    rpcUrls: [
      "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
      "https://eth-mainnet.alchemyapi.io/v2/YOUR_ALCHEMY_KEY",
      "https://ethereum.publicnode.com",
      "https://eth.llamarpc.com",
    ],
  },

  // Sepolia 测试网
  sepolia: {
    chainId: 11155111,
    name: "Sepolia Testnet",
    rpcUrls: [
      "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      "https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY",
      "https://sepolia.gateway.tenderly.co",
      "https://ethereum-sepolia.publicnode.com",
    ],
  },

  // Goerli 测试网
  goerli: {
    chainId: 5,
    name: "Goerli Testnet",
    rpcUrls: [
      "https://goerli.infura.io/v3/YOUR_INFURA_KEY",
      "https://eth-goerli.alchemyapi.io/v2/YOUR_ALCHEMY_KEY",
      "https://goerli.gateway.tenderly.co",
    ],
  },

  // 本地开发网络
  localhost: {
    chainId: 1337,
    name: "Localhost",
    rpcUrls: ["http://127.0.0.1:8545"],
  },
};

// 默认网络（请根据实际情况修改）
export const DEFAULT_NETWORK = "sepolia";

// 合约设置
export const CONTRACT_CONFIG = {
  // 默认的 Gas 设置
  defaultGasLimit: "300000",
  defaultGasPrice: "20000000000", // 20 Gwei

  // 重试设置
  defaultRetryCount: 3,
  defaultRetryDelay: 1000,

  // 日志设置
  enableLogging: process.env.NODE_ENV === "development",

  // 交易确认设置
  confirmations: 1, // 等待的确认数
  timeout: 300000, // 5分钟超时
};
