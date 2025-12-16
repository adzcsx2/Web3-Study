import { ethers } from "hardhat";
import { PoolFee } from "../types/Enum";

/**
 * 简单路径查找器
 * 基于本地合约查找最优路径，不依赖外部路由服务
 */
export class SwapUtils {
  private factoryAddress: string;
  private quoterAddress: string;
  private intermediateTokens: string[];
  private supportedFees: number[] = [PoolFee.LOW, PoolFee.MEDIUM, PoolFee.HIGH];

  constructor(
    factoryAddress: string,
    quoterAddress: string,
    intermediateTokens: string[]
  ) {
    this.factoryAddress = factoryAddress;
    this.quoterAddress = quoterAddress;
    this.intermediateTokens = intermediateTokens;
  }

  /**
   * 查找最优路径
   */
  async findBestPath(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint
  ): Promise<PathInfo> {
    const factory = await ethers.getContractAt(
      "NextswapV3Factory",
      this.factoryAddress
    );
    const quoter = await ethers.getContractAt("QuoterV2", this.quoterAddress);

    const paths: PathInfo[] = [];

    // 1. 检查直接路径
    for (const fee of this.supportedFees) {
      try {
        const pool = await factory.getPool(tokenIn, tokenOut, fee);
        if (pool === ethers.ZeroAddress) continue;

        const quoteResult = await quoter.quoteExactInputSingle.staticCall({
          tokenIn,
          tokenOut,
          fee,
          amountIn,
          sqrtPriceLimitX96: 0,
        });

        // QuoterV2 返回一个结构体 [amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate]
        const quote = quoteResult[0]; // 取第一个值 amountOut

        paths.push({
          tokensAddress: [tokenIn, tokenOut],
          fees: [fee],
          expectedOutput: quote,
          hops: 1,
        });

        console.log(
          `  直接路径 (费率${fee / 10000}%): 预期输出 ${quote.toString()}`
        );
      } catch (error) {
        // 跳过不存在的池子
        continue;
      }
    }

    // 2. 检查单跳路径
    for (const intermediate of this.intermediateTokens) {
      if (intermediate === tokenIn || intermediate === tokenOut) continue;

      for (const fee1 of this.supportedFees) {
        for (const fee2 of this.supportedFees) {
          try {
            const pool1 = await factory.getPool(tokenIn, intermediate, fee1);
            const pool2 = await factory.getPool(intermediate, tokenOut, fee2);

            if (pool1 === ethers.ZeroAddress || pool2 === ethers.ZeroAddress) {
              continue;
            }

            const path = encodeV3Path(
              [tokenIn, intermediate, tokenOut],
              [fee1, fee2]
            );

            const quoteResult = await quoter.quoteExactInput.staticCall(
              path,
              amountIn
            );

            // QuoterV2.quoteExactInput 返回 [amountOut, sqrtPriceX96AfterList, initializedTicksCrossedList, gasEstimate]
            const quote = quoteResult[0]; // 取第一个值 amountOut

            paths.push({
              tokensAddress: [tokenIn, intermediate, tokenOut],
              fees: [fee1, fee2],
              expectedOutput: quote,
              hops: 2,
            });
          } catch (error) {
            continue;
          }
        }
      }
    }

    // 3. 检查双跳路径
    for (let i = 0; i < this.intermediateTokens.length; i++) {
      for (let j = 0; j < this.intermediateTokens.length; j++) {
        if (i === j) continue;

        const intermediate1 = this.intermediateTokens[i];
        const intermediate2 = this.intermediateTokens[j];

        if (
          intermediate1 === tokenIn ||
          intermediate1 === tokenOut ||
          intermediate2 === tokenIn ||
          intermediate2 === tokenOut
        ) {
          continue;
        }

        // 只尝试 LOW 费率以节省时间
        try {
          const pool1 = await factory.getPool(
            tokenIn,
            intermediate1,
            PoolFee.LOW
          );
          const pool2 = await factory.getPool(
            intermediate1,
            intermediate2,
            PoolFee.LOW
          );
          const pool3 = await factory.getPool(
            intermediate2,
            tokenOut,
            PoolFee.LOW
          );

          if (
            pool1 === ethers.ZeroAddress ||
            pool2 === ethers.ZeroAddress ||
            pool3 === ethers.ZeroAddress
          ) {
            continue;
          }

          const path = encodeV3Path(
            [tokenIn, intermediate1, intermediate2, tokenOut],
            [PoolFee.LOW, PoolFee.LOW, PoolFee.LOW]
          );

          const quoteResult = await quoter.quoteExactInput.staticCall(
            path,
            amountIn
          );

          // QuoterV2.quoteExactInput 返回 [amountOut, ...]
          const quote = quoteResult[0];

          paths.push({
            tokensAddress: [tokenIn, intermediate1, intermediate2, tokenOut],
            fees: [PoolFee.LOW, PoolFee.LOW, PoolFee.LOW],
            expectedOutput: quote,
            hops: 3,
          });
        } catch (error) {
          continue;
        }
      }
    }

    if (paths.length === 0) {
      throw new Error("未找到有效的交换路径");
    }

    // 返回输出最大的路径
    const bestPath = paths.reduce((best, current) =>
      current.expectedOutput > best.expectedOutput ? current : best
    );

    console.log("\n=== 最优路径 ===");
    console.log("路径:", this.formatPath(bestPath));
    console.log("跳数:", bestPath.hops);
    console.log("预期输出:", bestPath.expectedOutput.toString());

    return bestPath;
  }

  /**
   * 格式化路径显示
   */
  formatPath(pathInfo: PathInfo): string {
    let result = "";
    for (let i = 0; i < pathInfo.tokensAddress.length; i++) {
      result += this.formatAddress(pathInfo.tokensAddress[i]);
      if (i < pathInfo.fees.length) {
        result += ` --(${pathInfo.fees[i] / 10000}%)--> `;
      }
    }
    return result;
  }

  /**
   * 格式化地址
   */
  private formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * 直接转为 SwapInputParams 格式
   */
  async toSwapInputParams(
    token0Address: string,
    token1Address: string,
    recipient: string,
    deadline: number,
    amountIn: bigint,
    amountOutMinimum: bigint
  ): Promise<SwapInputParams> {
    const pathInfo = await this.findBestPath(
      token0Address,
      token1Address,
      amountIn
    );
    const path = encodeV3Path(pathInfo.tokensAddress, pathInfo.fees);
    return {
      path,
      recipient,
      deadline,
      amountIn,
      amountOutMinimum, // 可根据需要设置滑点保护
    };
  }
}

/**
 * 路径信息接口
 */
export interface PathInfo {
  tokensAddress: string[];
  fees: number[];
  expectedOutput: bigint;
  hops: number;
}

/**
 *  编码 Uniswap V3 路径
 * @param tokens
 * @param fees
 * @returns
 */
export function encodeV3Path(tokens: string[], fees: number[]): string {
  if (tokens.length !== fees.length + 1) {
    throw new Error("Invalid path");
  }
  let path = "0x";
  for (let i = 0; i < fees.length; i++) {
    path += tokens[i].slice(2).padStart(40, "0");
    path += fees[i].toString(16).padStart(6, "0"); // uint24 in 3 bytes
  }
  path += tokens[tokens.length - 1].slice(2).padStart(40, "0");
  return path;
}
