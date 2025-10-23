"use client";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { env } from "@/config/env";
import { http } from "wagmi";
import { arbitrum, mainnet, optimism, polygon, sepolia } from "wagmi/chains";
import { RPC_URLS } from "@/config/rpc";

export const config = getDefaultConfig({
  appName: env.appTitle,
  projectId: env.walletConnectProjectId,
  chains: [
    mainnet,
    polygon,
    optimism,
    arbitrum,
    ...(env.isDev || env.isTest ? [sepolia] : []),
  ],
  transports: {
    [mainnet.id]: http(RPC_URLS[mainnet.id]),
    [polygon.id]: http(RPC_URLS[polygon.id]),
    [optimism.id]: http(RPC_URLS[optimism.id]),
    [arbitrum.id]: http(RPC_URLS[arbitrum.id]),
    [sepolia.id]: http(RPC_URLS[sepolia.id]),
  },
  ssr: true,
});
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
