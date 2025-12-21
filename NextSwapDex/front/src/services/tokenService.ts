import { SwapToken } from "@/types/";
import { config } from "@/config/wagmi";
import { formatUnits } from "viem";
import { readContract, getBalance } from "@wagmi/core";
import { getContractInfo } from "./localhostContracts";

/**
 * 代币合约ABI (仅包含需要的部分)
 */
const ERC20_ABI = [
  // 获取代币名称
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
  // 获取代币符号
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
  // 获取代币精度
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  // 获取代币总供应量
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
  // 获取账户余额
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
] as const;

/**
 * 代币服务类 - 处理代币相关的区块链查询
 */
export class TokenService {
  /**
   * 验证是否为有效的以太坊地址
   */
  static isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * 从区块链获取代币基本信息
   */
  static async getTokenInfo(
    tokenAddress: string,
    chainId: number
  ): Promise<SwapToken | null> {
    try {
      if (!this.isValidEthereumAddress(tokenAddress)) {
        throw new Error("无效的代币地址");
      }

      console.log(`正在链 ${chainId} 上查询代币信息:`, tokenAddress);

      // 对于localhost链，尝试使用部署的合约ABI
      let contractInfo = null;
      if (chainId === 1337 || chainId === 31337) {
        contractInfo = getContractInfo(chainId, tokenAddress);
        if (contractInfo) {
          console.log(
            `✅ 找到已部署合约: ${contractInfo.contractName}, ABI长度: ${contractInfo.abi.length}, chainId: ${chainId}`
          );

          // 检查ABI中是否包含我们需要的ERC20方法
          const hasSymbol = contractInfo.abi.some(
            (item: any) => item.name === "symbol"
          );
          const hasName = contractInfo.abi.some(
            (item: any) => item.name === "name"
          );
          const hasDecimals = contractInfo.abi.some(
            (item: any) => item.name === "decimals"
          );
          console.log(
            `ABI方法检查 - symbol: ${hasSymbol}, name: ${hasName}, decimals: ${hasDecimals}`
          );
        } else {
          console.log(
            `❌ 未找到已部署合约, chainId: ${chainId}, address: ${tokenAddress}`
          );
        }
      } else {
        console.log(
          `⚠️ 不是localhost链, chainId: ${chainId}, 跳过部署合约检查`
        );
      }

      // 使用部署的合约ABI或默认ERC20 ABI
      const abi = contractInfo?.abi || ERC20_ABI;
      console.log(`ABI:  ${JSON.stringify(abi)}`);
      // 使用 wagmi 的 readContract 方法，逐步获取信息以提供更好的错误反馈
      let symbol: string;
      let decimals: number;
      let name: string | undefined;

      try {
        // 并行获取信息
        const results = await Promise.allSettled([
          readContract(config, {
            address: tokenAddress as `0x${string}`,
            abi,
            functionName: "symbol",
            chainId: chainId as any,
            args: [],
          }),
          readContract(config, {
            address: tokenAddress as `0x${string}`,
            abi,
            functionName: "decimals",
            chainId: chainId as any,
            args: [],
          }),
          readContract(config, {
            address: tokenAddress as `0x${string}`,
            abi,
            functionName: "name",
            chainId: chainId as any,
            args: [],
          }),
        ]);

        // 检查结果
        if (results[0].status === "fulfilled") {
          symbol = results[0].value as string;
          console.log("✅ 成功获取代币符号:", symbol);
        } else {
          console.warn(
            "⚠️ 获取代币符号失败，使用合约名称作为回退:",
            results[0].reason
          );
          symbol = contractInfo?.contractName?.toUpperCase() || "UNKNOWN";
        }

        if (results[1].status === "fulfilled") {
          decimals = results[1].value as number;
          console.log("✅ 成功获取代币精度:", decimals);
        } else {
          console.warn("⚠️ 获取代币精度失败，使用默认值:", results[1].reason);
          decimals = 18; // 默认精度
        }

        if (results[2].status === "fulfilled") {
          name = results[2].value as string;
          console.log("✅ 成功获取代币名称:", name);
        } else {
          console.warn(
            "⚠️ 获取代币名称失败，使用合约名称作为回退:",
            results[2].reason
          );
          name = contractInfo?.contractName || undefined;
        }
      } catch (error) {
        console.error("合约调用失败:", error);

        if (contractInfo) {
          // 如果有部署信息，使用部署信息
          symbol = contractInfo.contractName?.toUpperCase() || "UNKNOWN";
          name = contractInfo.contractName;
          decimals = 18;
        } else {
          throw new Error(
            `无法调用合约方法。请确认地址 ${tokenAddress} 在链 ${chainId} 上是有效的代币合约。`
          );
        }
      }

      // 构造SwapToken对象
      const swapToken: SwapToken = {
        chainId,
        tokenAddress: tokenAddress.toLowerCase(),
        tokenSymbol: symbol || name?.slice(0, 10).toUpperCase() || "UNKNOWN",
        tokenDecimals: decimals || 18,
        tokenLogoURI: this.generateTokenLogo(tokenAddress, symbol),
        balance: "0", // 默认余额为0，需要单独查询
      };

      console.log("✅ 代币信息获取完成:", {
        symbol: swapToken.tokenSymbol,
        name: name || "未获取",
        decimals: swapToken.tokenDecimals,
        address: swapToken.tokenAddress,
        chainId: swapToken.chainId,
      });

      return swapToken;
    } catch (error) {
      console.error("获取代币信息失败:", error);

      // 根据错误类型返回不同的错误信息
      if (error instanceof Error) {
        if (error.message.includes("returned no data")) {
          throw new Error(
            `地址 ${tokenAddress} 在链 ${chainId} 上返回空数据。可能原因:\n1. 该地址不是代币合约\n2. 合约未部署到当前网络\n3. 请确认本地区块链节点正在运行`
          );
        }
        if (
          error.message.includes("call revert exception") ||
          error.message.includes("revert")
        ) {
          throw new Error(
            `合约调用失败。请确认地址 ${tokenAddress} 在链 ${chainId} 上是有效的ERC20代币合约`
          );
        }
        if (
          error.message.includes("network") ||
          error.message.includes("timeout")
        ) {
          throw new Error("网络连接失败，请检查本地区块链节点是否正在运行");
        }
      }

      // 重新抛出我们已经处理的错误
      if (error instanceof Error) {
        throw error;
      }

      throw new Error(`获取代币信息失败: ${error}`);
    }
  }

