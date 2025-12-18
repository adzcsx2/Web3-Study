/**
 * 基于 ethers.js 的智能合约交互工具集（增强版 v3.0）
 *
 * 提供了一系列用于与智能合约进行读写操作的工具类。
 * 基于 ethers.js 库封装，提供类型安全、错误处理、统一写方法和状态跟踪功能。
 *
 * 🚀 核心功能：
 * - 合约读取操作（可在循环中使用）
 * - 合约写入操作（支持交易状态跟踪）
 * - 统一写方法处理（executeWrite / executeWriteWithStatus）
 * - 交易状态回调系统（onPending, onSent, onSuccess, onError 等）
 * - 批量操作支持
 * - 自动重试机制
 * - 交易超时处理
 * - Gas 费用估算
 * - 事件监听支持
 * - 可配置的日志记录和错误处理
 *
 * 🎯 新增特性（v3.0）：
 * ✨ executeWrite() - 统一的写方法处理，自动合并交易选项
 * ✨ executeWriteWithStatus() - 带状态跟踪的写方法，支持完整生命周期回调
 * ✨ ExtendedContractWriteOptions - 扩展选项接口，支持状态回调
 * ✨ 消除代码重复 - 所有合约包装器共享统一的写方法逻辑
 *
 * 优势对比 React Hooks：
 * ✅ 可以在循环中调用
 * ✅ 可以在条件语句中调用
 * ✅ 支持并行批量操作
 * ✅ 更灵活的错误处理
 * ✅ 更好的性能控制
 * ✅ 支持交易超时和 Gas 估算
 * ✅ 支持事件监听和过滤
 * ✅ 统一的写方法 API，减少代码重复
 * ✅ 完整的交易状态跟踪和回调支持
 *
 * @example
 * ```typescript
 * // 创建合约包装器
 * const contract = createContractWrapper({
 *   contractAddress: "0x123...",
 *   contractAbi: abi,
 *   contractName: "MyContract"
 * });
 *
 * // 统一写方法
 * const result = await contract.executeWrite('transfer', [to, amount], {
 *   signer: wagmiSigner,
 *   gasLimit: 100000
 * });
 *
 * // 带状态跟踪的写方法
 * await contract.executeWriteWithStatus('stake', [poolId, amount], {
 *   signer: wagmiSigner,
 *   onPending: () => console.log('🔄 交易发送中...'),
 *   onSent: (hash) => console.log('📤 交易已发送:', hash),
 *   onSuccess: (receipt) => console.log('✅ 交易成功！'),
 *   onError: (error) => console.error('💥 交易失败:', error)
 * });
 * ```
 *
 * @author Hoyn
 * @version 3.0.0
 * @lastModified 2025-10-24
 */

import { ethers } from "ethers";
import {
  RPC_CONFIG,
  DEFAULT_NETWORK,
  CONTRACT_CONFIG,
} from "@/config/ethersConfig";

/**
 * 合约读取操作的配置选项
 */
export interface ContractReadOptions {
  /** 合约地址 */
  contractAddress: string;
  /** 合约 ABI */
  contractAbi: ethers.InterfaceAbi;
  /** 要调用的合约函数名称 */
  functionName: string;
  /** 传递给合约函数的参数数组 */
  args?: readonly unknown[];
  /** 是否跳过日志输出，默认为 false */
  skipLogging?: boolean;
  /** 重试次数，默认为 3 */
  retryCount?: number;
  /** 重试间隔（毫秒），默认为 1000 */
  retryDelay?: number;
  /** 可选的 ethers Provider（来自 wagmi） */
  provider?: ethers.Provider;
}

/**
 * 合约读取操作的返回结果
 */
export interface ContractReadResult<T> {
  /** 合约调用返回的数据 */
  data: T | null;
  /** 错误信息，如果有的话 */
  error: Error | null;
  /** 是否发生错误 */
  isError: boolean;
  /** 调用是否成功 */
  isSuccess: boolean;
}

/**
 * 合约写入操作的配置选项
 */
export interface ContractWriteOptions {
  /** 合约地址 */
  contractAddress: string;
  /** 合约 ABI */
  contractAbi: ethers.InterfaceAbi;
  /** 要调用的合约函数名称 */
  functionName: string;
  /** 传递给合约函数的参数数组 */
  args?: readonly unknown[];
  /** 要发送的以太币数量（wei 单位，支持字符串或 BigInt） */
  value?: string | bigint;
  /** Gas limit */
  gasLimit?: string | bigint;
  /** Gas price */
  gasPrice?: string | bigint;
  /** 最大优先费用（EIP-1559） */
  maxPriorityFeePerGas?: string | bigint;
  /** 最大费用（EIP-1559） */
  maxFeePerGas?: string | bigint;
  /** 是否自动估算 Gas，默认为 false */
  estimateGas?: boolean;
  /** 交易超时时间（毫秒），默认为 300000 (5分钟) */
  timeout?: number;
  /** 是否跳过日志输出，默认为 false */
  skipLogging?: boolean;
  /** 必需的 ethers Signer（来自 wagmi） */
  signer?: ethers.Signer;
  /** 可选的 ethers Provider（来自 wagmi） */
  provider?: ethers.Provider;
}

/**
 * 扩展的合约写入选项，支持状态回调
 */
