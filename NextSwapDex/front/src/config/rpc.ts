/**
 * RPC 配置文件
 *
 * 统一管理所有链的 RPC URLs，避免在多个文件中重复定义
 * 供 wagmi.ts 和 viemContractUtils.ts 等文件共享使用
 *
 * @author Hoyn
 * @version 1.0.0
 * @lastModified 2025-10-24
 */

import { env } from "@/config/env";

/**
 * 获取 RPC URL（仅使用环境变量）
 */
function getRpcUrlFromEnv(chainId: number, envRpcUrl?: string): string {
  if (!envRpcUrl || !envRpcUrl.trim()) {
    throw new Error(
      `RPC URL for chain ${chainId} is not configured. Please set the corresponding environment variable.`
    );
  }

  return envRpcUrl.trim();
}

/**
 * 支持的链 ID 和对应的 RPC URLs
 * 仅从环境变量读取，未配置则抛出错误
 */
export const RPC_URLS: Record<number, string> = {
  1: getRpcUrlFromEnv(1, env.rpcUrls.mainnet), // mainnet
  137: getRpcUrlFromEnv(137, env.rpcUrls.polygon), // polygon
  10: getRpcUrlFromEnv(10, env.rpcUrls.optimism), // optimism
  42161: getRpcUrlFromEnv(42161, env.rpcUrls.arbitrum), // arbitrum
  11155111: getRpcUrlFromEnv(11155111, env.rpcUrls.sepolia), // sepolia
  8453: getRpcUrlFromEnv(8453, env.rpcUrls.base), // base
  1337: getRpcUrlFromEnv(1337, env.rpcUrls.localhost), // localhost
};

/**
 * 链 ID 到名称的映射
 */
export const CHAIN_NAMES: Record<number, string> = {
  1: "mainnet",
  137: "polygon",
  10: "optimism",
  42161: "arbitrum",
  11155111: "sepolia",
  8453: "base",
  1337: "localhost",
};

/**
 * 根据链 ID 获取 RPC URL
 * @param chainId 链 ID
 * @returns RPC URL，如果未配置则抛出错误
 */
export function getRpcUrl(chainId: number): string {
  const url = RPC_URLS[chainId];
  if (!url) {
    throw new Error(`RPC URL for chain ${chainId} is not configured`);
  }
  return url;
}

/**
 * 根据链 ID 获取链名称
 * @param chainId 链 ID
 * @returns 链名称或 undefined
 */
export function getChainName(chainId: number): string | undefined {
  return CHAIN_NAMES[chainId];
}

/**
 * 获取所有支持的链 ID
 * @returns 支持的链 ID 数组
 */
export function getSupportedChainIds(): number[] {
  return Object.keys(RPC_URLS).map(Number);
}

/**
 * 检查链 ID 是否受支持
 * @param chainId 链 ID
 * @returns 是否受支持
 */
export function isSupportedChain(chainId: number): boolean {
  return chainId in RPC_URLS;
}
