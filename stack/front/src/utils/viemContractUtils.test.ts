/**
 * Viem 配置测试文件
 *
 * 用于验证 viemContractUtils.ts 是否正确使用了 wagmi.ts 中的配置
 */

import { VIEM_CONFIG } from "../utils/viemContractUtils";
import { config as wagmiConfig, CONTRACT_CONFIG } from "../config/wagmi";

/**
 * 测试配置是否正确加载
 */
export function testViemConfig() {
  console.log("=== Viem 配置测试 ===");

  // 测试链配置
  console.log("支持的链数量:", VIEM_CONFIG.supportedChains.length);
  console.log(
    "默认链:",
    VIEM_CONFIG.defaultChain.name,
    `(ID: ${VIEM_CONFIG.defaultChain.id})`
  );

  // 测试 RPC URLs
  console.log("\nRPC URLs 配置:");
  Object.entries(VIEM_CONFIG.rpcUrls).forEach(([chainId, url]) => {
    const chain = VIEM_CONFIG.supportedChains.find(
      (c) => c.id === parseInt(chainId)
    );
    console.log(`  ${chain?.name || "Unknown"} (${chainId}): ${url}`);
  });

  // 验证与 wagmi 配置的一致性
  console.log("\n与 Wagmi 配置一致性检查:");
  const wagmiChainIds = wagmiConfig.chains.map((c) => c.id);
  const viemChainIds = VIEM_CONFIG.supportedChains.map((c) => c.id);

  console.log("Wagmi 链:", wagmiChainIds);
  console.log("Viem 链:", viemChainIds);

  const isConsistent =
    wagmiChainIds.every((id) => viemChainIds.includes(id)) &&
    viemChainIds.every((id) => wagmiChainIds.includes(id));

  console.log("配置一致性:", isConsistent ? "✅ 一致" : "❌ 不一致");

  // 验证合约配置一致性
  console.log("\n合约配置一致性检查:");
  console.log("Wagmi 合约配置:", CONTRACT_CONFIG);
  console.log("Viem 合约配置:", VIEM_CONFIG.contract);

  const contractConfigConsistent =
    VIEM_CONFIG.contract.defaultGasLimit ===
      BigInt(CONTRACT_CONFIG.defaultGasLimit) &&
    VIEM_CONFIG.contract.defaultGasPrice ===
      BigInt(CONTRACT_CONFIG.defaultGasPrice) &&
    VIEM_CONFIG.contract.defaultRetryCount ===
      CONTRACT_CONFIG.defaultRetryCount &&
    VIEM_CONFIG.contract.defaultRetryDelay ===
      CONTRACT_CONFIG.defaultRetryDelay &&
    VIEM_CONFIG.contract.enableLogging === CONTRACT_CONFIG.enableLogging &&
    VIEM_CONFIG.contract.confirmations === CONTRACT_CONFIG.confirmations &&
    VIEM_CONFIG.contract.timeout === CONTRACT_CONFIG.timeout;

  console.log(
    "合约配置一致性:",
    contractConfigConsistent ? "✅ 一致" : "❌ 不一致"
  );

  return {
    supportedChains: VIEM_CONFIG.supportedChains,
    defaultChain: VIEM_CONFIG.defaultChain,
    rpcUrls: VIEM_CONFIG.rpcUrls,
    contractConfig: VIEM_CONFIG.contract,
    isConsistent,
    contractConfigConsistent,
  };
}

/**
 * 测试特定链的配置
 */
export function testChainConfig(chainId: number) {
  console.log(`\n=== 链 ${chainId} 配置测试 ===`);

  const chain = VIEM_CONFIG.supportedChains.find((c) => c.id === chainId);
  if (!chain) {
    console.error(`❌ 链 ${chainId} 未在配置中找到`);
    return null;
  }

  console.log("链名称:", chain.name);
  console.log("链 ID:", chain.id);
  console.log(
    "原生代币:",
    chain.nativeCurrency.name,
    `(${chain.nativeCurrency.symbol})`
  );

  const rpcUrl = VIEM_CONFIG.rpcUrls[chainId];
  console.log("RPC URL:", rpcUrl || "❌ 未配置");

  // 测试是否可以获取 transport
  try {
    const transport = VIEM_CONFIG.getTransport(chainId);
    console.log("Transport:", transport ? "✅ 可用" : "❌ 不可用");
  } catch (error) {
    console.error("Transport 获取失败:", error);
  }

  return {
    chain,
    rpcUrl,
    hasTransport: !!VIEM_CONFIG.getTransport(chainId),
  };
}

/**
 * 运行所有测试
 */
export async function runViemConfigTests() {
  console.log("🚀 开始 Viem 配置测试...\n");

  try {
    // 基础配置测试
    const configResult = testViemConfig();

    // 测试每个支持的链
    console.log("\n=== 各链配置详细测试 ===");
    const chainResults = VIEM_CONFIG.supportedChains.map((chain) => {
      return testChainConfig(chain.id);
    });

    // 汇总结果
    const allChainsValid = chainResults.every(
      (result) => result && result.rpcUrl && result.hasTransport
    );

    console.log("\n📊 测试汇总:");
    console.log("链配置一致性:", configResult.isConsistent ? "✅" : "❌");
    console.log(
      "合约配置一致性:",
      configResult.contractConfigConsistent ? "✅" : "❌"
    );
    console.log("所有链配置有效:", allChainsValid ? "✅" : "❌");
    console.log("支持的链数量:", configResult.supportedChains.length);

    return {
      success:
        configResult.isConsistent &&
        configResult.contractConfigConsistent &&
        allChainsValid,
      configResult,
      chainResults,
    };
  } catch (error) {
    console.error("❌ 测试过程中发生错误:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// 如果直接运行此文件，执行测试
if (typeof window !== "undefined") {
  // 浏览器环境
  console.log("在浏览器中运行 Viem 配置测试...");
  runViemConfigTests();
} else if (require.main === module) {
  // Node.js 环境
  runViemConfigTests();
}

export default {
  testViemConfig,
  testChainConfig,
  runViemConfigTests,
};