export interface ExtendedContractWriteOptions extends ContractWriteOptions {
  /** 交易待处理时的回调 */
  onPending?: () => void;
  /** 交易已发送时的回调（返回交易哈希） */
  onSent?: (hash: string) => void;
  /** 交易确认中的回调 */
  onConfirming?: () => void;
  /** 交易确认完成的回调 */
  onConfirmed?: (receipt: ethers.TransactionReceipt) => void;
  /** 交易成功完成的回调 */
  onSuccess?: (receipt: ethers.TransactionReceipt) => void;
  /** 交易回滚的回调 */
  onReverted?: (receipt: ethers.TransactionReceipt) => void;
  /** 交易错误的回调 */
  onError?: (error: Error) => void;
}

/**
 * Gas 估算结果
 */
export interface GasEstimation {
  /** 估算的 Gas limit */
  gasLimit: bigint;
  /** 当前 Gas price */
  gasPrice?: bigint;
  /** 最大费用（EIP-1559） */
  maxFeePerGas?: bigint;
  /** 最大优先费用（EIP-1559） */
  maxPriorityFeePerGas?: bigint;
  /** 估算的总费用（ETH） */
  estimatedCost: string;
}

/**
 * 事件监听选项
 */
export interface EventListenerOptions {
  /** 合约地址 */
  contractAddress: string;
  /** 合约 ABI */
  contractAbi: ethers.InterfaceAbi;
  /** 事件名称 */
  eventName: string;
  /** 事件过滤器 */
  filters?: Record<string, unknown>;
  /** 从哪个区块开始监听（默认为 'latest'） */
  fromBlock?: number | string;
  /** 到哪个区块结束监听（默认为 'latest'） */
  toBlock?: number | string;
  /** 可选的 ethers Provider */
  provider?: ethers.Provider;
}

/**
 * 批量调用配置
 */
export interface BatchCall {
  /** 合约地址 */
  contractAddress: string;
  /** 合约 ABI */
  contractAbi: ethers.InterfaceAbi;
  /** 函数名称 */
  functionName: string;
  /** 函数参数 */
  args?: readonly unknown[];
}

/**
 * 合约写入操作的返回结果
 */
export interface ContractWriteResult {
  /** 交易哈希 */
  hash: string | null;
  /** 交易收据 */
  receipt: ethers.TransactionReceipt | null;
  /** 错误信息，如果有的话 */
  error: Error | null;
  /** 是否发生错误 */
  isError: boolean;
  /** 调用是否成功 */
  isSuccess: boolean;
  /** 交易是否已确认 */
  isConfirmed: boolean;
  /** 交易执行是否成功（区分上链成功和执行成功） */
  isTransactionSuccessful: boolean;
  /** 交易是否因执行失败而回滚 */
  isReverted: boolean;
  /** Gas 使用量 */
  gasUsed?: bigint;
  /** 实际 Gas 价格 */
  effectiveGasPrice?: bigint;
  /** 交易费用（ETH） */
  transactionCost?: string;
  /** Gas 估算结果（如果进行了估算） */
  gasEstimation?: GasEstimation;
}

/**
 * 获取 Provider（RPC 连接）
 * 优先使用 wagmi 的 provider，备用使用公共 RPC
 */