  /**
   * 获取用户在指定代币的余额
   */
  static async getUserTokenBalance(
    tokenAddress: string,
    userAddress: string,
    chainId: number
  ): Promise<string> {
    try {
      if (!this.isValidEthereumAddress(userAddress)) {
        throw new Error("无效的用户地址");
      }

      // 处理ETH（原生币）余额查询
      if (
        !tokenAddress ||
        tokenAddress === "0x0000000000000000000000000000000000000000" ||
        tokenAddress === "0x"
      ) {
        const balance = await getBalance(config, {
          address: userAddress as `0x${string}`,
          chainId: chainId as any,
        });
        return formatUnits(balance.value, balance.decimals);
      }

      if (!this.isValidEthereumAddress(tokenAddress)) {
        throw new Error("无效的代币地址");
      }

      // 使用 wagmi 的 readContract 方法查询ERC20代币余额
      const [balance, decimals] = await Promise.all([
        readContract(config, {
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [userAddress as `0x${string}`],
          chainId: chainId as any,
        }),
        readContract(config, {
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "decimals",
          chainId: chainId as any,
        }),
      ]);

      // 转换为可读格式
      const formattedBalance = formatUnits(
        balance as bigint,
        decimals as number
      );

      return formattedBalance;
    } catch (error) {
      console.error("获取代币余额失败:", error);
      throw new Error("获取代币余额失败");
    }
  }

