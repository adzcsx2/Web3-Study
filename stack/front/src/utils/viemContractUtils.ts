/**
 * 基于 Viem 的智能合约交互工具集（增强版 v3.2）
 *
 * 提供了一系列用于与智能合约进行读写操作的工具类。
 * 基于 Viem 库封装，提供类型安全、错误处理、统一写方法和状态跟踪功能。
 *
 * 🚀 核心功能：
 * - 合约读取操作（可在循环中使用）
 * - 合约写入操作（支持交易状态跟踪）
 * - 统一写方法处理（executeWrite / executeWriteWithStatus）
 *   └─ executeWrite: 简化的写入方法，自动处理 Gas 和选项合并
 *   └─ executeWriteWithStatus: 完整的状态跟踪，支持 7 种生命周期回调
 * - 交易状态回调系统（onPending, onSent, onConfirming, onConfirmed, onSuccess, onReverted, onError）
 * - 批量操作支持
 * - 交易超时处理
 * - Gas 费用估算
 * - 事件监听支持
 * - 可配置的日志记录和错误处理
 *
 * 🎯 新增特性（v3.0）：
 * ✨ executeWrite() - 统一的写方法处理，自动合并交易选项和 Gas 估算
 * ✨ executeWriteWithStatus() - 带完整状态跟踪的写方法，支持生命周期回调
 *   └─ onPending, onSent, onConfirming, onConfirmed, onSuccess, onReverted, onError
 * ✨ ExtendedContractWriteOptions - 扩展选项接口，支持交易状态回调
 * ✨ 消除代码重复 - 所有合约包装器共享统一的写方法逻辑
 *
 * 🔥 v3.1 优化特性：
 * ✨ 自动 PublicClient 管理 - 合约包装器内置 publicClient，无需手动传入
 * ✨ 便捷函数自动化 - 所有便捷函数自动创建 publicClient，开箱即用
 * ✨ 性能优化 - 合约包装器复用同一 publicClient 实例，减少连接开销
 * ✨ 网络状态访问 - 直接访问内置 publicClient 和链配置信息
 *
 * 🚀 v3.2 重大更新（RPC 频率控制 + 统一重试机制）：
 * ✨ RequestQueue 集成 - 所有 RPC 请求自动进入队列（200ms 间隔）
 * ✨ 统一重试机制 - 所有错误在 RequestQueue 中统一处理（最多 3 次）
 *   └─ 429 错误：指数退避（600ms → 1200ms → 1800ms）
 *   └─ 其他错误：固定延迟（1000ms）
 * ✨ 智能错误处理 - 自动识别 429、网络超时、节点故障等错误
 * ✨ 无缝集成 - 对业务代码透明，无需修改现有调用
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
 * ✅ 基于 Viem 的现代化 API 和类型安全
 *
 * @example
 * ```typescript
 * // 🔥 v3.1 新特性：自动管理 publicClient
 * const contract = createViemContractWrapper({
 *   contractAddress: "0x123...",
 *   contractAbi: abi,
 *   contractName: "MyContract"
 *   // publicClient 自动创建和管理，无需传入！
 * });
 *
 * // ✅ 读取操作 - 自动使用内置 publicClient
 * const balance = await contract.read('balanceOf', [userAddress]);
 * const networkStats = await contract.getNetworkStats();
 *
 * // ✅ 便捷函数 - 自动创建 publicClient
 * const poolCount = await readViemContract(address, abi, 'poolCounter');
 * // 无需传入 publicClient 参数！
 *
 * // ✅ 基础写入操作 - 自动处理 gas 估算
 * const result = await contract.write('transfer', [to, amount], {
 *   account: walletAccount,
 *   estimateGas: true // 自动估算 Gas 费用
 * });
 *
 * // 🎯 统一写入方法 - executeWrite（推荐）
 * const result2 = await contract.executeWrite('setPoolCount', [5n], {
 *   account: walletAccount,
 *   estimateGas: true,
 *   gas: 100000n
 * });
 *
 * // 🔄 带状态跟踪的写入 - executeWriteWithStatus（完整生命周期）
 * await contract.executeWriteWithStatus('stake', [poolId, amount], {
 *   account: walletAccount,
 *   value: parseEther('1.0'),
 *   estimateGas: true,
 *   // 状态回调函数
 *   onPending: () => console.log('🔄 交易准备中...'),
 *   onSent: (hash) => console.log('📤 交易已发送:', hash),
 *   onConfirming: () => console.log('⏳ 等待确认...'),
 *   onConfirmed: (receipt) => console.log('📋 交易已确认:', receipt.transactionHash),
 *   onSuccess: (receipt) => console.log('✅ 交易成功！Gas 使用:', receipt.gasUsed),
 *   onReverted: (receipt) => console.log('❌ 交易回滚:', receipt.status),
 *   onError: (error) => console.error('💥 交易失败:', error.message)
 * });
 *
 * // ✅ 批量操作 - 复用同一 publicClient 实例
 * const calls = [{functionName: 'getPoolInfo', args: [i]} for i in range(10)];
 * const results = await contract.batchRead(calls);
 * ```
 *
 * @author Hoyn
 * @version 3.2.0
 * @lastModified 2025-10-28
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  parseEther,
  formatUnits,
  parseUnits,
  isAddress,
  getContract,
  type Abi,
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient,
  type Account,
  type TransactionReceipt,
  type Log,
  type WriteContractParameters,
  type WatchContractEventParameters,
  type Chain,
} from "viem";
import { sepolia } from "viem/chains";
import { config as wagmiConfig, CONTRACT_CONFIG } from "@/config/wagmi";
import { RPC_URLS } from "@/config/rpc";
import { RequestQueue } from "@/http/requestQueue";
import { cache, hybridCache, jsonStringifyWithBigInt } from "@/utils/cache";

// ==================== 类型导出 ====================

export type {
  Abi,
  Address,
  Hash,
  PublicClient,
  WalletClient,
  Account,
  TransactionReceipt,
  Log,
  Chain,
} from "viem";

/**
 * 从共享 RPC 配置获取 wagmi 配置中链的 RPC URLs
 */
function getWagmiRpcUrls(): Record<number, string> {
  const rpcUrls: Record<number, string> = {};

  // 只为 wagmi 配置中实际存在的链添加 RPC URL
  for (const chain of wagmiConfig.chains) {
    const chainId = chain.id;
    if (RPC_URLS[chainId]) {
      rpcUrls[chainId] = RPC_URLS[chainId];
    } else {
      console.warn(
        `No RPC URL configured for chain ${chainId} (${chain.name})`
      );
      // 可以尝试使用链的默认 RPC URL
      rpcUrls[chainId] =
        chain.rpcUrls.default.http[0] ||
        `https://rpc.${chain.name.toLowerCase()}.com`;
    }
  }

  return rpcUrls;
}

/**
 * Viem 配置 - 基于 wagmi 配置
 */
