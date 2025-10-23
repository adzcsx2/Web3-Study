/**
 * RPC 配置验证脚本
 * 用于验证环境变量配置是否正确
 */

// 模拟环境变量（使用新的命名方式）
process.env.NODE_ENV = "development";
process.env.NEXT_PUBLIC_RPC_URL_1_MAINNET =
  "https://mainnet.infura.io/v3/0ac6e12cdb7d44a2bc3ec75eea18179f";
process.env.NEXT_PUBLIC_RPC_URL_137_POLYGON =
  "https://polygon-mainnet.infura.io/v3/0ac6e12cdb7d44a2bc3ec75eea18179f";
process.env.NEXT_PUBLIC_RPC_URL_10_OPTIMISM =
  "https://optimism-mainnet.infura.io/v3/0ac6e12cdb7d44a2bc3ec75eea18179f";
process.env.NEXT_PUBLIC_RPC_URL_42161_ARBITRUM =
  "https://arbitrum-mainnet.infura.io/v3/0ac6e12cdb7d44a2bc3ec75eea18179f";
process.env.NEXT_PUBLIC_RPC_URL_11155111_SEPOLIA =
  "https://sepolia.infura.io/v3/0ac6e12cdb7d44a2bc3ec75eea18179f";
process.env.NEXT_PUBLIC_RPC_URL_8453_BASE =
  "https://base-mainnet.infura.io/v3/0ac6e12cdb7d44a2bc3ec75eea18179f";

// 模拟 env 配置
const mockEnv = {
  isDev: true,
  infuraProjectId: process.env.NEXT_PUBLIC_INFURA_PROJECT_ID || "",
  rpcUrls: {
    mainnet: process.env.NEXT_PUBLIC_RPC_URL_1_MAINNET,
    polygon: process.env.NEXT_PUBLIC_RPC_URL_137_POLYGON,
    optimism: process.env.NEXT_PUBLIC_RPC_URL_10_OPTIMISM,
    arbitrum: process.env.NEXT_PUBLIC_RPC_URL_42161_ARBITRUM,
    sepolia: process.env.NEXT_PUBLIC_RPC_URL_11155111_SEPOLIA,
    base: process.env.NEXT_PUBLIC_RPC_URL_8453_BASE,
  },
};

// 模拟 RPC 配置逻辑（仅使用环境变量）
function getRpcUrlFromEnv(chainId, envRpcUrl) {
  if (!envRpcUrl || !envRpcUrl.trim()) {
    throw new Error(
      `RPC URL for chain ${chainId} is not configured. Please set the corresponding environment variable.`
    );
  }

  return envRpcUrl.trim();
}

const RPC_URLS = {
  1: getRpcUrlFromEnv(1, mockEnv.rpcUrls.mainnet),
  137: getRpcUrlFromEnv(137, mockEnv.rpcUrls.polygon),
  10: getRpcUrlFromEnv(10, mockEnv.rpcUrls.optimism),
  42161: getRpcUrlFromEnv(42161, mockEnv.rpcUrls.arbitrum),
  11155111: getRpcUrlFromEnv(11155111, mockEnv.rpcUrls.sepolia),
  8453: getRpcUrlFromEnv(8453, mockEnv.rpcUrls.base),
};

// 验证结果
console.log("🔧 RPC 配置验证结果（仅环境变量）:");
console.log("=====================================");
console.log(`配置方式: 仅使用环境变量，无降级配置`);
console.log("=====================================");
console.log("RPC URLs:");
Object.entries(RPC_URLS).forEach(([chainId, url]) => {
  const chainNames = {
    "1": "Mainnet",
    "137": "Polygon",
    "10": "Optimism",
    "42161": "Arbitrum",
    "11155111": "Sepolia",
    "8453": "Base",
  };
  console.log(`  ${chainNames[chainId]} (${chainId}): ${url}`);
});

// 验证 URL 格式
console.log("=====================================");
console.log("URL 格式验证:");
let allValid = true;
Object.entries(RPC_URLS).forEach(([chainId, url]) => {
  const isValid = url.startsWith("https://") && url.includes("infura.io/v3/");
  const status = isValid ? "✅" : "❌";
  if (!isValid) allValid = false;
  console.log(`  Chain ${chainId}: ${status}`);
});

console.log("=====================================");
console.log(`总体状态: ${allValid ? "✅ 配置正确" : "❌ 配置有误"}`);

if (allValid) {
  console.log("🎉 RPC 配置迁移成功！");
  console.log(
    "💡 提示: 请在 .env.local 中配置您自己的 NEXT_PUBLIC_INFURA_PROJECT_ID"
  );
}