function getProvider(wagmiProvider?: ethers.Provider): ethers.Provider {
  // 优先使用传入的 wagmi provider
  if (wagmiProvider) {
    return wagmiProvider;
  }

  // 备用1：使用用户钱包
  if (typeof window !== "undefined" && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }

  // 备用2：使用公共 RPC（使用配置的默认网络）
  const networkConfig = RPC_CONFIG[DEFAULT_NETWORK as keyof typeof RPC_CONFIG];
  const rpcUrl = networkConfig.rpcUrls[0];
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * 获取合约实例（只读）
 */
function getContract(
  contractAddress: string,
  contractAbi: ethers.InterfaceAbi,
  provider?: ethers.Provider
): ethers.Contract {
  const ethersProvider = getProvider(provider);
  return new ethers.Contract(contractAddress, contractAbi, ethersProvider);
}

/**
 * 获取带签名者的合约实例（用于写操作）
 */
function getContractWithSigner(
  contractAddress: string,
  contractAbi: ethers.InterfaceAbi,
  signer?: ethers.Signer
): ethers.Contract {
  if (!signer) {
    throw new Error("需要 Signer 进行写操作，请先连接钱包");
  }
  return new ethers.Contract(contractAddress, contractAbi, signer);
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 合约包装器配置接口
 */
export interface ContractWrapperConfig {
  /** 合约地址 */
  contractAddress: string;
  /** 合约 ABI */
  contractAbi: ethers.InterfaceAbi;
  /** 合约名称（可选，用于日志） */
  contractName?: string;
}

/**
 * 基于 ethers.js 的合约服务类
 */
export class EthersContractService {
  /**
   * 读取合约数据的基础方法
   *
   * @template T 返回数据的类型
   * @param options 配置选项
   * @returns 合约读取结果
   *
   * @example
   * ```typescript
   * const result = await EthersContractService.read<string>({
   *   functionName: 'name',
   *   args: []
   * });
   * ```
   */
  static async read<T = unknown>(
    options: ContractReadOptions
  ): Promise<ContractReadResult<T>> {
    const {
      contractAddress,
      contractAbi,
      functionName,
      args = [],
      skipLogging = !CONTRACT_CONFIG.enableLogging,
      retryCount = CONTRACT_CONFIG.defaultRetryCount,
      retryDelay = CONTRACT_CONFIG.defaultRetryDelay,
      provider,
    } = options;

    // 验证合约地址
    if (!contractAddress) {
      const error = new Error("Contract address is required");
      return { data: null, error, isError: true, isSuccess: false };
    }

    let lastError: Error | null = null;

    // 重试机制
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        if (!skipLogging) {
          console.log(
            `=== Contract ${functionName} Call (Attempt ${attempt + 1}) ===`
          );
          console.log("Contract Address:", contractAddress);
          console.log("Function Name:", functionName);
          console.log("Arguments:", args);
        }

        const contract = getContract(contractAddress, contractAbi, provider);
        const data = (await contract[functionName](...args)) as T;

        if (!skipLogging) {
          console.log("✅ Call Success");
          console.log("Data:", data);
          console.log("===============================");
        }

        return {
          data,
          error: null,
          isError: false,
          isSuccess: true,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!skipLogging) {
          console.error(`❌ Call Failed (Attempt ${attempt + 1}):`, lastError);
        }

        // 如果不是最后一次尝试，等待后重试
        if (attempt < retryCount) {
          await delay(retryDelay);
        }
      }
    }

    if (!skipLogging) {
      console.error(
        `💥 All ${retryCount + 1} attempts failed for ${functionName}`
      );
      console.error("Final Error:", lastError);
      console.log("===============================");
    }

    return {
      data: null,
      error: lastError,
      isError: true,
      isSuccess: false,
    };
  }

  /**
   * 🔄 批量读取合约数据（可在循环中使用）
   *
   * @param calls 批量调用配置数组
   * @returns 批量读取结果数组
   *
   * @example
   * ```typescript
   * const calls = [];
   * for (let i = 0; i < poolCount; i++) {
   *   calls.push({ functionName: 'getPoolInfo', args: [i] });
   * }
   * const results = await EthersContractService.batchRead(calls);
   * ```
   */
  static async batchRead(
    calls: Omit<ContractReadOptions, "retryCount" | "retryDelay">[]
  ): Promise<ContractReadResult<unknown>[]> {
    console.log(`🚀 开始批量读取 ${calls.length} 个合约调用`);

    // 并行执行所有调用
    const promises = calls.map((call, index) =>
      this.read({ ...call, skipLogging: true })
        .then((result) => ({ ...result, index }))
        .catch((error) => ({
          data: null,
          error: error instanceof Error ? error : new Error(String(error)),
          isError: true,
          isSuccess: false,
          index,
        }))
    );

    const results = await Promise.all(promises);

    // 统计结果
    const successCount = results.filter((r) => r.isSuccess).length;
    console.log(`✅ 批量读取完成: ${successCount}/${calls.length} 成功`);

    return results.map((result) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { index, ...cleanResult } = result;
      return cleanResult;
    });
  }

  /**
   * 🔄 顺序读取合约数据（在循环中使用await）
   *
   * @param calls 批量调用配置数组
   * @returns 批量读取结果数组
   *
   * @example
   * ```typescript
   * const results = [];
   * for (let i = 0; i < poolCount; i++) {
   *   const result = await EthersContractService.readSequential({
   *     functionName: 'getPoolInfo',
   *     args: [i]
   *   });
   *   results.push(result);
   * }
   * ```
   */
  static async readSequential(
    options: ContractReadOptions
  ): Promise<ContractReadResult<unknown>> {
    return this.read(options);
  }

  /**
   * 💰 估算 Gas 费用
   *
   * @param options 合约写入选项（不包含 signer）
   * @returns Gas 估算结果
   *
   * @example
   * ```typescript
   * const estimation = await EthersContractService.estimateGas({
   *   contractAddress: '0x...',
   *   contractAbi: abi,
   *   functionName: 'stake',
   *   args: [ethers.parseEther('1.0')],
   *   value: ethers.parseEther('1.0')
   * });
   * console.log(`估算费用: ${estimation.estimatedCost} ETH`);
   * ```
   */
  static async estimateGas(
    options: Omit<ContractWriteOptions, "signer">
  ): Promise<GasEstimation> {
    const {
      contractAddress,
      contractAbi,
      functionName,
      args = [],
      value,
      provider,
    } = options;

    try {
      const ethersProvider = getProvider(provider);
      const contract = new ethers.Contract(
        contractAddress,
        contractAbi,
        ethersProvider
      );

      // 构建交易参数
      const txOptions: { value?: bigint } = {};
      if (value) {
        txOptions.value = typeof value === "string" ? BigInt(value) : value;
      }

      // 估算 Gas limit
      const estimatedGasLimit = await contract[functionName].estimateGas(
        ...args,
        txOptions
      );

      // 获取当前 Gas price 和费用信息
      const feeData = await ethersProvider.getFeeData();

      let estimatedCost: string;
      let gasPrice: bigint | undefined;
      let maxFeePerGas: bigint | undefined;
      let maxPriorityFeePerGas: bigint | undefined;

      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        // EIP-1559 (Type 2) 交易
        maxFeePerGas = feeData.maxFeePerGas;
        maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        const totalCost = estimatedGasLimit * maxFeePerGas;
        estimatedCost = ethers.formatEther(totalCost);
      } else if (feeData.gasPrice) {
        // Legacy (Type 0) 交易
        gasPrice = feeData.gasPrice;
        const totalCost = estimatedGasLimit * gasPrice;
        estimatedCost = ethers.formatEther(totalCost);
      } else {
        throw new Error("无法获取 Gas 价格信息");
      }

      return {
        gasLimit: estimatedGasLimit,
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas,
        estimatedCost,
      };
    } catch (error) {
      console.error("❌ Gas 估算失败:", error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * 写入合约数据（增强版，支持 Gas 估算和超时）
   *
   * @param options 写入配置选项
   * @returns 写入结果
   *
   * @example
   * ```typescript
   * const result = await EthersContractService.write({
   *   functionName: 'stake',
   *   args: [ethers.parseEther('1.0')],
   *   value: ethers.parseEther('1.0'),
   *   estimateGas: true,
   *   timeout: 180000 // 3分钟超时
   * });
   * ```
   */
  static async write(
    options: ContractWriteOptions
  ): Promise<ContractWriteResult> {
    const {
      contractAddress,
      contractAbi,
      functionName,
      args = [],
      value,
      gasLimit,
      gasPrice,
      maxPriorityFeePerGas,
      maxFeePerGas,
      estimateGas = false,
      timeout = CONTRACT_CONFIG.timeout,
      skipLogging = false,
      signer,
      provider,
    } = options;

    let gasEstimation: GasEstimation | undefined;

    try {
      if (!skipLogging) {
        console.log(`=== Contract ${functionName} Write ===`);
        console.log("Function Name:", functionName);
        console.log("Arguments:", args);
        console.log("Value:", value);
        console.log("Estimate Gas:", estimateGas);
        console.log("Timeout:", timeout);
      }

      // 如果启用了 Gas 估算
      if (estimateGas) {
        try {
          gasEstimation = await this.estimateGas({
            contractAddress,
            contractAbi,
            functionName,
            args,
            value,
            provider,
          });

          if (!skipLogging) {
            console.log("💰 Gas 估算结果:");
            console.log("  Gas Limit:", gasEstimation.gasLimit.toString());
            console.log("  估算费用:", gasEstimation.estimatedCost, "ETH");
          }
        } catch (error) {
          console.warn("⚠️ Gas 估算失败，使用默认值:", error);
        }
      }

      const contract = getContractWithSigner(
        contractAddress,
        contractAbi,
        signer
      );

      // 构建交易参数
      const txOptions: {
        value?: bigint;
        gasLimit?: bigint;
        gasPrice?: bigint;
        maxPriorityFeePerGas?: bigint;
        maxFeePerGas?: bigint;
      } = {};

      if (value)
        txOptions.value = typeof value === "string" ? BigInt(value) : value;

      // 优先使用估算的 Gas limit，否则使用配置的
      if (gasEstimation?.gasLimit) {
        // 增加 20% 的安全边际
        txOptions.gasLimit =
          (gasEstimation.gasLimit * BigInt(120)) / BigInt(100);
      } else if (gasLimit) {
        txOptions.gasLimit =
          typeof gasLimit === "string" ? BigInt(gasLimit) : gasLimit;
      }

      // EIP-1559 费用设置
      if (maxFeePerGas && maxPriorityFeePerGas) {
        txOptions.maxFeePerGas =
          typeof maxFeePerGas === "string"
            ? BigInt(maxFeePerGas)
            : maxFeePerGas;
        txOptions.maxPriorityFeePerGas =
          typeof maxPriorityFeePerGas === "string"
            ? BigInt(maxPriorityFeePerGas)
            : maxPriorityFeePerGas;
      } else if (
        gasEstimation?.maxFeePerGas &&
        gasEstimation?.maxPriorityFeePerGas
      ) {
        txOptions.maxFeePerGas = gasEstimation.maxFeePerGas;
        txOptions.maxPriorityFeePerGas = gasEstimation.maxPriorityFeePerGas;
      } else if (gasPrice) {
        txOptions.gasPrice =
          typeof gasPrice === "string" ? BigInt(gasPrice) : gasPrice;
      } else if (gasEstimation?.gasPrice) {
        txOptions.gasPrice = gasEstimation.gasPrice;
      }

      // 发送交易
      const tx = await contract[functionName](...args, txOptions);

      if (!skipLogging) {
        console.log("📤 交易已发送，哈希:", tx.hash);
        console.log("⏳ 等待确认...");
        if (txOptions.gasLimit)
          console.log("  Gas Limit:", txOptions.gasLimit.toString());
        if (txOptions.maxFeePerGas)
          console.log(
            "  Max Fee:",
            ethers.formatUnits(txOptions.maxFeePerGas, "gwei"),
            "Gwei"
          );
      }

      // 等待交易确认（带超时）
      const receipt = await Promise.race([
        tx.wait(),
        new Promise<null>((_, reject) =>
          setTimeout(
            () => reject(new Error(`交易超时 (${timeout}ms)`)),
            timeout
          )
        ),
      ]);

      // 判断交易执行状态
      const isConfirmed = receipt !== null;
      const isTransactionSuccessful = receipt?.status === 1;
      const isReverted = receipt?.status === 0;

      // 计算 Gas 使用信息
      let gasUsed: bigint | undefined;
      let effectiveGasPrice: bigint | undefined;
      let transactionCost: string | undefined;

      if (receipt) {
        gasUsed = receipt.gasUsed;
        effectiveGasPrice = receipt.gasPrice;
        if (gasUsed && effectiveGasPrice) {
          const cost = gasUsed * effectiveGasPrice;
          transactionCost = ethers.formatEther(cost);
        }
      }

      if (!skipLogging) {
        if (isTransactionSuccessful) {
          console.log("✅ 交易执行成功！");
          if (gasUsed) console.log("  Gas 使用量:", gasUsed.toString());
          if (effectiveGasPrice)
            console.log(
              "  实际 Gas 价格:",
              ethers.formatUnits(effectiveGasPrice, "gwei"),
              "Gwei"
            );
          if (transactionCost)
            console.log("  交易费用:", transactionCost, "ETH");
        } else if (isReverted) {
          console.log("❌ 交易已上链但执行失败（回滚）");
          if (transactionCost)
            console.log("  消耗费用:", transactionCost, "ETH");
        }
        console.log("Receipt:", receipt);
        console.log("===============================");
      }

      return {
        hash: tx.hash,
        receipt,
        error: null,
        isError: false,
        isSuccess: true,
        isConfirmed,
        isTransactionSuccessful,
        isReverted,
        gasUsed,
        effectiveGasPrice,
        transactionCost,
        gasEstimation,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (!skipLogging) {
        console.error(`💥 交易发送失败: ${functionName}`);
        console.error("Error:", err);
        console.error("===============================");
      }

      return {
        hash: null,
        receipt: null,
        error: err,
        isError: true,
        isSuccess: false,
        isConfirmed: false,
        isTransactionSuccessful: false,
        isReverted: false,
        gasUsed: undefined,
        effectiveGasPrice: undefined,
        transactionCost: undefined,
        gasEstimation,
      };
    }
  }

  /**
   * 📡 监听合约事件
   *
   * @param options 事件监听选项
   * @param callback 事件回调函数
   * @returns 取消监听的函数
   *
   * @example
   * ```typescript
   * const removeListener = EthersContractService.addEventListener({
   *   contractAddress: '0x...',
   *   contractAbi: abi,
   *   eventName: 'Transfer',
   *   filters: { from: userAddress }
   * }, (event) => {
   *   console.log('Transfer事件:', event);
   * });
   *
   * // 取消监听
   * removeListener();
   * ```
   */
  static addEventListener(
    options: EventListenerOptions,
    callback: (event: ethers.Log) => void
  ): () => void {
    const {
      contractAddress,
      contractAbi,
      eventName,
      filters = {},
      provider,
    } = options;

    const ethersProvider = getProvider(provider);
    const contract = new ethers.Contract(
      contractAddress,
      contractAbi,
      ethersProvider
    );

    // 创建事件监听器
    const listener = (...args: unknown[]) => {
      // 最后一个参数通常是事件对象
      const event = args[args.length - 1] as ethers.Log;
      callback(event);
    };

    // 添加监听器
    contract.on(eventName, listener);

    console.log(
      `📡 开始监听事件 ${eventName} 在合约 ${contractAddress}${Object.keys(filters).length > 0 ? " (带过滤器)" : ""}`
    );

    // 返回取消监听的函数
    return () => {
      contract.off(eventName, listener);
      console.log(`🔇 停止监听事件 ${eventName}`);
    };
  }

  /**
   * 📡 获取历史事件
   *
   * @param options 事件查询选项
   * @returns 事件数组
   *
   * @example
   * ```typescript
   * const events = await EthersContractService.getEvents({
   *   contractAddress: '0x...',
   *   contractAbi: abi,
   *   eventName: 'Transfer',
   *   filters: { from: userAddress },
   *   fromBlock: 'earliest',
   *   toBlock: 'latest'
   * });
   * ```
   */
  static async getEvents(options: EventListenerOptions): Promise<ethers.Log[]> {
    const {
      contractAddress,
      contractAbi,
      eventName,
      filters = {},
      fromBlock = "latest",
      toBlock = "latest",
      provider,
    } = options;

    try {
      const ethersProvider = getProvider(provider);
      const contract = new ethers.Contract(
        contractAddress,
        contractAbi,
        ethersProvider
      );

      // 创建事件过滤器
      const eventFilter = contract.filters[eventName](
        ...Object.values(filters)
      );

      // 查询事件
      const events = await contract.queryFilter(
        eventFilter,
        fromBlock,
        toBlock
      );

      console.log(`📡 找到 ${events.length} 个 ${eventName} 事件`);

      return events;
    } catch (error) {
      console.error(`❌ 获取事件失败:`, error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * 🔗 批量多合约调用
   *
   * @param calls 批量调用配置数组（支持不同合约）
   * @returns 批量调用结果
   *
   * @example
   * ```typescript
   * const calls = [
   *   { contractAddress: '0x...', contractAbi: abi1, functionName: 'balanceOf', args: [user] },
   *   { contractAddress: '0x...', contractAbi: abi2, functionName: 'totalSupply', args: [] }
   * ];
   * const results = await EthersContractService.multiContractRead(calls);
   * ```
   */
  static async multiContractRead(
    calls: BatchCall[],
    provider?: ethers.Provider
  ): Promise<ContractReadResult<unknown>[]> {
    console.log(`🔗 开始多合约批量调用 ${calls.length} 个方法`);

    // 转换为统一的调用格式
    const readCalls = calls.map((call) => ({
      ...call,
      skipLogging: true,
      provider,
    }));

    return this.batchRead(readCalls);
  }
}

// 导出便捷方法
export const ethersContract = EthersContractService;

/**
 * 🎯 便捷函数：读取单个合约方法
 */
export async function readContract<T = unknown>(
  contractAddress: string,
  contractAbi: ethers.InterfaceAbi,
  functionName: string,
  args: readonly unknown[] = [],
  skipLogging = false,
  provider?: ethers.Provider
): Promise<T | null> {
  const result = await EthersContractService.read<T>({
    contractAddress,
    contractAbi,
    functionName,
    args,
    skipLogging,
    provider,
  });

  return result.data;
}

/**
 * 🎯 便捷函数：批量读取合约方法
 */
export async function readContractBatch(
  contractAddress: string,
  contractAbi: ethers.InterfaceAbi,
  calls: {
    functionName: string;
    args?: readonly unknown[];
  }[],
  provider?: ethers.Provider
): Promise<unknown[]> {
  // 为每个 call 添加必需的合约信息
  const callsWithContract = calls.map((call) => ({
    contractAddress,
    contractAbi,
    functionName: call.functionName,
    args: call.args,
    provider,
  }));

  const results = await EthersContractService.batchRead(callsWithContract);
  return results.map((r) => r.data);
}

/**
 * 🎯 便捷函数：写入合约方法
 */
export async function writeContract(
  contractAddress: string,
  contractAbi: ethers.InterfaceAbi,
  functionName: string,
  args: readonly unknown[] = [],
  options: Omit<
    ContractWriteOptions,
    "contractAddress" | "contractAbi" | "functionName" | "args"
  > = {}
): Promise<ContractWriteResult> {
  return EthersContractService.write({
    contractAddress,
    contractAbi,
    functionName,
    args,
    ...options,
  });
}

/**
 * 🎯 便捷函数：估算 Gas 费用
 */
export async function estimateContractGas(
  contractAddress: string,
  contractAbi: ethers.InterfaceAbi,
  functionName: string,
  args: readonly unknown[] = [],
  value?: string | bigint,
  provider?: ethers.Provider
): Promise<GasEstimation> {
  return EthersContractService.estimateGas({
    contractAddress,
    contractAbi,
    functionName,
    args,
    value,
    provider,
  });
}

/**
 * 🎯 便捷函数：监听合约事件
 */
export function listenToContractEvent(
  contractAddress: string,
  contractAbi: ethers.InterfaceAbi,
  eventName: string,
  callback: (event: ethers.Log) => void,
  filters?: Record<string, unknown>,
  provider?: ethers.Provider
): () => void {
  return EthersContractService.addEventListener(
    {
      contractAddress,
      contractAbi,
      eventName,
      filters,
      provider,
    },
    callback
  );
}

/**
 * 🎯 便捷函数：获取历史事件
 */
export async function getContractEvents(
  contractAddress: string,
  contractAbi: ethers.InterfaceAbi,
  eventName: string,
  filters?: Record<string, unknown>,
  fromBlock: number | string = "latest",
  toBlock: number | string = "latest",
  provider?: ethers.Provider
): Promise<ethers.Log[]> {
  return EthersContractService.getEvents({
    contractAddress,
    contractAbi,
    eventName,
    filters,
    fromBlock,
    toBlock,
    provider,
  });
}

// ==================== 工具函数 ====================

/**
 * 💰 格式化 Wei 为 ETH
 */
export function formatEther(value: bigint | string): string {
  return ethers.formatEther(value);
}

/**
 * 💰 解析 ETH 为 Wei
 */
export function parseEther(value: string): bigint {
  return ethers.parseEther(value);
}

/**
 * 💰 格式化 Gas 价格（Gwei）
 */
export function formatGasPrice(gasPrice: bigint): string {
  return ethers.formatUnits(gasPrice, "gwei") + " Gwei";
}

/**
 * 💰 解析 Gwei 为 Wei
 */
export function parseGwei(value: string): bigint {
  return ethers.parseUnits(value, "gwei");
}

/**
 * 🔗 检查合约地址是否有效
 */
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * 🔗 获取合约代码大小（判断是否为合约）
 */
export async function isContract(
  address: string,
  provider?: ethers.Provider
): Promise<boolean> {
  try {
    const ethersProvider = getProvider(provider);
    const code = await ethersProvider.getCode(address);
    return code !== "0x";
  } catch {
    return false;
  }
}

/**
 * ⏱️ 等待指定的区块数
 */
export async function waitForBlocks(
  blockCount: number,
  provider?: ethers.Provider
): Promise<void> {
  const ethersProvider = getProvider(provider);
  const startBlock = await ethersProvider.getBlockNumber();
  const targetBlock = startBlock + blockCount;

  return new Promise((resolve) => {
    const checkBlock = async () => {
      const currentBlock = await ethersProvider.getBlockNumber();
      if (currentBlock >= targetBlock) {
        resolve();
      } else {
        setTimeout(checkBlock, 1000); // 每秒检查一次
      }
    };
    checkBlock();
  });
}

/**
 * 📊 获取网络统计信息
 */
export async function getNetworkStats(provider?: ethers.Provider): Promise<{
  blockNumber: number;
  gasPrice: string;
  chainId: number;
}> {
  const ethersProvider = getProvider(provider);

  const [blockNumber, feeData, network] = await Promise.all([
    ethersProvider.getBlockNumber(),
    ethersProvider.getFeeData(),
    ethersProvider.getNetwork(),
  ]);

  return {
    blockNumber,
    gasPrice: feeData.gasPrice ? formatGasPrice(feeData.gasPrice) : "Unknown",
    chainId: Number(network.chainId),
  };
}

// ==================== 合约包装器类 ====================

/**
 * 🎯 合约包装器类
 *
 * 为特定合约创建专用实例，预配置合约地址和 ABI
 * 提供更简洁的 API，无需每次传递合约配置
 *
 * @example
 * ```typescript
 * import contract from "@/app/abi/MultiStakePledgeContract.json";
 *
 * // 创建专用合约包装器
 * const multiStakeContract = new ContractWrapper({
 *   contractAddress: "0x123...",
 *   contractAbi: contract.abi,
 *   contractName: "MultiStakePledge"
 * });
 *
 * // 简洁的读取调用
 * const poolCount = await multiStakeContract.read<number>('poolCount');
 * const poolInfo = await multiStakeContract.read('getPoolInfo', [poolId]);
 *
 * // 简洁的写入调用
 * const result = await multiStakeContract.write('stake', [poolId], {
 *   value: ethers.parseEther('1.0'),
 *   estimateGas: true
 * });
 * ```
 */
export class ContractWrapper {
  private config: ContractWrapperConfig;

  constructor(config: ContractWrapperConfig) {
    this.config = config;

    if (!this.config.contractAddress) {
      throw new Error("Contract address is required");
    }

    if (!this.config.contractAbi) {
      throw new Error("Contract ABI is required");
    }

    console.log(
      `🎯 创建合约包装器: ${this.config.contractName || "Unknown Contract"} (${this.config.contractAddress})`
    );
  }

  /**
   * 📖 读取合约数据
   *
   * @template T 返回数据类型
   * @param functionName 函数名称
   * @param args 函数参数（可选）
   * @param options 额外配置（可选）
   * @returns 读取结果
   */
  async read<T = unknown>(
    functionName: string,
    args?: readonly unknown[],
    options?: Partial<
      Omit<
        ContractReadOptions,
        "contractAddress" | "contractAbi" | "functionName" | "args"
      >
    >
  ): Promise<T | null> {
    const result = await EthersContractService.read<T>({
      contractAddress: this.config.contractAddress,
      contractAbi: this.config.contractAbi,
      functionName,
      args: args || [],
      ...options,
    });

    if (result.isError) {
      throw result.error;
    }

    return result.data;
  }

  /**
   * 📝 写入合约数据
   *
   * @param functionName 函数名称
   * @param args 函数参数（可选）
   * @param options 交易配置（可选）
   * @returns 写入结果
   */
  async write(
    functionName: string,
    args?: readonly unknown[],
    options?: Partial<
      Omit<
        ContractWriteOptions,
        "contractAddress" | "contractAbi" | "functionName" | "args"
      >
    >
  ): Promise<ContractWriteResult> {
    return EthersContractService.write({
      contractAddress: this.config.contractAddress,
      contractAbi: this.config.contractAbi,
      functionName,
      args: args || [],
      ...options,
    });
  }

  /**
   * 💰 估算 Gas 费用
   *
   * @param functionName 函数名称
   * @param args 函数参数（可选）
   * @param options 额外配置（可选）
   * @returns Gas 估算结果
   */
  async estimateGas(
    functionName: string,
    args?: readonly unknown[],
    options?: Partial<
      Omit<
        ContractWriteOptions,
        "contractAddress" | "contractAbi" | "functionName" | "args" | "signer"
      >
    >
  ): Promise<GasEstimation> {
    return EthersContractService.estimateGas({
      contractAddress: this.config.contractAddress,
      contractAbi: this.config.contractAbi,
      functionName,
      args: args || [],
      ...options,
    });
  }

  /**
   * 📡 监听合约事件
   *
   * @param eventName 事件名称
   * @param callback 事件回调函数
   * @param filters 事件过滤器（可选）
   * @param provider Provider 实例（可选）
   * @returns 取消监听的函数
   */
  addEventListener(
    eventName: string,
    callback: (event: ethers.Log) => void,
    filters?: Record<string, unknown>,
    provider?: ethers.Provider
  ): () => void {
    return EthersContractService.addEventListener(
      {
        contractAddress: this.config.contractAddress,
        contractAbi: this.config.contractAbi,
        eventName,
        filters,
        provider,
      },
      callback
    );
  }

  /**
   * 📡 获取历史事件
   *
   * @param eventName 事件名称
   * @param filters 事件过滤器（可选）
   * @param fromBlock 开始区块（可选）
   * @param toBlock 结束区块（可选）
   * @param provider Provider 实例（可选）
   * @returns 事件数组
   */
  async getEvents(
    eventName: string,
    filters?: Record<string, unknown>,
    fromBlock?: number | string,
    toBlock?: number | string,
    provider?: ethers.Provider
  ): Promise<ethers.Log[]> {
    return EthersContractService.getEvents({
      contractAddress: this.config.contractAddress,
      contractAbi: this.config.contractAbi,
      eventName,
      filters,
      fromBlock,
      toBlock,
      provider,
    });
  }

  /**
   * 🔄 批量读取合约数据
   *
   * @param calls 批量调用配置数组
   * @returns 批量读取结果数组
   */
  async batchRead(
    calls: {
      functionName: string;
      args?: readonly unknown[];
    }[]
  ): Promise<ContractReadResult<unknown>[]> {
    const batchCalls = calls.map((call) => ({
      contractAddress: this.config.contractAddress,
      contractAbi: this.config.contractAbi,
      functionName: call.functionName,
      args: call.args || [],
    }));

    return EthersContractService.batchRead(batchCalls);
  }

  /**
   * ℹ️ 获取合约配置信息
   */
  getConfig(): Readonly<ContractWrapperConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * 🔗 获取合约地址
   */
  get address(): string {
    return this.config.contractAddress;
  }

  /**
   * 📋 获取合约 ABI
   */
  get abi(): ethers.InterfaceAbi {
    return this.config.contractAbi;
  }

  /**
   * 🏷️ 获取合约名称
   */
  get name(): string {
    return this.config.contractName || "Unknown Contract";
  }

  /**
   * 🔧 私有方法：合并交易选项
   * @param options 用户提供的选项
   * @param defaults 默认选项
   */
  private mergeWriteOptions(
    options?: Partial<
      Omit<
        ContractWriteOptions,
        "contractAddress" | "contractAbi" | "functionName" | "args"
      >
    >,
    defaults: Record<string, unknown> = {}
  ) {
    return {
      estimateGas: options?.estimateGas ?? true,
      timeout: options?.timeout,
      signer: options?.signer,
      gasLimit: options?.gasLimit,
      gasPrice: options?.gasPrice,
      maxPriorityFeePerGas: options?.maxPriorityFeePerGas,
      maxFeePerGas: options?.maxFeePerGas,
      value: options?.value,
      skipLogging: options?.skipLogging,
      provider: options?.provider,
      ...defaults,
    };
  }

  /**
   * ✍️ 统一的写入方法，简化合约写入操作
   * @param functionName 合约函数名
   * @param args 函数参数
   * @param options 交易选项
   * @returns 写入结果
   */
  async executeWrite(
    functionName: string,
    args?: readonly unknown[],
    options?: Partial<
      Omit<
        ContractWriteOptions,
        "contractAddress" | "contractAbi" | "functionName" | "args"
      >
    >
  ): Promise<ContractWriteResult> {
    return this.write(functionName, args, this.mergeWriteOptions(options));
  }

  /**
   * ✍️ 带状态跟踪的写入方法，支持回调函数
   * @param functionName 合约函数名
   * @param args 函数参数
   * @param options 扩展交易选项（包含回调函数）
   * @returns 写入结果
   */
  async executeWriteWithStatus(
    functionName: string,
    args?: readonly unknown[],
    options?: Partial<
      Omit<
        ExtendedContractWriteOptions,
        "contractAddress" | "contractAbi" | "functionName" | "args"
      >
    >
  ): Promise<ContractWriteResult> {
    try {
      // 触发待处理状态
      options?.onPending?.();

      // 执行写入
      const result = await this.write(
        functionName,
        args,
        this.mergeWriteOptions(options)
      );

      // 处理错误结果
      if (result.isError) {
        options?.onError?.(result.error!);
        return result;
      }

      // 触发已发送状态
      if (result.hash) {
        options?.onSent?.(result.hash);
      }

      // 如果有交易哈希，等待确认
      if (result.hash && !result.isConfirmed) {
        options?.onConfirming?.();
        // 这里可以添加等待确认的逻辑，如果需要的话
      }

      // 处理最终结果
      if (result.isConfirmed && result.receipt) {
        options?.onConfirmed?.(result.receipt);

        if (result.isTransactionSuccessful) {
          options?.onSuccess?.(result.receipt);
        } else if (result.isReverted) {
          options?.onReverted?.(result.receipt);
        }
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      options?.onError?.(err);

      return {
        hash: null,
        receipt: null,
        error: err,
        isError: true,
        isSuccess: false,
        isConfirmed: false,
        isTransactionSuccessful: false,
        isReverted: false,
      };
    }
  }
}

/**
 * 🏭 合约包装器工厂函数
 *
 * 快速创建合约包装器实例的便捷函数
 *
 * @param config 合约配置
 * @returns 合约包装器实例
 *
 * @example
 * ```typescript
 * import contract from "@/app/abi/MultiStakePledgeContract.json";
 *
 * const multiStakeContract = createContractWrapper({
 *   contractAddress: "0x123...",
 *   contractAbi: contract.abi,
 *   contractName: "MultiStakePledge"
 * });
 * ```
 */
export function createContractWrapper(
  config: ContractWrapperConfig
): ContractWrapper {
  return new ContractWrapper(config);
}

// ==================== 导出增强版服务 ====================

export const EnhancedEthersContract = EthersContractService;