export const VIEM_CONFIG = {
  // 网络配置 - 使用 wagmi 配置中的 chains
  chains: Object.fromEntries(
    wagmiConfig.chains.map((chain) => [
      chain.name.toLowerCase().replace(/\s+/g, ""),
      chain,
    ])
  ) as Record<string, Chain>,

  // 获取所有支持的链
  supportedChains: wagmiConfig.chains,

  // 获取 wagmi 配置中的 transports
  getTransport: (chainId: number) => {
    const transports = wagmiConfig._internal.transports as Record<
      number,
      unknown
    >;
    return transports[chainId];
  },

  // RPC 配置 - 从 wagmi 配置中提取
  rpcUrls: getWagmiRpcUrls(),

  // 默认网络 - 使用 sepolia 如果可用，否则使用第一个链
  defaultChain:
    wagmiConfig.chains.find((chain) => chain.id === sepolia.id) ||
    wagmiConfig.chains[0],

  // 合约设置 - 使用 wagmi 配置中的 CONTRACT_CONFIG
  contract: {
    // 默认的 Gas 设置
    defaultGasLimit: BigInt(CONTRACT_CONFIG.defaultGasLimit),
    defaultGasPrice: BigInt(CONTRACT_CONFIG.defaultGasPrice),

    // 重试设置
    defaultRetryCount: CONTRACT_CONFIG.defaultRetryCount,
    defaultRetryDelay: CONTRACT_CONFIG.defaultRetryDelay,

    // 日志设置
    enableLogging: CONTRACT_CONFIG.enableLogging,

    // 交易确认设置
    confirmations: CONTRACT_CONFIG.confirmations,
    timeout: CONTRACT_CONFIG.timeout,
  },

  // 🆕 缓存设置
  cache: {
    // 是否启用缓存（默认启用）
    enabled: true,

    // 缓存存储类型
    // 'memory': 内存缓存（页面刷新后丢失，默认）
    // 'hybrid': 混合缓存（内存+localStorage，页面刷新后保留）
    // storageType: "memory" as "memory" | "hybrid",
    //默认缓存为hybrid
    storageType: "hybrid",

    // 默认缓存时间（秒）- 300秒
    defaultTTL: 300,

    // 不同类型数据的缓存时间（秒）
    ttlByType: {
      // 静态数据（很少变化）- 5分钟
      static: 300,
      // 半静态数据（偶尔变化）- 1分钟
      semiStatic: 60,
      // 动态数据（经常变化）- 30秒
      dynamic: 30,
      // 实时数据（快速变化）- 10秒
      realtime: 10,
    },

    // 缓存键前缀
    keyPrefix: "viem:contract",
  },
};

/**
 * 合约读取操作的配置选项
 */
export interface ViemContractReadOptions {
  /** 合约地址 */
  contractAddress: Address;
  /** 合约 ABI */
  contractAbi: Abi;
  /** 要调用的合约函数名称 */
  functionName: string;
  /** 传递给合约函数的参数数组 */
  args?: readonly unknown[];
  /** 区块号或标签 */
  blockNumber?: bigint | "latest" | "earliest" | "pending";
  /** 是否跳过日志输出，默认为 false */
  skipLogging?: boolean;
  /** 可选的 PublicClient */
  publicClient?: PublicClient;
  /** 链配置 */
  chain?: Chain;
  /** 🆕 是否启用缓存，默认为 true */
  useCache?: boolean;
  /** 🆕 缓存时间（秒），不指定则使用默认值 */
  cacheTTL?: number;
  /** 🆕 缓存类型（用于自动选择合适的 TTL） */
  cacheType?: "static" | "semiStatic" | "dynamic" | "realtime";
  /** 🆕 强制刷新缓存 */
  forceRefresh?: boolean;
}

/**
 * 合约读取操作的返回结果
 */