  /**
   * 批量获取用户代币余额
   */
  static async getBatchUserTokenBalance(
    tokens: { tokenAddress: string; userAddress: string }[],
    chainId: number
  ): Promise<{ [tokenAddress: string]: string }> {
    try {
      const results: { [tokenAddress: string]: string } = {};

      // 并行查询多个代币余额
      const balancePromises = tokens.map(
        async ({ tokenAddress, userAddress }) => {
          try {
            const balance = await this.getUserTokenBalance(
              tokenAddress,
              userAddress,
              chainId
            );
            results[tokenAddress] = balance;
          } catch (error) {
            console.error(`获取代币 ${tokenAddress} 余额失败:`, error);
            results[tokenAddress] = "0";
          }
        }
      );

      await Promise.all(balancePromises);

      return results;
    } catch (error) {
      console.error("批量获取代币余额失败:", error);
      throw new Error("批量获取代币余额失败");
    }
  }

  /**
   * 生成代币Logo URL
   * 优先使用已知的代币Logo服务，否则生成默认头像
   */
  private static generateTokenLogo(
    tokenAddress: string,
    symbol?: string
  ): string {
    const address = tokenAddress.toLowerCase();

    // 常见代币的Logo映射
    const knownTokens: { [key: string]: string } = {
      // 主网代币
      "0xdac17f958d2ee523a": "https://tokens.1inch.io/0xdac17f958d2ee523a", // USDT
      "0xa0b86a33e6412b0c": "https://tokens.1inch.io/0xa0b86a33e6412b0c", // USDC
      "0x2260fac5e5542a77": "https://tokens.1inch.io/0x2260fac5e5542a77", // WBTC
      "0x6b175474e89094c44da98b954eedeac495271d0f":
        "https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f", // DAI
      // 可以添加更多已知代币
    };

    // 检查是否为已知代币
    if (knownTokens[address.slice(0, 16)]) {
      return knownTokens[address.slice(0, 16)];
    }

    // 使用 1inch 服务获取代币图标
    return `https://tokens.1inch.io/${address}`;

    // 如果上述服务不可用，可以回退到生成默认头像
    // return `https://ui-avatars.com/api/?name=${symbol || address.slice(2, 6)}&background=random&color=fff`;
  }

  /**
   * 检查地址是否为代币合约
   */
  static async isTokenContract(
    address: string,
    chainId: number
  ): Promise<boolean> {
    try {
      if (!this.isValidEthereumAddress(address)) {
        return false;
      }

      // 尝试调用一些常见的ERC20方法来验证
      const commonMethods = ["symbol", "name", "decimals"];

      for (const method of commonMethods) {
        try {
          await readContract(config, {
            address: address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: method,
            chainId: chainId as any,
          });
          console.log(
            `地址 ${address} 支持 ${method} 方法，可能是有效的ERC20代币合约`
          );
          return true; // 如果任何一个方法成功，认为是合约
        } catch (methodError) {
          console.log(`地址 ${address} 不支持 ${method} 方法`);
          continue; // 尝试下一个方法
        }
      }

      console.log(`地址 ${address} 不支持任何标准ERC20方法，可能不是代币合约`);
      return false;
    } catch (error) {
      console.error(`检查地址 ${address} 是否为合约时出错:`, error);
      return false;
    }
  }

  /**
   * 搜索代币（支持地址搜索）
   */
  static async searchToken(
    query: string,
    chainId: number
  ): Promise<SwapToken | null> {
    try {
      // 如果查询的是地址，直接获取代币信息
      if (this.isValidEthereumAddress(query)) {
        return await this.getTokenInfo(query, chainId);
      }

      // 这里可以添加按符号搜索的逻辑
      // 例如调用第三方API（CoinGecko, CoinMarketCap等）

      return null;
    } catch (error) {
      console.error("搜索代币失败:", error);
      throw error;
    }
  }
}
