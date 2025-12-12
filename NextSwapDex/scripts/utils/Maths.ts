import { encodeSqrtRatioX96 } from "@uniswap/v3-sdk";
import { parseUnits } from "ethers";
import JSBI from "jsbi";

/**
 * 根据代币小数位和价格比例计算 sqrtPriceX96
 *
 * @param token0Decimals - token0 的小数位数
 * @param token1Decimals - token1 的小数位数
 * @param priceRatio - 价格比例: 1 token0 = priceRatio token1（基于美元价值，而非链上单位）
 * @returns JSBI 类型的 sqrtPriceX96
 *
 * @example
 * // USDC(6位)-DAI(18位) 1:1 美元价格
 * const sqrtPrice = priceToSqrtRatioX96(6, 18, 1);
 * // 结果: sqrt(1e18 / 1e6) * 2^96 = sqrt(1e12) * 2^96 = 1e6 * 2^96
 *
 * @example
 * // WBTC(8位)-USDC(6位) 比特币价格为 $30,000
 * const sqrtPrice = priceToSqrtRatioX96(8, 6, 30000);
 *
 * @remarks
 * 计算原理：
 * 1. 将价格比例转换为链上代币单位：
 *    - amount0 = 1 * 10^token0Decimals
 *    - amount1 = priceRatio * 10^token1Decimals
 * 2. 使用 Uniswap SDK 的 encodeSqrtRatioX96(amount1, amount0)
 *    计算 sqrt(amount1/amount0) * 2^96
 *
 * 注意事项：
 * - priceRatio 表示的是美元价值比例，不是链上单位比例
 * - 对于小数价格（如 0.99），会自动处理精度问题
 * - encodeSqrtRatioX96(amount1, amount0) 的参数顺序是 (分子, 分母)
 */
export function priceToSqrtRatioX96(
  token0Decimals: number,
  token1Decimals: number,
  priceRatio: number // 1 token0 = ? token1
): JSBI {
  if (!Number.isFinite(priceRatio) || priceRatio <= 0) {
    throw new Error("priceRatio must be positive");
  }

  // Step 1: 计算归一化后的金额（都转换为 18 位精度进行计算）
  // amount0 = 1 * 10^token0Decimals（实际代币单位）
  // amount1 = priceRatio * 10^token1Decimals（实际代币单位）

  // 为了避免浮点数精度问题，我们将 priceRatio 拆分为整数和小数部分
  const priceStr = priceRatio.toString();
  let amount0BigInt: bigint;
  let amount1BigInt: bigint;

  if (priceStr.includes(".")) {
    // 处理小数价格
    const [intPart, decPart] = priceStr.split(".");
    const decimalPlaces = decPart.length;

    // 使用字符串拼接来保持精度
    // priceRatio * 10^decimalPlaces 得到整数
    const priceInt = BigInt(intPart + decPart);
    const priceDenom = 10n ** BigInt(decimalPlaces);

    // amount0 = 10^token0Decimals
    amount0BigInt = parseUnits("1", token0Decimals);

    // amount1 = (priceInt / priceDenom) * 10^token1Decimals
    //         = (priceInt * 10^token1Decimals) / priceDenom
    const numerator = priceInt * parseUnits("1", token1Decimals);
    // 四舍五入避免系统性向下截断偏差
    amount1BigInt = (numerator + priceDenom / 2n) / priceDenom;
  } else {
    // 处理整数价格
    amount0BigInt = parseUnits("1", token0Decimals);
    amount1BigInt = parseUnits(priceRatio.toString(), token1Decimals);
  }

  // Step 2: 转换为 JSBI
  const amount0 = JSBI.BigInt(amount0BigInt.toString());
  const amount1 = JSBI.BigInt(amount1BigInt.toString());

  // Step 3: 调用 Uniswap SDK
  // encodeSqrtRatioX96(amount1, amount0) 计算 sqrt(amount1/amount0) * 2^96
  return encodeSqrtRatioX96(amount1, amount0);
}

/**
 * 返回排序后的代币地址
 * @param tokenA_address
 * @param tokenB_address
 * @returns
 */

export function sortTokens(a: string, b: string): [string, string] {
  return BigInt(a) < BigInt(b) ? [a, b] : [b, a];
}

export function getSpacingFromFee(fee: number): number {
  switch (fee) {
    case 100:
      return 1;
    case 500:
      return 10;
    case 3000:
      return 60;
    case 10000:
      return 200;
    default:
      throw new Error("Unsupported fee tier");
  }
}