export interface ViemContractReadResult<T> {
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
export interface ViemContractWriteOptions {
  /** 合约地址 */
  contractAddress: Address;
  /** 合约 ABI */
  contractAbi: Abi;
  /** 要调用的合约函数名称 */
  functionName: string;
  /** 传递给合约函数的参数数组 */
  args?: readonly unknown[];
  /** 要发送的以太币数量（wei 单位） */
  value?: bigint;
  /** Gas limit */
  gas?: bigint;
  /** Gas price (Legacy transactions) */
  gasPrice?: bigint;
  /** 最大优先费用（EIP-1559） */
  maxPriorityFeePerGas?: bigint;
  /** 最大费用（EIP-1559） */
  maxFeePerGas?: bigint;
  /** 是否自动估算 Gas，默认为 false */
  estimateGas?: boolean;
  /** 交易超时时间（毫秒），默认为 300000 (5分钟) */
  timeout?: number;
  /** 是否跳过日志输出，默认为 false */
  skipLogging?: boolean;
  /** 必需的钱包账户 */
  account?: Account;
  /** 可选的 WalletClient */
  walletClient?: WalletClient;
  /** 可选的 PublicClient */
  publicClient?: PublicClient;
  /** 链配置 */
  chain?: Chain;
  /** Nonce */
  nonce?: number;
}

/**
 * 扩展的合约写入选项，支持状态回调
 */
export interface ExtendedViemContractWriteOptions
  extends ViemContractWriteOptions {
  /** 交易待处理时的回调 */
  onPending?: () => void;
  /** 交易已发送时的回调（返回交易哈希） */
  onSent?: (hash: Hash) => void;
  /** 交易确认中的回调 */
  onConfirming?: () => void;
  /** 交易确认完成的回调 */
  onConfirmed?: (receipt: TransactionReceipt) => void;
  /** 交易成功完成的回调 */
  onSuccess?: (receipt: TransactionReceipt) => void;
  /** 交易回滚的回调 */
  onReverted?: (receipt: TransactionReceipt) => void;
  /** 交易错误的回调 */
  onError?: (error: Error) => void;
}

/**
 * Gas 估算结果
 */
export interface ViemGasEstimation {
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
export interface ViemEventListenerOptions {
  /** 合约地址 */
  contractAddress: Address;
  /** 合约 ABI */
  contractAbi: Abi;
  /** 事件名称 */
  eventName: string;
  /** 事件过滤器参数 */
  args?: Record<string, unknown>;
  /** 从哪个区块开始监听 */
  fromBlock?: bigint | "latest" | "earliest" | "pending";
  /** 到哪个区块结束监听 */
  toBlock?: bigint | "latest" | "earliest" | "pending";
  /** 可选的 PublicClient */
  publicClient?: PublicClient;
  /** 链配置 */
  chain?: Chain;
}

/**
 * 批量调用配置
 */
export interface ViemBatchCall {
  /** 合约地址 */
  contractAddress: Address;
  /** 合约 ABI */
  contractAbi: Abi;
  /** 函数名称 */
  functionName: string;
  /** 函数参数 */
  args?: readonly unknown[];
}

/**
 * 合约写入操作的返回结果
 */
export interface ViemContractWriteResult {
  /** 交易哈希 */
  hash: Hash | null;
  /** 交易收据 */
  receipt: TransactionReceipt | null;
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
  gasEstimation?: ViemGasEstimation;
}

/**
 * 获取 PublicClient
 */
function getPublicClient(
  publicClient?: PublicClient,
  chain: Chain = VIEM_CONFIG.defaultChain
): PublicClient {
  // 优先使用传入的 publicClient
  if (publicClient) {
    return publicClient;
  }

  // 获取对应链的 RPC URL
  const rpcUrl = VIEM_CONFIG.rpcUrls[chain.id];
  if (!rpcUrl) {
    throw new Error(`No RPC URL configured for chain ${chain.id}`);
  }

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

/**
 * 获取 WalletClient
 */
function getWalletClient(
  walletClient?: WalletClient,
  chain: Chain = VIEM_CONFIG.defaultChain
): WalletClient {
  if (walletClient) {
    return walletClient;
  }

  // 注意: 如果需要自动获取已连接的钱包客户端，
  // 请在调用时传入 walletClient 参数，或使用专门的钱包客户端 Hook

  // 如果在浏览器环境且有 window.ethereum（降级方案）
  if (typeof window !== "undefined" && window.ethereum) {
    const rpcUrl = VIEM_CONFIG.rpcUrls[chain.id];
    return createWalletClient({
      chain,
      transport: http(rpcUrl),
    });
  }

  throw new Error(
    "No wallet client available. Please provide a wallet client or connect to a wallet using the wallet connection interface."
  );
}

/**
 * 合约包装器配置接口
 */
export interface ViemContractWrapperConfig {
  /** 合约地址 */
  contractAddress: Address;
  /** 合约 ABI */
  contractAbi: Abi;
  /** 合约名称（可选，用于日志） */
  contractName?: string;
  /** 链配置 */
  chain?: Chain;
}

/**
 * 基于 Viem 的合约服务类
 */
export class ViemContractService {
  /**
   * 用于控制 RPC 请求频率的队列（200ms 间隔）
   * 防止 429 Too Many Requests 错误
   *
   * Infura 免费版限制: 100 rps (滑动窗口)
   * 推荐间隔: 150-200ms（考虑突发请求和滑动窗口特性）
   */
  private static readonly requestQueue = new RequestQueue(200);

  /**
   * 获取全局请求队列实例（仅供内部管理使用）
   */
  static getRequestQueue(): RequestQueue {
    return this.requestQueue;
  }

  /**
   * 🔑 生成缓存键
   *
   * @param contractAddress 合约地址
   * @param functionName 函数名
   * @param args 函数参数
   * @param chainId 链 ID
   * @param blockNumber 区块号（可选）
   * @returns 缓存键
   */
  private static generateCacheKey(
    contractAddress: Address,
    functionName: string,
    args: readonly unknown[],
    chainId: number,
    blockNumber?: bigint | "latest" | "earliest" | "pending"
  ): string {
    const argsKey = args.length > 0 ? jsonStringifyWithBigInt(args) : "noargs";
    const hasBlockNumber = blockNumber !== undefined;
    const normalizedBlockNumber = hasBlockNumber
      ? typeof blockNumber === "bigint"
        ? `${blockNumber.toString()}n`
        : blockNumber
      : "";
    const blockKey = hasBlockNumber ? `_block:${normalizedBlockNumber}` : "";
    return `${VIEM_CONFIG.cache.keyPrefix}:${chainId}:${contractAddress}:${functionName}:${argsKey}${blockKey}`;
  }

  /**
   * 🕐 获取缓存 TTL
   *
   * @param options 读取选项
   * @returns TTL（秒）
   */
  private static getCacheTTL(options: ViemContractReadOptions): number {
    // 如果指定了 cacheTTL，直接使用
    if (options.cacheTTL !== undefined) {
      return options.cacheTTL;
    }

    // 根据 cacheType 选择对应的 TTL
    if (options.cacheType) {
      return VIEM_CONFIG.cache.ttlByType[options.cacheType];
    }

    // 使用默认 TTL
    return VIEM_CONFIG.cache.defaultTTL;
  }

  /**
   * 读取合约数据的基础方法
   *
   * @template T 返回数据的类型
   * @param options 配置选项
   * @returns 合约读取结果
   *
   * @example
   * ```typescript
   * const result = await ViemContractService.read<string>({
   *   contractAddress: '0x...',
   *   contractAbi: abi,
   *   functionName: 'name',
   *   args: []
   * });
   * ```
   */
  static async read<T = unknown>(
    options: ViemContractReadOptions
  ): Promise<ViemContractReadResult<T>> {
    // 使用请求队列进行请求，以控制频率
    return this.requestQueue.add(() => this.readInternal<T>(options));
  }

  /**
   * 内部读取方法（由请求队列调用）
   *
   * 注意：重试逻辑已移至 RequestQueue，此方法只执行一次实际调用
   * 🆕 现在支持缓存功能
   */
  private static async readInternal<T = unknown>(
    options: ViemContractReadOptions
  ): Promise<ViemContractReadResult<T>> {
    const {
      contractAddress,
      contractAbi,
      functionName,
      args = [],
      blockNumber,
      skipLogging = !VIEM_CONFIG.contract.enableLogging,
      publicClient,
      chain = VIEM_CONFIG.defaultChain,
      useCache = VIEM_CONFIG.cache.enabled,
      forceRefresh = false,
    } = options;

    // 验证合约地址
    if (!isAddress(contractAddress)) {
      const error = new Error("Invalid contract address");
      return { data: null, error, isError: true, isSuccess: false };
    }

    // 🔑 生成缓存键
    const cacheKey = this.generateCacheKey(
      contractAddress,
      functionName,
      args,
      chain.id,
      blockNumber
    );

    // 🔍 尝试从缓存获取（如果启用且非强制刷新）
    if (useCache && !forceRefresh) {
      // 根据配置选择缓存存储
      const cacheStore =
        VIEM_CONFIG.cache.storageType === "hybrid" ? hybridCache : cache;
      const cachedResult = cacheStore.get<ViemContractReadResult<T>>(cacheKey);
      if (cachedResult !== null) {
        if (!skipLogging) {
          console.log(
            `💾 缓存命中: ${functionName} (${contractAddress}) [${VIEM_CONFIG.cache.storageType}]`
          );
        }
        return cachedResult;
      }
    }

    try {
      if (!skipLogging) {
        console.log(`=== Viem Contract ${functionName} Call ===`);
        console.log("Contract Address:", contractAddress);
        console.log("Function Name:", functionName);
        console.log("Arguments:", args);
        console.log("Chain:", chain.name);
        console.log(
          "Cache:",
          useCache ? `Enabled (TTL: ${this.getCacheTTL(options)}s)` : "Disabled"
        );
      }

      const client = getPublicClient(publicClient, chain);

      const contract = getContract({
        address: contractAddress,
        abi: contractAbi,
        client,
      });

      const readOptions = {
        blockNumber,
      };

      // 执行合约读取
      const data = (await (
        contract.read as Record<
          string,
          (...args: unknown[]) => Promise<unknown>
        >
      )[functionName](args.length > 0 ? args : undefined, readOptions)) as T;

      const result: ViemContractReadResult<T> = {
        data,
        error: null,
        isError: false,
        isSuccess: true,
      };

      // 💾 存储到缓存（如果启用）
      if (useCache) {
        const ttl = this.getCacheTTL(options);
        // 根据配置选择缓存存储
        const cacheStore =
          VIEM_CONFIG.cache.storageType === "hybrid" ? hybridCache : cache;
        cacheStore.set(cacheKey, result, ttl);

        if (!skipLogging) {
          console.log(
            `💾 已缓存结果 (TTL: ${ttl}秒) [${VIEM_CONFIG.cache.storageType}]`
          );
        }
      }

      if (!skipLogging) {
        console.log("✅ Call Success");
        console.log("Data:", data);
        console.log("===============================");
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (!skipLogging) {
        console.error(`❌ Call Failed:`, err);
        console.log("===============================");
      }

      return {
        data: null,
        error: err,
        isError: true,
        isSuccess: false,
      };
    }
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
   *   calls.push({
   *     contractAddress: '0x...',
   *     contractAbi: abi,
   *     functionName: 'getPoolInfo',
   *     args: [i]
   *   });
   * }
   * const results = await ViemContractService.batchRead(calls);
   * ```
   */
  static async batchRead(
    calls: Omit<ViemContractReadOptions, "retryCount" | "retryDelay">[]
  ): Promise<ViemContractReadResult<unknown>[]> {
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
   *   const result = await ViemContractService.readSequential({
   *     contractAddress: '0x...',
   *     contractAbi: abi,
   *     functionName: 'getPoolInfo',
   *     args: [i]
   *   });
   *   results.push(result);
   * }
   * ```
   */
  static async readSequential(
    options: ViemContractReadOptions
  ): Promise<ViemContractReadResult<unknown>> {
    return this.read(options);
  }

  /**
   * 💰 估算 Gas 费用
   *
   * @param options 合约写入选项（不包含 account）
   * @returns Gas 估算结果
   *
   * @example
   * ```typescript
   * const estimation = await ViemContractService.estimateGas({
   *   contractAddress: '0x...',
   *   contractAbi: abi,
   *   functionName: 'stake',
   *   args: [parseEther('1.0')],
   *   value: parseEther('1.0')
   * });
   * console.log(`估算费用: ${estimation.estimatedCost} ETH`);
   * ```
   */
  static async estimateGas(
    options: Omit<ViemContractWriteOptions, "walletClient">
  ): Promise<ViemGasEstimation> {
    // 使用请求队列进行请求，以控制频率
    return this.requestQueue.add(() => this.estimateGasInternal(options));
  }

  /**
   * 内部 Gas 估算方法（由请求队列调用）
   */
  private static async estimateGasInternal(
    options: Omit<ViemContractWriteOptions, "walletClient">
  ): Promise<ViemGasEstimation> {
    const {
      contractAddress,
      contractAbi,
      functionName,
      args = [],
      value,
      publicClient,
      chain = VIEM_CONFIG.defaultChain,
      account,
    } = options;

    try {
      const client = getPublicClient(publicClient, chain);

      // 使用 client 进行 Gas 估算
      const estimatedGasLimit = await client.estimateContractGas({
        address: contractAddress,
        abi: contractAbi,
        functionName,
        args: args.length > 0 ? args : undefined,
        value,
        account,
      });

      // 获取当前费用数据
      const feeData = await client.estimateFeesPerGas();

      let estimatedCost: string;
      let gasPrice: bigint | undefined;
      let maxFeePerGas: bigint | undefined;
      let maxPriorityFeePerGas: bigint | undefined;

      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        // EIP-1559 (Type 2) 交易
        maxFeePerGas = feeData.maxFeePerGas;
        maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        const totalCost = estimatedGasLimit * maxFeePerGas;
        estimatedCost = formatEther(totalCost);
      } else {
        // Legacy (Type 0) 交易
        gasPrice = await client.getGasPrice();
        const totalCost = estimatedGasLimit * gasPrice;
        estimatedCost = formatEther(totalCost);
      }

      return {
        gasLimit: estimatedGasLimit,
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas,
        estimatedCost,
      };
    } catch (error) {
      // 详细的错误诊断
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // 转换 args 中的 BigInt 为字符串，以便 JSON 序列化
      const argsForLogging = args.map((arg) =>
        typeof arg === "bigint" ? arg.toString() : arg
      );

      const errorDetails = {
        timestamp: new Date().toISOString(),
        functionName,
        contractAddress,
        args: argsForLogging,
        error: errorMessage,
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
      };

      console.error("❌ Gas 估算失败 - 详细信息:");
      console.error(JSON.stringify(errorDetails, null, 2));

      // 如果是合约 revert，提供额外建议
      if (
        errorMessage.includes("reverted") ||
        errorMessage.includes("revert")
      ) {
        console.error("\n💡 诊断建议:");
        console.error(
          "  1. 检查池子 ID 是否存在和活跃 (使用 poolExists/isPoolActive)"
        );
        console.error(
          "  2. 检查池子是否在质押期间 (startTime < now < endTime)"
        );
        console.error("  3. 验证质押金额是否满足最小要求");
        console.error("  4. 检查合约是否暂停 (isPaused)");
        console.error("  5. 检查用户是否被黑名单 (isBlacklisted)");
        console.error("  6. 检查账户余额是否足够");
      }

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
   * const result = await ViemContractService.write({
   *   contractAddress: '0x...',
   *   contractAbi: abi,
   *   functionName: 'stake',
   *   args: [parseEther('1.0')],
   *   value: parseEther('1.0'),
   *   account: walletAccount,
   *   estimateGas: true,
   *   timeout: 180000 // 3分钟超时
   * });
   * ```
   */
  static async write(
    options: ViemContractWriteOptions
  ): Promise<ViemContractWriteResult> {
    // 使用请求队列进行请求，以控制频率
    return this.requestQueue.add(() => this.writeInternal(options));
  }

  /**
   * 内部写入方法（由请求队列调用）
   */
  private static async writeInternal(
    options: ViemContractWriteOptions
  ): Promise<ViemContractWriteResult> {
    const {
      contractAddress,
      contractAbi,
      functionName,
      args = [],
      value,
      gas,
      gasPrice,
      maxPriorityFeePerGas,
      maxFeePerGas,
      estimateGas = false,
      timeout = VIEM_CONFIG.contract.timeout,
      skipLogging = false,
      account,
      walletClient,
      publicClient,
      chain = VIEM_CONFIG.defaultChain,
      nonce,
    } = options;

    let gasEstimation: ViemGasEstimation | undefined;

    try {
      if (!skipLogging) {
        console.log(`=== Viem Contract ${functionName} Write ===`);
        console.log("Function Name:", functionName);
        console.log("Arguments:", args);
        console.log("Value:", value);
        console.log("Estimate Gas:", estimateGas);
        console.log("Timeout:", timeout);
        console.log("Chain:", chain.name);
      }

      // 验证合约地址
      if (!isAddress(contractAddress)) {
        throw new Error("Invalid contract address");
      }

      // 验证账户
      if (!account) {
        throw new Error("Account is required for write operations");
      }

      // 如果启用了 Gas 估算
      if (estimateGas) {
        try {
          gasEstimation = await this.estimateGasInternal({
            contractAddress,
            contractAbi,
            functionName,
            args,
            value,
            publicClient,
            chain,
            account,
          });

          if (!skipLogging) {
            console.log("💰 Gas 估算结果:");
            console.log("  Gas Limit:", gasEstimation.gasLimit.toString());
            console.log("  估算费用:", gasEstimation.estimatedCost, "ETH");
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          console.warn("⚠️ Gas 估算失败，将跳过 Gas 估算:");
          console.warn(`   错误: ${errorMsg}`);
          console.warn("   💡 交易会由钱包自动估算 Gas，或请检查以下问题:");
          console.warn("      • 池子 ID 是否存在？(使用 poolExists 检查)");
          console.warn("      • 池子是否在活跃期间？(使用 isPoolActive 检查)");
          console.warn("      • 合约是否暂停？(使用 isPaused 检查)");
          console.warn("      • 账户是否被黑名单？(使用 isBlacklisted 检查)");
          // 继续处理，让钱包自动估算
          gasEstimation = undefined;
        }
      }

      const client = getWalletClient(walletClient, chain);
      const pubClient = getPublicClient(publicClient, chain);

      // 构建写入参数 - 分离 EIP-1559 和 Legacy 参数
      // 使用合理的 Gas Limit 默认值（300000 对于大多数合约操作足够）
      let gasLimit: bigint | undefined;
      if (gas) {
        gasLimit = gas;
      } else if (gasEstimation?.gasLimit) {
        // 如果成功估算了 Gas，增加 20% 的 buffer
        gasLimit = (gasEstimation.gasLimit * 120n) / 100n;
      } else {
        // 如果无法估算，使用保守的默认值（不设置会让钱包自动估算）
        gasLimit = undefined;
      }

      const baseParams = {
        address: contractAddress,
        abi: contractAbi,
        functionName,
        args: args.length > 0 ? args : undefined,
        account,
        value,
        gas: gasLimit,
        nonce,
        chain,
      };

      // 根据是否有 EIP-1559 参数决定交易类型
      const writeParams: WriteContractParameters = gasPrice
        ? { ...baseParams, gasPrice, type: "legacy" as const }
        : {
            ...baseParams,
            maxFeePerGas: maxFeePerGas || gasEstimation?.maxFeePerGas,
            maxPriorityFeePerGas:
              maxPriorityFeePerGas || gasEstimation?.maxPriorityFeePerGas,
          };

      // 发送交易
      const hash = await client.writeContract(writeParams);

      if (!skipLogging) {
        console.log("📤 交易已发送，哈希:", hash);
        console.log("⏳ 等待确认...");
        if (writeParams.gas)
          console.log("  Gas Limit:", writeParams.gas.toString());
        if (writeParams.maxFeePerGas)
          console.log(
            "  Max Fee:",
            formatUnits(writeParams.maxFeePerGas, 9),
            "Gwei"
          );
      }

      // 等待交易确认（带超时）
      const receipt = await Promise.race([
        pubClient.waitForTransactionReceipt({ hash }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`交易超时 (${timeout}ms)`)),
            timeout
          )
        ),
      ]);

      // 判断交易执行状态
      const isConfirmed = receipt !== null;
      const isTransactionSuccessful = receipt?.status === "success";
      const isReverted = receipt?.status === "reverted";

      // 计算 Gas 使用信息
      let gasUsed: bigint | undefined;
      let effectiveGasPrice: bigint | undefined;
      let transactionCost: string | undefined;

      if (receipt) {
        gasUsed = receipt.gasUsed;
        effectiveGasPrice = receipt.effectiveGasPrice;
        if (gasUsed && effectiveGasPrice) {
          const cost = gasUsed * effectiveGasPrice;
          transactionCost = formatEther(cost);
        }
      }

      if (!skipLogging) {
        if (isTransactionSuccessful) {
          console.log("✅ 交易执行成功！");
          if (gasUsed) console.log("  Gas 使用量:", gasUsed.toString());
          if (effectiveGasPrice)
            console.log(
              "  实际 Gas 价格:",
              formatUnits(effectiveGasPrice, 9),
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
        hash,
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
   * const removeListener = ViemContractService.addEventListener({
   *   contractAddress: '0x...',
   *   contractAbi: abi,
   *   eventName: 'Transfer',
   *   args: { from: userAddress }
   * }, (logs) => {
   *   console.log('Transfer事件:', logs);
   * });
   *
   * // 取消监听
   * removeListener();
   * ```
   */
  static addEventListener(
    options: ViemEventListenerOptions,
    callback: (logs: Log[]) => void
  ): () => void {
    const {
      contractAddress,
      contractAbi,
      eventName,
      args = {},
      publicClient,
      chain = VIEM_CONFIG.defaultChain,
    } = options;

    const client = getPublicClient(publicClient, chain);

    // 创建事件监听参数
    const watchParams: WatchContractEventParameters = {
      address: contractAddress,
      abi: contractAbi,
      eventName,
      args: Object.keys(args).length > 0 ? args : undefined,
      onLogs: callback,
    };

    // 开始监听
    const unwatch = client.watchContractEvent(watchParams);

    console.log(
      `📡 开始监听事件 ${eventName} 在合约 ${contractAddress}${
        Object.keys(args).length > 0 ? " (带过滤器)" : ""
      }`
    );

    // 返回取消监听的函数
    return () => {
      unwatch();
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
   * const events = await ViemContractService.getEvents({
   *   contractAddress: '0x...',
   *   contractAbi: abi,
   *   eventName: 'Transfer',
   *   args: { from: userAddress },
   *   fromBlock: 'earliest',
   *   toBlock: 'latest'
   * });
   * ```
   */
  static async getEvents(options: ViemEventListenerOptions): Promise<Log[]> {
    const {
      contractAddress,
      contractAbi,
      eventName,
      args,
      fromBlock = "latest",
      toBlock = "latest",
      publicClient,
      chain = VIEM_CONFIG.defaultChain,
    } = options;

    try {
      const client = getPublicClient(publicClient, chain);

      // 从 ABI 中查找事件定义
      const eventAbi = contractAbi.find(
        (item) => item.type === "event" && item.name === eventName
      );

      if (!eventAbi || eventAbi.type !== "event") {
        throw new Error(`Event ${eventName} not found in ABI`);
      }

      // 使用事件过滤器查询 - 只获取特定事件
      const logs = await client.getLogs({
        address: contractAddress,
        event: eventAbi,
        args: args as Record<string, unknown> | undefined,
        fromBlock,
        toBlock,
      });

      console.log(`📡 找到 ${logs.length} 个来自合约的事件 (${eventName})`);

      return logs;
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
   * const results = await ViemContractService.multiContractRead(calls);
   * ```
   */
  static async multiContractRead(
    calls: ViemBatchCall[],
    publicClient?: PublicClient,
    chain?: Chain
  ): Promise<ViemContractReadResult<unknown>[]> {
    console.log(`🔗 开始多合约批量调用 ${calls.length} 个方法`);

    // 转换为统一的调用格式
    const readCalls = calls.map((call) => ({
      ...call,
      skipLogging: true,
      publicClient,
      chain,
    }));

    return this.batchRead(readCalls);
  }
}

// 导出便捷方法
export const viemContract = ViemContractService;

/**
 * 🎯 便捷函数：读取单个合约方法（自动管理 publicClient）
 */
export async function readViemContract<T = unknown>(
  contractAddress: Address,
  contractAbi: Abi,
  functionName: string,
  args: readonly unknown[] = [],
  options?: {
    skipLogging?: boolean;
    publicClient?: PublicClient;
    chain?: Chain;
    useCache?: boolean;
    cacheTTL?: number;
    cacheType?: "static" | "semiStatic" | "dynamic" | "realtime";
    forceRefresh?: boolean;
  }
): Promise<T | null> {
  // 🔥 如果没有传入 publicClient，自动创建一个
  const clientToUse =
    options?.publicClient || getPublicClient(undefined, options?.chain);

  const result = await ViemContractService.read<T>({
    contractAddress,
    contractAbi,
    functionName,
    args,
    skipLogging: options?.skipLogging ?? false,
    publicClient: clientToUse,
    chain: options?.chain,
    useCache: options?.useCache,
    cacheTTL: options?.cacheTTL,
    cacheType: options?.cacheType,
    forceRefresh: options?.forceRefresh,
  });

  return result.data;
}

/**
 * 🎯 便捷函数：批量读取合约方法（自动管理 publicClient）
 */
export async function readViemContractBatch(
  contractAddress: Address,
  contractAbi: Abi,
  calls: {
    functionName: string;
    args?: readonly unknown[];
  }[],
  publicClient?: PublicClient, // 可选，如果不传入会自动创建
  chain?: Chain
): Promise<unknown[]> {
  // 🔥 如果没有传入 publicClient，自动创建一个并复用
  const clientToUse = publicClient || getPublicClient(undefined, chain);

  // 为每个 call 添加必需的合约信息
  const callsWithContract = calls.map((call) => ({
    contractAddress,
    contractAbi,
    functionName: call.functionName,
    args: call.args,
    publicClient: clientToUse, // 复用同一个 client
    chain,
  }));

  const results = await ViemContractService.batchRead(callsWithContract);
  return results.map((r) => r.data);
}

/**
 * 🎯 便捷函数：写入合约方法（自动管理 publicClient）
 */
export async function writeViemContract(
  contractAddress: Address,
  contractAbi: Abi,
  functionName: string,
  args: readonly unknown[] = [],
  options: Omit<
    ViemContractWriteOptions,
    "contractAddress" | "contractAbi" | "functionName" | "args"
  > = {}
): Promise<ViemContractWriteResult> {
  // 🔥 如果没有传入 publicClient，自动创建一个
  const clientToUse =
    options.publicClient || getPublicClient(undefined, options.chain);

  return ViemContractService.write({
    contractAddress,
    contractAbi,
    functionName,
    args,
    ...options,
    publicClient: clientToUse, // 确保使用 publicClient
  });
}

/**
 * 🎯 便捷函数：估算 Gas 费用（自动管理 publicClient）
 */
export async function estimateViemContractGas(
  contractAddress: Address,
  contractAbi: Abi,
  functionName: string,
  args: readonly unknown[] = [],
  value?: bigint,
  publicClient?: PublicClient,
  chain?: Chain,
  account?: Account
): Promise<ViemGasEstimation> {
  // 🔥 如果没有传入 publicClient，自动创建一个
  const clientToUse = publicClient || getPublicClient(undefined, chain);

  return ViemContractService.estimateGas({
    contractAddress,
    contractAbi,
    functionName,
    args,
    value,
    publicClient: clientToUse,
    chain,
    account,
  });
}

/**
 * 🎯 便捷函数：监听合约事件（自动管理 publicClient）
 */
export function listenToViemContractEvent(
  contractAddress: Address,
  contractAbi: Abi,
  eventName: string,
  callback: (logs: Log[]) => void,
  args?: Record<string, unknown>,
  publicClient?: PublicClient,
  chain?: Chain
): () => void {
  // 🔥 如果没有传入 publicClient，自动创建一个
  const clientToUse = publicClient || getPublicClient(undefined, chain);

  return ViemContractService.addEventListener(
    {
      contractAddress,
      contractAbi,
      eventName,
      args,
      publicClient: clientToUse,
      chain,
    },
    callback
  );
}

/**
 * 🎯 便捷函数：获取历史事件（自动管理 publicClient）
 */
export async function getViemContractEvents(
  contractAddress: Address,
  contractAbi: Abi,
  eventName: string,
  args?: Record<string, unknown>,
  fromBlock: bigint | "latest" | "earliest" | "pending" = "latest",
  toBlock: bigint | "latest" | "earliest" | "pending" = "latest",
  publicClient?: PublicClient,
  chain?: Chain
): Promise<Log[]> {
  // 🔥 如果没有传入 publicClient，自动创建一个
  const clientToUse = publicClient || getPublicClient(undefined, chain);

  return ViemContractService.getEvents({
    contractAddress,
    contractAbi,
    eventName,
    args,
    fromBlock,
    toBlock,
    publicClient: clientToUse,
    chain,
  });
}

// ==================== 工具函数 ====================

/**
 * 💰 格式化 Wei 为 ETH (Viem版本)
 */
export const formatViemEther = formatEther;

/**
 * 💰 解析 ETH 为 Wei (Viem版本)
 */
export const parseViemEther = parseEther;

/**
 * 💰 格式化 Gas 价格（Gwei）(Viem版本)
 */
export function formatViemGasPrice(gasPrice: bigint): string {
  return formatUnits(gasPrice, 9) + " Gwei";
}

/**
 * 💰 解析 Gwei 为 Wei (Viem版本)
 */
export function parseViemGwei(value: string): bigint {
  return parseUnits(value, 9);
}

/**
 * 🔗 检查合约地址是否有效 (Viem版本)
 */
export const isValidViemAddress = isAddress;

/**
 * 🔗 获取合约代码大小（判断是否为合约）(Viem版本)
 */
export async function isViemContract(
  address: Address,
  publicClient?: PublicClient,
  chain?: Chain
): Promise<boolean> {
  try {
    const client = getPublicClient(publicClient, chain);
    const code = await client.getCode({ address });
    return code !== undefined && code !== "0x";
  } catch {
    return false;
  }
}

/**
 * ⏱️ 等待指定的区块数 (Viem版本)
 */
export async function waitForViemBlocks(
  blockCount: number,
  publicClient?: PublicClient,
  chain?: Chain
): Promise<void> {
  const client = getPublicClient(publicClient, chain);
  const startBlock = await client.getBlockNumber();
  const targetBlock = startBlock + BigInt(blockCount);

  return new Promise((resolve) => {
    const checkBlock = async () => {
      const currentBlock = await client.getBlockNumber();
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
 * 📊 获取网络统计信息 (Viem版本)
 */
export async function getViemNetworkStats(
  publicClient?: PublicClient,
  chain?: Chain
): Promise<{
  blockNumber: bigint;
  gasPrice: string;
  chainId: number;
  chainName: string;
}> {
  const client = getPublicClient(publicClient, chain);

  const [blockNumber, gasPrice, chainId] = await Promise.all([
    client.getBlockNumber(),
    client.getGasPrice(),
    client.getChainId(),
  ]);

  return {
    blockNumber,
    gasPrice: formatViemGasPrice(gasPrice),
    chainId,
    chainName: chain?.name || "Unknown",
  };
}

// ==================== 合约包装器类 ====================

/**
 * 🎯 Viem 合约包装器类
 *
 * 为特定合约创建专用实例，预配置合约地址和 ABI
 * 提供更简洁的 API，无需每次传递合约配置
 *
 * @example
 * ```typescript
 * import contract from "@/app/abi/MultiStakePledgeContract.json";
 *
 * // 创建专用合约包装器
 * const multiStakeContract = new ViemContractWrapper({
 *   contractAddress: "0x123...",
 *   contractAbi: contract.abi,
 *   contractName: "MultiStakePledge"
 * });
 *
 * // 简洁的读取调用
 * const poolCount = await multiStakeContract.read<bigint>('poolCount');
 * const poolInfo = await multiStakeContract.read('getPoolInfo', [poolId]);
 *
 * // 简洁的写入调用
 * const result = await multiStakeContract.write('stake', [poolId], {
 *   account: walletAccount,
 *   value: parseEther('1.0'),
 *   estimateGas: true
 * });
 * ```
 */
export class ViemContractWrapper {
  private config: ViemContractWrapperConfig;
  private _publicClient: PublicClient;
  private _chain: Chain;

  constructor(config: ViemContractWrapperConfig) {
    this.config = config;
    this._chain = config.chain || VIEM_CONFIG.defaultChain;

    if (!isAddress(this.config.contractAddress)) {
      throw new Error("Invalid contract address");
    }

    if (!this.config.contractAbi) {
      throw new Error("Contract ABI is required");
    }

    // 🔥 自动创建和管理 publicClient
    this._publicClient = this.createPublicClient();

    console.log(
      `🎯 创建 Viem 合约包装器: ${this.config.contractName || "Unknown Contract"} (${this.config.contractAddress})`
    );
    console.log(
      `📡 自动配置 PublicClient: ${this._chain.name} (${this._chain.id})`
    );
  }

  /**
   * 🔧 创建 PublicClient 实例
   */
  private createPublicClient(): PublicClient {
    const rpcUrl = VIEM_CONFIG.rpcUrls[this._chain.id];
    if (!rpcUrl) {
      throw new Error(`No RPC URL configured for chain ${this._chain.id}`);
    }

    return createPublicClient({
      chain: this._chain,
      transport: http(rpcUrl),
    });
  }

  /**
   * 📖 读取合约数据（自动使用内置 publicClient）
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
        ViemContractReadOptions,
        | "contractAddress"
        | "contractAbi"
        | "functionName"
        | "args"
        | "publicClient"
        | "chain"
      >
    >
  ): Promise<T | null> {
    const result = await ViemContractService.read<T>({
      contractAddress: this.config.contractAddress,
      contractAbi: this.config.contractAbi,
      functionName,
      args: args || [],
      publicClient: this._publicClient, // 🔥 自动使用内置 publicClient
      chain: this._chain,
      ...options,
    });

    if (result.isError) {
      throw result.error;
    }

    return result.data;
  }

  /**
   * 📝 写入合约数据（自动使用内置 publicClient）
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
        ViemContractWriteOptions,
        | "contractAddress"
        | "contractAbi"
        | "functionName"
        | "args"
        | "publicClient"
        | "chain"
      >
    >
  ): Promise<ViemContractWriteResult> {
    return ViemContractService.write({
      contractAddress: this.config.contractAddress,
      contractAbi: this.config.contractAbi,
      functionName,
      args: args || [],
      publicClient: this._publicClient, // 🔥 自动使用内置 publicClient
      chain: this._chain,
      ...options,
    });
  }

  /**
   * 💰 估算 Gas 费用（自动使用内置 publicClient）
   *
   * @param functionName 函数名称
   * @param args 函数参数（可选）
   * @param options 额外配置（可选，可包含 account 参数用于准确的 gas 估算）
   * @returns Gas 估算结果
   */
  async estimateGas(
    functionName: string,
    args?: readonly unknown[],
    options?: Partial<
      Omit<
        ViemContractWriteOptions,
        | "contractAddress"
        | "contractAbi"
        | "functionName"
        | "args"
        | "walletClient"
        | "publicClient"
        | "chain"
      >
    >
  ): Promise<ViemGasEstimation> {
    return ViemContractService.estimateGas({
      contractAddress: this.config.contractAddress,
      contractAbi: this.config.contractAbi,
      functionName,
      args: args || [],
      publicClient: this._publicClient, // 🔥 自动使用内置 publicClient
      chain: this._chain,
      ...options,
    });
  }

  /**
   * 📡 监听合约事件（自动使用内置 publicClient）
   *
   * @param eventName 事件名称
   * @param callback 事件回调函数
   * @param args 事件过滤器（可选）
   * @returns 取消监听的函数
   */
  addEventListener(
    eventName: string,
    callback: (logs: Log[]) => void,
    args?: Record<string, unknown>
  ): () => void {
    return ViemContractService.addEventListener(
      {
        contractAddress: this.config.contractAddress,
        contractAbi: this.config.contractAbi,
        eventName,
        args,
        publicClient: this._publicClient, // 🔥 自动使用内置 publicClient
        chain: this._chain,
      },
      callback
    );
  }

  /**
   * 📡 获取历史事件（自动使用内置 publicClient）
   *
   * @param eventName 事件名称
   * @param args 事件过滤器（可选）
   * @param fromBlock 开始区块（可选）
   * @param toBlock 结束区块（可选）
   * @returns 事件数组
   */
  async getEvents(
    eventName: string,
    args?: Record<string, unknown>,
    fromBlock?: bigint | "latest" | "earliest" | "pending",
    toBlock?: bigint | "latest" | "earliest" | "pending"
  ): Promise<Log[]> {
    return ViemContractService.getEvents({
      contractAddress: this.config.contractAddress,
      contractAbi: this.config.contractAbi,
      eventName,
      args,
      fromBlock,
      toBlock,
      publicClient: this._publicClient, // 🔥 自动使用内置 publicClient
      chain: this._chain,
    });
  }

  /**
   * 📡 获取历史事件（带缓存支持）
   *
   * @param eventName 事件名称
   * @param options 查询选项（包含缓存配置）
   * @returns 事件数组
   */
  async getEventsWithCache(
    eventName: string,
    options?: {
      args?: Record<string, unknown>;
      fromBlock?: bigint | "latest" | "earliest" | "pending";
      toBlock?: bigint | "latest" | "earliest" | "pending";
      useCache?: boolean;
      cacheTTL?: number;
      cacheType?: "static" | "semiStatic" | "dynamic" | "realtime";
      forceRefresh?: boolean;
    }
  ): Promise<Log[]> {
    // 默认启用缓存
    const useCache = options?.useCache !== false;
    const cacheType = options?.cacheType || "semiStatic";
    const fromBlock = options?.fromBlock || "earliest";
    const toBlock = options?.toBlock || "latest";

    // 生成缓存键
    const cacheKey = `events:${this.config.contractAddress}:${eventName}:${fromBlock}:${toBlock}:${JSON.stringify(options?.args || {})}`;

    // 根据配置选择缓存存储
    const cacheStore =
      VIEM_CONFIG.cache.storageType === "hybrid" ? hybridCache : cache;

    // 如果不使用缓存或强制刷新，直接查询
    if (!useCache || options?.forceRefresh) {
      const events = await this.getEvents(
        eventName,
        options?.args,
        fromBlock,
        toBlock
      );
      if (useCache) {
        // 根据 cacheType 设置 TTL
        const ttl = options?.cacheTTL || this.getCacheTTL(cacheType);
        cacheStore.set(cacheKey, events, ttl);
      }
      return events;
    }

    // 尝试从缓存获取
    const cached = cacheStore.get<Log[]>(cacheKey);
    if (cached !== null) {
      console.log(
        `🔥 从缓存获取事件: ${eventName} [${VIEM_CONFIG.cache.storageType}]`
      );
      return cached;
    }

    // 缓存未命中，查询并缓存
    console.log(`🌐 查询事件 (无缓存): ${eventName}`);
    const events = await this.getEvents(
      eventName,
      options?.args,
      fromBlock,
      toBlock
    );

    // 缓存结果
    const ttl = options?.cacheTTL || this.getCacheTTL(cacheType);
    cacheStore.set(cacheKey, events, ttl);

    return events;
  }

  /**
   * 根据缓存类型获取 TTL
   */
  private getCacheTTL(
    cacheType: "static" | "semiStatic" | "dynamic" | "realtime"
  ): number {
    return VIEM_CONFIG.cache.ttlByType[cacheType];
  }

  /**
   * 🔄 批量读取合约数据（自动使用内置 publicClient）
   *
   * @param calls 批量调用配置数组
   * @returns 批量读取结果数组
   */
  async batchRead(
    calls: {
      functionName: string;
      args?: readonly unknown[];
      forceRefresh?: boolean;
    }[]
  ): Promise<ViemContractReadResult<unknown>[]> {
    const batchCalls = calls.map((call) => ({
      contractAddress: this.config.contractAddress,
      contractAbi: this.config.contractAbi,
      functionName: call.functionName,
      args: call.args || [],
      forceRefresh: call.forceRefresh,
      publicClient: this._publicClient, // 🔥 自动使用内置 publicClient
      chain: this._chain,
    }));

    return ViemContractService.batchRead(batchCalls);
  }

  /**
   * ℹ️ 获取合约配置信息
   */
  getConfig(): Readonly<ViemContractWrapperConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * 🔗 获取合约地址
   */
  get address(): Address {
    return this.config.contractAddress;
  }

  /**
   * 📋 获取合约 ABI
   */
  get abi(): Abi {
    return this.config.contractAbi;
  }

  /**
   * 🏷️ 获取合约名称
   */
  get name(): string {
    return this.config.contractName || "Unknown Contract";
  }

  /**
   * 📊 获取合约网络状态（使用内置 publicClient）
   */
  async getNetworkStats(): Promise<{
    blockNumber: bigint;
    gasPrice: string;
    chainId: number;
    chainName: string;
  }> {
    return getViemNetworkStats(this._publicClient, this._chain);
  }

  /**
   * 🔧 获取内置的 PublicClient（只读访问）
   */
  get publicClient(): PublicClient {
    return this._publicClient;
  }

  /**
   * 🔧 获取当前链配置（只读访问）
   */
  get chain(): Chain {
    return this._chain;
  }

  /**
   * 🔧 私有方法：合并交易选项
   * @param options 用户提供的选项
   * @param defaults 默认选项
   */
  private mergeWriteOptions(
    options?: Partial<
      Omit<
        ViemContractWriteOptions,
        "contractAddress" | "contractAbi" | "functionName" | "args"
      >
    >,
    defaults: Record<string, unknown> = {}
  ) {
    return {
      estimateGas: options?.estimateGas ?? true,
      timeout: options?.timeout,
      account: options?.account,
      walletClient: options?.walletClient,
      publicClient: options?.publicClient,
      gas: options?.gas,
      gasPrice: options?.gasPrice,
      maxPriorityFeePerGas: options?.maxPriorityFeePerGas,
      maxFeePerGas: options?.maxFeePerGas,
      value: options?.value,
      skipLogging: options?.skipLogging,
      chain: options?.chain || this.config.chain,
      nonce: options?.nonce,
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
        ViemContractWriteOptions,
        "contractAddress" | "contractAbi" | "functionName" | "args"
      >
    >
  ): Promise<ViemContractWriteResult> {
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
        ExtendedViemContractWriteOptions,
        "contractAddress" | "contractAbi" | "functionName" | "args"
      >
    >
  ): Promise<ViemContractWriteResult> {
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
 * 🏭 Viem 合约包装器工厂函数
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
 * const multiStakeContract = createViemContractWrapper({
 *   contractAddress: "0x123...",
 *   contractAbi: contract.abi,
 *   contractName: "MultiStakePledge"
 * });
 * ```
 */
export function createViemContractWrapper(
  config: ViemContractWrapperConfig
): ViemContractWrapper {
  return new ViemContractWrapper(config);
}

// ==================== 导出增强版服务 ====================

export const EnhancedViemContract = ViemContractService;

// ==================== 全局队列管理（高级功能） ====================

/**
 * 获取全局请求队列的统计信息
 *
 * @returns 队列统计信息
 *
 * @example
 * ```typescript
 * const stats = getViemContractQueueStats();
 * console.log(`队列中有 ${stats.pending} 个待处理任务`);
 * console.log(`已完成 ${stats.completed} 个任务`);
 * ```
 */
export function getViemContractQueueStats() {
  return ViemContractService.getRequestQueue().getStats();
}

/**
 * 设置全局请求队列的间隔时间
 *
 * ⚠️ 注意：这会影响所有使用 viemContractUtils 的请求
 *
 * @param intervalMs 新的间隔时间（毫秒）
 *
 * @example
 * ```typescript
 * // 在应用启动时调整
 * setViemContractQueueInterval(150); // 改为 150ms
 * ```
 */
export function setViemContractQueueInterval(intervalMs: number) {
  ViemContractService.getRequestQueue().setInterval(intervalMs);
  console.log(`✅ Global queue interval updated to ${intervalMs}ms`);
}

/**
 * 清空全局请求队列
 *
 * ⚠️ 警告：这会拒绝所有待处理的请求！
 * 通常不需要手动调用，仅用于特殊场景（如切换网络）
 *
 * @param reason 清空原因
 *
 * @example
 * ```typescript
 * clearViemContractQueue("Network switched");
 * ```
 */
export function clearViemContractQueue(reason: string = "Queue cleared") {
  ViemContractService.getRequestQueue().clear(reason);
  console.warn(`⚠️ Global queue cleared: ${reason}`);
}

/**
 * 重置全局请求队列的统计信息
 *
 * @example
 * ```typescript
 * resetViemContractQueueStats();
 * ```
 */
export function resetViemContractQueueStats() {
  ViemContractService.getRequestQueue().resetStats();
}

// ==================== 缓存管理工具函数 ====================

/**
 * 🗑️ 清除特定合约的所有缓存
 *
 * @param contractAddress 合约地址
 * @param chainId 链 ID（可选，不传则清除所有链上该合约的缓存）
 *
 * @example
 * ```typescript
 * // 清除特定合约在特定链上的缓存
 * clearViemContractCache("0x123...", 11155111);
 *
 * // 清除特定合约在所有链上的缓存
 * clearViemContractCache("0x123...");
 * ```
 */
export function clearViemContractCache(
  contractAddress: Address,
  chainId?: number
): number {
  const pattern = chainId
    ? `^${VIEM_CONFIG.cache.keyPrefix}:${chainId}:${contractAddress}:`
    : `^${VIEM_CONFIG.cache.keyPrefix}:\\d+:${contractAddress}:`;

  const stats = cache.getStats();
  const regex = new RegExp(pattern);
  let deletedCount = 0;

  for (const key of stats.keys) {
    if (regex.test(key)) {
      cache.delete(key);
      deletedCount++;
    }
  }

  console.log(`🗑️ 已清除 ${deletedCount} 个合约缓存项 (${contractAddress})`);
  return deletedCount;
}

/**
 * 🗑️ 清除特定合约函数的缓存
 *
 * @param contractAddress 合约地址
 * @param functionName 函数名
 * @param chainId 链 ID（可选）
 *
 * @example
 * ```typescript
 * clearViemContractFunctionCache("0x123...", "balanceOf", 11155111);
 * ```
 */
export function clearViemContractFunctionCache(
  contractAddress: Address,
  functionName: string,
  chainId?: number
): number {
  const pattern = chainId
    ? `^${VIEM_CONFIG.cache.keyPrefix}:${chainId}:${contractAddress}:${functionName}:`
    : `^${VIEM_CONFIG.cache.keyPrefix}:\\d+:${contractAddress}:${functionName}:`;

  const stats = cache.getStats();
  const regex = new RegExp(pattern);
  let deletedCount = 0;

  for (const key of stats.keys) {
    if (regex.test(key)) {
      cache.delete(key);
      deletedCount++;
    }
  }

  console.log(
    `🗑️ 已清除 ${deletedCount} 个函数缓存项 (${contractAddress}.${functionName})`
  );
  return deletedCount;
}

/**
 * 🗑️ 清除所有合约缓存
 *
 * @example
 * ```typescript
 * clearAllViemContractCache();
 * ```
 */
export function clearAllViemContractCache(): number {
  const pattern = `^${VIEM_CONFIG.cache.keyPrefix}:`;
  const stats = cache.getStats();
  const regex = new RegExp(pattern);
  let deletedCount = 0;

  for (const key of stats.keys) {
    if (regex.test(key)) {
      cache.delete(key);
      deletedCount++;
    }
  }

  console.log(`🗑️ 已清除所有合约缓存 (${deletedCount} 项)`);
  return deletedCount;
}

/**
 * 📊 获取合约缓存统计信息
 *
 * @param contractAddress 合约地址（可选）
 * @param chainId 链 ID（可选）
 * @returns 缓存统计信息
 *
 * @example
 * ```typescript
 * // 获取所有合约缓存统计
 * const stats = getViemContractCacheStats();
 *
 * // 获取特定合约的缓存统计
 * const contractStats = getViemContractCacheStats("0x123...", 11155111);
 * ```
 */
export function getViemContractCacheStats(
  contractAddress?: Address,
  chainId?: number
): {
  totalCacheItems: number;
  cacheKeys: string[];
} {
  const stats = cache.getStats();

  if (!contractAddress) {
    // 返回所有合约缓存统计
    const pattern = `^${VIEM_CONFIG.cache.keyPrefix}:`;
    const regex = new RegExp(pattern);
    const cacheKeys = stats.keys.filter((key) => regex.test(key));

    return {
      totalCacheItems: cacheKeys.length,
      cacheKeys,
    };
  }

  // 返回特定合约的缓存统计
  const pattern = chainId
    ? `^${VIEM_CONFIG.cache.keyPrefix}:${chainId}:${contractAddress}:`
    : `^${VIEM_CONFIG.cache.keyPrefix}:\\d+:${contractAddress}:`;

  const regex = new RegExp(pattern);
  const cacheKeys = stats.keys.filter((key) => regex.test(key));

  return {
    totalCacheItems: cacheKeys.length,
    cacheKeys,
  };
}

/**
 * ⚙️ 配置全局缓存设置
 *
 * @param config 缓存配置
 *
 * @example
 * ```typescript
 * // 在应用启动时配置
 * configureViemContractCache({
 *   enabled: true,
 *   defaultTTL: 60, // 1分钟
 * });
 * ```
 */
export function configureViemContractCache(config: {
  enabled?: boolean;
  storageType?: "memory" | "hybrid";
  defaultTTL?: number;
  ttlByType?: {
    static?: number;
    semiStatic?: number;
    dynamic?: number;
    realtime?: number;
  };
}): void {
  if (config.enabled !== undefined) {
    VIEM_CONFIG.cache.enabled = config.enabled;
  }

  if (config.storageType !== undefined) {
    VIEM_CONFIG.cache.storageType = config.storageType;
  }

  if (config.defaultTTL !== undefined) {
    VIEM_CONFIG.cache.defaultTTL = config.defaultTTL;
  }

  if (config.ttlByType) {
    if (config.ttlByType.static !== undefined) {
      VIEM_CONFIG.cache.ttlByType.static = config.ttlByType.static;
    }
    if (config.ttlByType.semiStatic !== undefined) {
      VIEM_CONFIG.cache.ttlByType.semiStatic = config.ttlByType.semiStatic;
    }
    if (config.ttlByType.dynamic !== undefined) {
      VIEM_CONFIG.cache.ttlByType.dynamic = config.ttlByType.dynamic;
    }
    if (config.ttlByType.realtime !== undefined) {
      VIEM_CONFIG.cache.ttlByType.realtime = config.ttlByType.realtime;
    }
  }

  console.log("✅ 合约缓存配置已更新:", {
    enabled: VIEM_CONFIG.cache.enabled,
    storageType: VIEM_CONFIG.cache.storageType,
    defaultTTL: VIEM_CONFIG.cache.defaultTTL,
    ttlByType: VIEM_CONFIG.cache.ttlByType,
  });
}
