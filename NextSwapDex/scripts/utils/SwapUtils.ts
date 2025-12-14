// src/lib/swap-router.ts
import { Token, CurrencyAmount, TradeType, Percent } from "@uniswap/sdk-core";
import { AlphaRouter } from "@uniswap/smart-order-router";
import { providers, Wallet as WalletV5 } from "ethers-v5";
import { SwapType } from "@uniswap/smart-order-router";

// 替换为你的 RPC URL（Infura / Alchemy）
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;

// 初始化 AlphaRouter（复用单例）
const v5Provider = createV5Provider(RPC_URL);
export const router = new AlphaRouter({ chainId: 1, provider: v5Provider });

/**
 * 获取最优多跳路径并生成交易数据
 */
export async function getSwapTransaction(
  tokenIn: Token,
  tokenOut: Token,
  amountIn: string, // 单位：token decimals（如 "1000" 表示 1000 DAI）
  recipient: string,
  slippageTolerance = 0.5 // 0.5%
) {
  // 1. 构造输入金额
  const amount = CurrencyAmount.fromRawAmount(
    tokenIn,
    Math.floor(parseFloat(amountIn) * 10 ** tokenIn.decimals).toString()
  );

  // 2. 调用 AlphaRouter 找最优路径
  const route = await router.route(amount, tokenOut, TradeType.EXACT_INPUT, {
    type: SwapType.SWAP_ROUTER_02,
    recipient,
    slippageTolerance: new Percent(
      Math.round(slippageTolerance * 100), // numerator
      10000 // denominator → 0.5% = 50 / 10000
    ),
    deadline: Math.floor(Date.now() / 1000) + 1800, // 30 分钟
  });
  if (!route) {
    throw new Error("No route found for the given token pair and amount.");
  }

  if (!route.methodParameters) {
    throw new Error("Failed to generate swap calldata");
  }

  const { calldata, value } = route.methodParameters;

  // 3. 返回交易参数（供 ethers v6 使用）
  return {
    to: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", // Uniswap V3 SwapRouter 地址 (mainnet)
    data: calldata,
    value: value ?? "0",
    gasEstimate: route.estimatedGasUsed.toString(),
  };
}
// src/lib/ethers-v5-compat.ts

// 创建 v5 Provider（用于 AlphaRouter）
export function createV5Provider(rpcUrl: string): providers.JsonRpcProvider {
  return new providers.JsonRpcProvider(rpcUrl);
}
