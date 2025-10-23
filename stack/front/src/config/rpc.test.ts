/**
 * RPC 配置测试
 * 验证 RPC 配置的重构是否正确工作
 */

import {
  RPC_URLS,
  getRpcUrl,
  getChainName,
  getSupportedChainIds,
  isSupportedChain,
} from "@/config/rpc";
import { config as wagmiConfig } from "@/config/wagmi";
import { VIEM_CONFIG } from "@/utils/viemContractUtils";

describe("RPC 配置重构测试", () => {
  test("RPC_URLS 应该包含所有必需的链", () => {
    expect(RPC_URLS[1]).toBeDefined(); // mainnet
    expect(RPC_URLS[137]).toBeDefined(); // polygon
    expect(RPC_URLS[10]).toBeDefined(); // optimism
    expect(RPC_URLS[42161]).toBeDefined(); // arbitrum
    expect(RPC_URLS[11155111]).toBeDefined(); // sepolia
    expect(RPC_URLS[8453]).toBeDefined(); // base
  });

  test("getRpcUrl 函数应该正常工作", () => {
    expect(getRpcUrl(1)).toContain("mainnet.infura.io");
    expect(getRpcUrl(137)).toContain("polygon-mainnet.infura.io");
    expect(getRpcUrl(999999)).toBeUndefined(); // 不存在的链
  });

  test("getChainName 函数应该正常工作", () => {
    expect(getChainName(1)).toBe("mainnet");
    expect(getChainName(137)).toBe("polygon");
    expect(getChainName(999999)).toBeUndefined(); // 不存在的链
  });

  test("getSupportedChainIds 应该返回所有支持的链 ID", () => {
    const chainIds = getSupportedChainIds();
    expect(chainIds).toContain(1);
    expect(chainIds).toContain(137);
    expect(chainIds).toContain(10);
    expect(chainIds).toContain(42161);
    expect(chainIds).toContain(11155111);
    expect(chainIds).toContain(8453);
  });

  test("isSupportedChain 应该正确判断链是否支持", () => {
    expect(isSupportedChain(1)).toBe(true);
    expect(isSupportedChain(999999)).toBe(false);
  });

  test("wagmi 配置应该使用共享的 RPC URLs", () => {
    // 验证 wagmi 配置中的链都有对应的 RPC URL
    for (const chain of wagmiConfig.chains) {
      expect(RPC_URLS[chain.id]).toBeDefined();
    }
  });

  test("VIEM_CONFIG 应该使用共享的 RPC URLs", () => {
    // 验证 VIEM_CONFIG 的 rpcUrls 与共享的 RPC_URLS 一致
    for (const chain of wagmiConfig.chains) {
      const chainId = chain.id;
      expect(VIEM_CONFIG.rpcUrls[chainId]).toBe(RPC_URLS[chainId]);
    }
  });

  test("配置一致性检查", () => {
    // 确保 wagmi 和 viem 使用相同的 RPC 配置
    for (const chain of wagmiConfig.chains) {
      const chainId = chain.id;
      const wagmiRpcUrl = RPC_URLS[chainId];
      const viemRpcUrl = VIEM_CONFIG.rpcUrls[chainId];

      expect(wagmiRpcUrl).toBe(viemRpcUrl);
      expect(wagmiRpcUrl).toContain("infura.io");
    }
  });
});
