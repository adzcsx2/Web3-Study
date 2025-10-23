/**
 * MultiStakePledgeContract Viem 专用服务类
 *
 * 基于 viemContractUtils.ts 的 ViemContractWrapper 类创建
 * 预配置了合约地址和 ABI，提供类型安全的合约交互
 *
 * 🚀 特性：
 * - 基于 Viem 的现代化 Web3 交互
 * - 完整的类型安全支持
 * - 统一的读写方法
 * - 交易状态跟踪和回调
 * - 批量操作支持
 * - Gas 费用估算
 * - 事件监听和历史查询
 * - 错误处理和重试机制
 *
 * 使用方式：
 * ```typescript
 * // 1. 使用预配置的合约实例（基础用法）
 * import { multiStakeViemContract } from '@/services/MultiStakeViemService';
 * const poolCount = await multiStakeViemContract.read<bigint>('poolCount');
 *
 * // 2. 使用类型化的服务类
 * import { MultiStakeViemService } from '@/services/MultiStakeViemService';
 *
 * // 2.1 默认构造
 * const service = new MultiStakeViemService();
 *
 * // 2.2 带自定义配置构造
 * const serviceWithConfig = new MultiStakeViemService({
 *   contractAddress: "0x...",
 *   chain: sepolia
 * });
 *
 * // 读取数据
 * const poolInfo = await service.getPoolInfo(0);
 * const userPoolInfo = await service.getUserPoolInfo(0, userAddress);
 *
 * // 写入操作（基础）
 * const result = await service.stakeInPool(0, parseEther('1.0'), {
 *   account: walletAccount
 * });
 *
 * // 带状态跟踪的写入
 * await service.stakeInPoolWithStatus(0, parseEther('1.0'), {
 *   account: walletAccount,
 *   onPending: () => console.log('🔄 正在发送交易...'),
 *   onSent: (hash) => console.log('📤 交易已发送:', hash),
 *   onSuccess: (receipt) => console.log('✅ 质押成功！'),
 *   onError: (error) => console.error('💥 交易失败:', error)
 * });
 * ```
 *
 * @author Hoyn
 * @version 2.0.0
 * @lastModified 2025-10-24
 */

import {
  ViemContractWrapper,
  createViemContractWrapper,
  type ViemContractWriteOptions,
  type ExtendedViemContractWriteOptions,
  type ViemContractWriteResult,
  type ViemGasEstimation,
  formatViemEther,
  VIEM_CONFIG,
} from "../utils/viemContractUtils";
import type { Address, Log, Chain, Abi } from "viem";
import contract from "@/app/abi/MultiStakePledgeContract.json";
import {
  PoolInfo,
  UserPoolInfo,
  UnstakeRequest,
} from "@/types/StakePledgeContractStructs";

/**
 * 合约事件接口
 */
export interface ContractEvent extends Log {
  args?: unknown[];
}

/**
 * 交易选项类型（简化版）
 */
export type TransactionOptions = Partial<
  Omit<
    ViemContractWriteOptions,
    "contractAddress" | "contractAbi" | "functionName" | "args"
  >
>;

/**
 * 扩展交易选项类型（支持状态回调）
 */
export type ExtendedTransactionOptions = Partial<
  Omit<
    ExtendedViemContractWriteOptions,
    "contractAddress" | "contractAbi" | "functionName" | "args"
  >
>;

/**
 * 服务配置选项
 */
export interface MultiStakeViemServiceConfig {
  /** 合约地址（可选，默认使用 JSON 文件中的地址） */
  contractAddress?: Address;
  /** 链配置（可选，默认使用 sepolia） */
  chain?: Chain;
  /** 合约名称（可选，用于日志） */
  contractName?: string;
}

// ==================== 主服务类 ====================

/**
 * 🎯 MultiStakePledgeContract Viem 服务类
 *
 * 为 MultiStakePledgeContract 提供完整的 Viem 集成，
 * 包含所有合约方法的类型化包装和实用工具
 */
export class MultiStakeViemService {
  private wrapper: ViemContractWrapper;
  private config: MultiStakeViemServiceConfig;

  constructor(config: MultiStakeViemServiceConfig = {}) {
    this.config = {
      contractAddress: (config.contractAddress || contract.address) as Address,
      chain: config.chain || VIEM_CONFIG.defaultChain,
      contractName: config.contractName || "MultiStakePledgeContract",
    };

    this.wrapper = createViemContractWrapper({
      contractAddress: this.config.contractAddress!,
      contractAbi: contract.abi as Abi,
      contractName: this.config.contractName,
      chain: this.config.chain,
    });

    console.log(
      `🎯 MultiStakeViemService 初始化完成: ${this.config.contractName} (${this.config.contractAddress})`
    );
  }

  // ==================== 基础信息方法 ====================

  /**
   * 获取合约地址
   */
  get address(): Address {
    return this.wrapper.address;
  }

  /**
   * 获取合约配置
   */
  getConfig(): Readonly<MultiStakeViemServiceConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * 获取底层包装器（用于高级操作）
   */
  getWrapper(): ViemContractWrapper {
    return this.wrapper;
  }

  // ==================== 读取方法 ====================

  /**
   * 获取池子总数
   * @returns 池子数量
   */
  async getPoolCount(): Promise<number> {
    const result = await this.wrapper.read<bigint>("poolCounter");
    if (result === null) {
      throw new Error("Failed to get pool count");
    }
    return Number(result);
  }

  /**
   * 获取池子信息
   * @param poolId 池子ID
   * @returns 池子信息
   */
  async getPoolInfo(poolId: number): Promise<PoolInfo> {
    if (poolId < 0) {
      throw new Error(`Invalid pool ID: ${poolId}. Pool ID must be non-negative.`);
    }
    
    const result = await this.wrapper.read<PoolInfo>("getPoolInfo", [poolId]);
    if (result === null) {
      throw new Error(`Failed to get pool info for pool ${poolId}`);
    }
    return result;
  }

  /**
   * 获取用户在指定池子的质押信息
   * @param poolId 池子ID
   * @param user 用户地址
   * @returns 用户池子信息
   */
  async getUserPoolInfo(poolId: number, user: string): Promise<UserPoolInfo> {
    const result = await this.wrapper.read<UserPoolInfo>("getUserPoolInfo", [
      poolId,
      user,
    ]);
    if (result === null) {
      throw new Error(
        `Failed to get user pool info for pool ${poolId} and user ${user}`
      );
    }
    return result;
  }

  /**
   * 获取用户的奖励余额
   * @param user 用户地址
   * @returns 奖励余额
   */
  async getRewardBalance(user: string): Promise<bigint> {
    const result = await this.wrapper.read<bigint>("getRewardBalance", [user]);
    if (result === null) {
      throw new Error(`Failed to get reward balance for user ${user}`);
    }
    return result;
  }

  /**
   * 检查池子是否存在
   * @param poolId 池子ID
   * @returns 是否存在
   */
  async poolExists(poolId: number): Promise<boolean> {
    try {
      await this.getPoolInfo(poolId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取活跃池子数量
   * @returns 活跃池子数量
   */
  async getActivePoolCount(): Promise<number> {
    const result = await this.wrapper.read<bigint>("getActivePoolCount");
    if (result === null) {
      throw new Error("Failed to get active pool count");
    }
    return Number(result);
  }

  /**
   * 获取合约版本
   * @returns 合约版本
   */
  async getVersion(): Promise<string> {
    const result = await this.wrapper.read<string>("getVersion");
    if (result === null) {
      throw new Error("Failed to get contract version");
    }
    return result;
  }

  /**
   * 获取合约版本常量
   * @returns 合约版本常量
   */
  async getContractVersion(): Promise<string> {
    const result = await this.wrapper.read<string>("CONTRACT_VERSION");
    if (result === null) {
      throw new Error("Failed to get contract version constant");
    }
    return result;
  }

  /**
   * 获取最大池子数量
   * @returns 最大池子数量
   */
  async getMaxPools(): Promise<number> {
    const result = await this.wrapper.read<bigint>("MAX_POOLS");
    if (result === null) {
      throw new Error("Failed to get max pools");
    }
    return Number(result);
  }

  /**
   * 获取 MetaNodeToken 地址
   * @returns MetaNodeToken 地址
   */
  async getMetaNodeToken(): Promise<string> {
    const result = await this.wrapper.read<string>("metaNodeToken");
    if (result === null) {
      throw new Error("Failed to get meta node token address");
    }
    return result;
  }

  /**
   * 检查合约是否暂停
   * @returns 是否暂停
   */
  async isPaused(): Promise<boolean> {
    const result = await this.wrapper.read<boolean>("paused");
    if (result === null) {
      throw new Error("Failed to check if contract is paused");
    }
    return result;
  }

  /**
   * 检查地址是否在黑名单中
   * @param address 要检查的地址
   * @returns 是否在黑名单中
   */
  async isBlacklisted(address: string): Promise<boolean> {
    const result = await this.wrapper.read<boolean>("blacklist", [address]);
    if (result === null) {
      throw new Error(
        `Failed to check blacklist status for address ${address}`
      );
    }
    return result;
  }

  /**
   * 检查是否有指定角色
   * @param role 角色哈希
   * @param account 账户地址
   * @returns 是否有角色
   */
  async hasRole(role: string, account: string): Promise<boolean> {
    const result = await this.wrapper.read<boolean>("hasRole", [role, account]);
    if (result === null) {
      throw new Error(`Failed to check role for account ${account}`);
    }
    return result;
  }

  /**
   * 获取角色管理员
   * @param role 角色哈希
   * @returns 管理员地址
   */
  async getRoleAdmin(role: string): Promise<string> {
    const result = await this.wrapper.read<string>("getRoleAdmin", [role]);
    if (result === null) {
      throw new Error(`Failed to get role admin for role ${role}`);
    }
    return result;
  }

  /**
   * 获取默认管理员角色
   * @returns 默认管理员角色
   */
  async getDefaultAdminRole(): Promise<string> {
    const result = await this.wrapper.read<string>("DEFAULT_ADMIN_ROLE");
    if (result === null) {
      throw new Error("Failed to get default admin role");
    }
    return result;
  }

  /**
   * 检查接口支持
   * @param interfaceId 接口ID
   * @returns 是否支持接口
   */
  async supportsInterface(interfaceId: string): Promise<boolean> {
    const result = await this.wrapper.read<boolean>("supportsInterface", [
      interfaceId,
    ]);
    if (result === null) {
      throw new Error(`Failed to check interface support for ${interfaceId}`);
    }
    return result;
  }

  // ==================== 写入方法 ====================

  /**
   * 质押到指定池子
   * @param poolId 池子ID
   * @param amount 质押金额（wei）
   * @param options 交易配置
   * @returns 交易结果
   */
  async stake(
    poolId: number,
    amount: bigint,
    options: TransactionOptions
  ): Promise<ViemContractWriteResult> {
    if (poolId < 0) {
      throw new Error(`Invalid pool ID: ${poolId}. Pool ID must be non-negative.`);
    }
    if (amount <= 0n) {
      throw new Error(`Invalid stake amount: ${amount}. Amount must be positive.`);
    }
    
    return this.wrapper.executeWrite("stake", [poolId], {
      estimateGas: true, // 默认启用 gas 估算
      ...options,
      value: amount,
    });
  }

  /**
   * 从指定池子解除质押
   * @param poolId 池子ID
   * @param amount 解除质押金额（wei）
   * @param options 交易配置
   * @returns 交易结果
   */
  async unstake(
    poolId: number,
    amount: bigint,
    options: TransactionOptions
  ): Promise<ViemContractWriteResult> {
    return this.wrapper.executeWrite("unstake", [poolId, amount], options);
  }

  /**
   * 领取奖励（从指定池子）
   * @param poolId 池子ID
   * @param options 交易配置
   * @returns 交易结果
   */
  async claimRewardsFromPool(
    poolId: number,
    options: TransactionOptions
  ): Promise<ViemContractWriteResult> {
    return this.wrapper.executeWrite("claimRewardsFromPool", [poolId], options);
  }

  /**
   * 领取奖励（从指定池子，带状态跟踪）
   * @param poolId 池子ID
   * @param options 扩展交易配置（支持状态回调）
   * @returns 交易结果
   */
  async claimRewardsFromPoolWithStatus(
    poolId: number,
    options: ExtendedTransactionOptions
  ): Promise<ViemContractWriteResult> {
    return this.wrapper.executeWriteWithStatus(
      "claimRewardsFromPool",
      [poolId],
      options
    );
  }

  /**
   * 请求解质押
   * @param poolId 池子ID
   * @param amount 解质押金额
   * @param options 交易配置
   * @returns 交易结果
   */
  async requestUnstakeFromPool(
    poolId: number,
    amount: bigint,
    options: TransactionOptions
  ): Promise<ViemContractWriteResult> {
    return this.wrapper.executeWrite(
      "requestUnstakeFromPool",
      [poolId, amount],
      options
    );
  }

  /**
   * 请求解质押（带状态跟踪）
   * @param poolId 池子ID
   * @param amount 解质押金额
   * @param options 扩展交易配置（支持状态回调）
   * @returns 交易结果
   */
  async requestUnstakeFromPoolWithStatus(
    poolId: number,
    amount: bigint,
    options: ExtendedTransactionOptions
  ): Promise<ViemContractWriteResult> {
    return this.wrapper.executeWriteWithStatus(
      "requestUnstakeFromPool",
      [poolId, amount],
      options
    );
  }

  /**
   * 从指定池子解除质押（执行已请求的解除质押）
   * @param poolId 池子ID
   * @param options 交易配置
   * @returns 交易结果
   */
  async unstakeFromPool(
    poolId: number,
    options: TransactionOptions
  ): Promise<ViemContractWriteResult> {
    return this.wrapper.executeWrite("unstakeFromPool", [poolId], options);
  }

  /**
   * 在指定池子中质押
   * @param poolId 池子ID
   * @param amount 质押金额（wei）
   * @param options 交易配置
   * @returns 交易结果
   */
  async stakeInPool(
    poolId: number,
    amount: bigint,
    options: TransactionOptions
  ): Promise<ViemContractWriteResult> {
    return this.wrapper.executeWrite("stakeInPool", [poolId, amount], options);
  }

  /**
   * 在指定池子中质押（带状态跟踪）
   * @param poolId 池子ID
   * @param amount 质押金额（wei）
   * @param options 扩展交易配置（支持状态回调）
   * @returns 交易结果
   *
   * @example
   * ```typescript
   * const result = await service.stakeInPoolWithStatus(0, parseEther('1.0'), {
   *   account: walletAccount,
   *   onPending: () => console.log('🔄 正在发送交易...'),
   *   onSent: (hash) => console.log('📤 交易已发送:', hash),
   *   onConfirming: () => console.log('⏳ 交易确认中...'),
   *   onSuccess: (receipt) => console.log('✅ 质押成功！'),
   *   onReverted: (receipt) => console.log('❌ 交易回滚'),
   *   onError: (error) => console.error('💥 交易失败:', error)
   * });
   * ```
   */
  async stakeInPoolWithStatus(
    poolId: number,
    amount: bigint,
    options: ExtendedTransactionOptions
  ): Promise<ViemContractWriteResult> {
    return this.wrapper.executeWriteWithStatus(
      "stakeInPool",
      [poolId, amount],
      options
    );
  }

  /**
   * 创建新的质押池子（需要管理员权限）
   * @param stakeToken 质押代币地址
   * @param rewardToken 奖励代币地址
   * @param totalRewards 总奖励金额
   * @param duration 池子持续时间（秒）
   * @param name 池子名称
   * @param options 交易配置
   * @returns 交易结果
   */
  async createPool(
    stakeToken: string,
    rewardToken: string,
    totalRewards: bigint,
    duration: number,
    name: string,
    options: TransactionOptions
  ): Promise<ViemContractWriteResult> {
    return this.wrapper.executeWrite(
      "createPool",
      [stakeToken, rewardToken, totalRewards, duration, name],
      options
    );
  }

  /**
   * 创建新的质押池子（需要管理员权限，带状态跟踪）
   * @param stakeToken 质押代币地址
   * @param rewardToken 奖励代币地址
   * @param totalRewards 总奖励金额
   * @param duration 池子持续时间（秒）
   * @param name 池子名称
   * @param options 扩展交易配置（支持状态回调）
   * @returns 交易结果
   */
  async createPoolWithStatus(
    stakeToken: string,
    rewardToken: string,
    totalRewards: bigint,
    duration: number,
    name: string,
    options: ExtendedTransactionOptions
  ): Promise<ViemContractWriteResult> {
    return this.wrapper.executeWriteWithStatus(
      "createPool",
      [stakeToken, rewardToken, totalRewards, duration, name],
      options
    );
  }

  /**
   * 启动指定池子（需要管理员权限）
   * @param poolId 池子ID
   * @param options 交易配置
   * @returns 交易结果
   */
  async startPool(
    poolId: number,
    options: TransactionOptions
  ): Promise<ViemContractWriteResult> {
    return this.wrapper.executeWrite("startPool", [poolId], options);
  }

  // ==================== 管理员方法 ====================

  /**
   * 暂停合约（需要管理员权限）
   * @param options 交易配置
   * @returns 交易结果
   */
  async pause(options: TransactionOptions): Promise<ViemContractWriteResult> {
    return this.wrapper.executeWrite("pause", [], options);
  }

  /**
   * 取消暂停合约（需要管理员权限）
   * @param options 交易配置
   * @returns 交易结果
   */
  async unpause(options: TransactionOptions): Promise<ViemContractWriteResult> {
    return this.wrapper.executeWrite("unpause", [], options);
  }

  /**
   * 紧急暂停（需要管理员权限）
   * @param options 交易配置
   * @returns 交易结果
   */
  async emergencyPause(
    options: TransactionOptions
  ): Promise<ViemContractWriteResult> {
    return this.wrapper.executeWrite("emergencyPause", [], options);
  }

  /**
   * 紧急提取（需要管理员权限）
   * @param token 代币地址
   * @param to 接收地址
   * @param amount 提取金额
   * @param options 交易配置
   * @returns 交易结果
   */
  async emergencyWithdraw(
    token: string,
    to: string,
    amount: bigint,
    options: TransactionOptions
  ): Promise<ViemContractWriteResult> {
    return this.wrapper.executeWrite(
      "emergencyWithdraw",
      [token, to, amount],
      options
    );
  }

  /**
   * 添加到黑名单（需要管理员权限）
   * @param account 要加入黑名单的地址
   * @param options 交易配置
   * @returns 交易结果
   */
  async addToBlacklist(
    account: string,
    options: TransactionOptions
  ): Promise<ViemContractWriteResult> {
    return this.wrapper.executeWrite("addToBlacklist", [account], options);
  }

  /**
   * 从黑名单中移除（需要管理员权限）
   * @param account 要移除黑名单的地址
   * @param options 交易配置
   * @returns 交易结果
   */
  async removeFromBlacklist(
    account: string,
    options: TransactionOptions
  ): Promise<ViemContractWriteResult> {
    return this.wrapper.executeWrite("removeFromBlacklist", [account], options);
  }

  /**
   * 授予角色（需要管理员权限）
   * @param role 角色哈希
   * @param account 账户地址
   * @param options 交易配置
   * @returns 交易结果
   */
  async grantRole(
    role: string,
    account: string,
    options: TransactionOptions
  ): Promise<ViemContractWriteResult> {
    return this.wrapper.executeWrite("grantRole", [role, account], options);
  }

  /**
   * 撤销角色（需要管理员权限）
   * @param role 角色哈希
   * @param account 账户地址
   * @param options 交易配置
   * @returns 交易结果
   */
  async revokeRole(
    role: string,
    account: string,
    options: TransactionOptions
  ): Promise<ViemContractWriteResult> {
    return this.wrapper.executeWrite("revokeRole", [role, account], options);
  }

  /**
   * 放弃角色
   * @param role 角色哈希
   * @param callerConfirmation 调用者确认地址
   * @param options 交易配置
   * @returns 交易结果
   */
  async renounceRole(
    role: string,
    callerConfirmation: string,
    options: TransactionOptions
  ): Promise<ViemContractWriteResult> {
    return this.wrapper.executeWrite(
      "renounceRole",
      [role, callerConfirmation],
      options
    );
  }

  /**
   * 合约升级（需要管理员权限）
   * @param newImplementation 新实现合约地址
   * @param data 初始化数据
   * @param options 交易配置
   * @returns 交易结果
   */
  async upgradeToAndCall(
    newImplementation: string,
    data: string,
    options: TransactionOptions
  ): Promise<ViemContractWriteResult> {
    return this.wrapper.executeWrite(
      "upgradeToAndCall",
      [newImplementation, data],
      { ...options, value: options.value || BigInt(0) }
    );
  }

  // ==================== 事件监听 ====================

  /**
   * 监听池子创建事件
   * @param callback 事件回调
   * @returns 取消监听的函数
   */
  onPoolCreated(callback: (logs: Log[]) => void): () => void {
    return this.wrapper.addEventListener("PoolCreated", callback);
  }

  /**
   * 监听池子启动事件
   * @param callback 事件回调
   * @param poolIdFilter 可选的池子ID过滤
   * @returns 取消监听的函数
   */
  onPoolStarted(
    callback: (logs: Log[]) => void,
    poolIdFilter?: number
  ): () => void {
    const filters =
      poolIdFilter !== undefined ? { poolId: poolIdFilter } : undefined;
    return this.wrapper.addEventListener("PoolStarted", callback, filters);
  }

  /**
   * 监听请求解除质押事件
   * @param callback 事件回调
   * @param userFilter 可选的用户地址过滤
   * @param poolIdFilter 可选的池子ID过滤
   * @returns 取消监听的函数
   */
  onRequestUnstakeFromPool(
    callback: (logs: Log[]) => void,
    userFilter?: string,
    poolIdFilter?: number
  ): () => void {
    const filters: Record<string, unknown> = {};
    if (userFilter) filters.user = userFilter;
    if (poolIdFilter !== undefined) filters.poolId = poolIdFilter;

    return this.wrapper.addEventListener(
      "RequestUnstakeFromPool",
      callback,
      Object.keys(filters).length > 0 ? filters : undefined
    );
  }

  /**
   * 监听池子奖励领取事件
   * @param callback 事件回调
   * @param userFilter 可选的用户地址过滤
   * @param poolIdFilter 可选的池子ID过滤
   * @returns 取消监听的函数
   */
  onRewardsClaimedFromPool(
    callback: (logs: Log[]) => void,
    userFilter?: string,
    poolIdFilter?: number
  ): () => void {
    const filters: Record<string, unknown> = {};
    if (userFilter) filters.user = userFilter;
    if (poolIdFilter !== undefined) filters.poolId = poolIdFilter;

    return this.wrapper.addEventListener(
      "RewardsClaimedFromPool",
      callback,
      Object.keys(filters).length > 0 ? filters : undefined
    );
  }

  /**
   * 监听黑名单更新事件
   * @param callback 事件回调
   * @param accountFilter 可选的账户地址过滤
   * @returns 取消监听的函数
   */
  onBlacklistUpdated(
    callback: (logs: Log[]) => void,
    accountFilter?: string
  ): () => void {
    return this.wrapper.addEventListener(
      "BlacklistUpdated",
      callback,
      accountFilter ? { account: accountFilter } : undefined
    );
  }

  /**
   * 监听合约升级事件
   * @param callback 事件回调
   * @returns 取消监听的函数
   */
  onContractUpgraded(callback: (logs: Log[]) => void): () => void {
    return this.wrapper.addEventListener("ContractUpgraded", callback);
  }

  /**
   * 监听紧急暂停事件
   * @param callback 事件回调
   * @returns 取消监听的函数
   */
  onEmergencyPause(callback: (logs: Log[]) => void): () => void {
    return this.wrapper.addEventListener("EmergencyPause", callback);
  }

  /**
   * 监听紧急取消暂停事件
   * @param callback 事件回调
   * @returns 取消监听的函数
   */
  onEmergencyUnpause(callback: (logs: Log[]) => void): () => void {
    return this.wrapper.addEventListener("EmergencyUnpause", callback);
  }

  /**
   * 监听暂停事件
   * @param callback 事件回调
   * @returns 取消监听的函数
   */
  onPaused(callback: (logs: Log[]) => void): () => void {
    return this.wrapper.addEventListener("Paused", callback);
  }

  /**
   * 监听角色管理员变更事件
   * @param callback 事件回调
   * @returns 取消监听的函数
   */
  onRoleAdminChanged(callback: (logs: Log[]) => void): () => void {
    return this.wrapper.addEventListener("RoleAdminChanged", callback);
  }

  /**
   * 监听角色授予事件
   * @param callback 事件回调
   * @param roleFilter 可选的角色过滤
   * @param accountFilter 可选的账户过滤
   * @returns 取消监听的函数
   */
  onRoleGranted(
    callback: (logs: Log[]) => void,
    roleFilter?: string,
    accountFilter?: string
  ): () => void {
    const filters: Record<string, unknown> = {};
    if (roleFilter) filters.role = roleFilter;
    if (accountFilter) filters.account = accountFilter;

    return this.wrapper.addEventListener(
      "RoleGranted",
      callback,
      Object.keys(filters).length > 0 ? filters : undefined
    );
  }

  /**
   * 监听角色撤销事件
   * @param callback 事件回调
   * @param roleFilter 可选的角色过滤
   * @param accountFilter 可选的账户过滤
   * @returns 取消监听的函数
   */
  onRoleRevoked(
    callback: (logs: Log[]) => void,
    roleFilter?: string,
    accountFilter?: string
  ): () => void {
    const filters: Record<string, unknown> = {};
    if (roleFilter) filters.role = roleFilter;
    if (accountFilter) filters.account = accountFilter;

    return this.wrapper.addEventListener(
      "RoleRevoked",
      callback,
      Object.keys(filters).length > 0 ? filters : undefined
    );
  }

  // ==================== Gas 估算 ====================

  /**
   * 估算质押操作的 Gas 费用
   * @param poolId 池子ID
   * @param amount 质押金额（wei）
   * @returns Gas 估算结果
   */
  async estimateStakeGas(
    poolId: number,
    amount: bigint
  ): Promise<ViemGasEstimation> {
    return this.wrapper.estimateGas("stake", [poolId], { value: amount });
  }

  /**
   * 估算在池子中质押的 Gas 费用
   * @param poolId 池子ID
   * @param amount 质押金额（wei）
   * @returns Gas 估算结果
   */
  async estimateStakeInPoolGas(
    poolId: number,
    amount: bigint
  ): Promise<ViemGasEstimation> {
    return this.wrapper.estimateGas("stakeInPool", [poolId, amount]);
  }

  /**
   * 估算解质押操作的 Gas 费用
   * @param poolId 池子ID
   * @param amount 解质押金额（wei）
   * @returns Gas 估算结果
   */
  async estimateUnstakeGas(
    poolId: number,
    amount: bigint
  ): Promise<ViemGasEstimation> {
    return this.wrapper.estimateGas("unstake", [poolId, amount]);
  }

  /**
   * 估算领取奖励的 Gas 费用
   * @param poolId 池子ID
   * @returns Gas 估算结果
   */
  async estimateClaimRewardsGas(poolId: number): Promise<ViemGasEstimation> {
    return this.wrapper.estimateGas("claimRewardsFromPool", [poolId]);
  }

  // ==================== 批量操作 ====================

  /**
   * 批量获取多个池子信息
   * @param poolIds 池子ID数组
   * @returns 池子信息数组
   */
  async batchGetPoolInfo(poolIds: number[]): Promise<(PoolInfo | null)[]> {
    const calls = poolIds.map((id) => ({
      functionName: "getPoolInfo",
      args: [id] as const,
    }));

    const results = await this.wrapper.batchRead(calls);
    return results.map((result) => result.data as PoolInfo | null);
  }

  /**
   * 批量获取用户在多个池子的质押信息
   * @param poolIds 池子ID数组
   * @param user 用户地址
   * @returns 用户池子信息数组
   */
  async batchGetUserPoolInfo(
    poolIds: number[],
    user: string
  ): Promise<(UserPoolInfo | null)[]> {
    const calls = poolIds.map((id) => ({
      functionName: "getUserPoolInfo",
      args: [id, user] as const,
    }));

    const results = await this.wrapper.batchRead(calls);
    return results.map((result) => result.data as UserPoolInfo | null);
  }

  /**
   * 批量检查池子是否存在
   * @param poolIds 池子ID数组
   * @returns 存在状态数组
   */
  async batchCheckPoolExists(poolIds: number[]): Promise<boolean[]> {
    const poolInfos = await this.batchGetPoolInfo(poolIds);
    return poolInfos.map((info) => info !== null);
  }

  // ==================== 工具方法 ====================

  /**
   * 检查池子是否处于活跃期间
   * @param poolId 池子ID
   * @returns 是否活跃
   */
  async isPoolActive(poolId: number): Promise<boolean> {
    const poolInfo = await this.getPoolInfo(poolId);
    const currentTime = Math.floor(Date.now() / 1000);
    return (
      poolInfo.isActive &&
      Number(poolInfo.startTime) <= currentTime &&
      Number(poolInfo.endTime) > currentTime
    );
  }

  /**
   * 计算池子剩余时间（秒）
   * @param poolId 池子ID
   * @returns 剩余时间（秒）
   */
  async getPoolRemainingTime(poolId: number): Promise<number> {
    const poolInfo = await this.getPoolInfo(poolId);
    const currentTime = Math.floor(Date.now() / 1000);
    const endTime = Number(poolInfo.endTime);
    return Math.max(0, endTime - currentTime);
  }

  /**
   * 计算池子的年化收益率（APY）
   * @param poolId 池子ID
   * @returns APY 百分比
   */
  async calculatePoolAPY(poolId: number): Promise<number> {
    const poolInfo = await this.getPoolInfo(poolId);

    if (poolInfo.totalStaked === BigInt(0)) {
      return 0;
    }

    // 计算年化奖励
    const secondsPerYear = 365 * 24 * 60 * 60;
    const yearlyRewards = poolInfo.rewardRate * BigInt(secondsPerYear);

    // APY = (年化奖励 / 总质押量) * 100
    const apy =
      Number(yearlyRewards * BigInt(100)) / Number(poolInfo.totalStaked);
    return apy;
  }

  /**
   * 检查用户是否可以质押指定金额
   * @param poolId 池子ID
   * @param amount 质押金额
   * @returns 检查结果
   */
  async canUserStake(
    poolId: number,
    amount: bigint
  ): Promise<{
    canStake: boolean;
    reason?: string;
  }> {
    try {
      const poolInfo = await this.getPoolInfo(poolId);

      // 检查池子是否激活
      if (!poolInfo.isActive) {
        return { canStake: false, reason: "池子未激活" };
      }

      // 检查是否在质押期间
      const currentTime = Math.floor(Date.now() / 1000);
      if (Number(poolInfo.startTime) > currentTime) {
        return { canStake: false, reason: "质押尚未开始" };
      }

      if (Number(poolInfo.endTime) <= currentTime) {
        return { canStake: false, reason: "质押已结束" };
      }

      // 检查最小质押金额
      if (amount < poolInfo.minDepositAmount) {
        return {
          canStake: false,
          reason: `质押金额低于最小要求 ${poolInfo.minDepositAmount.toString()}`,
        };
      }

      return { canStake: true };
    } catch (error) {
      return { canStake: false, reason: `检查失败: ${error}` };
    }
  }

  /**
   * 获取用户总的待解质押金额
   * @param poolId 池子ID
   * @param user 用户地址
   * @returns 总待解质押金额
   */
  async getUserTotalUnstakeAmount(
    poolId: number,
    user: string
  ): Promise<bigint> {
    const userPoolInfo = await this.getUserPoolInfo(poolId, user);
    return userPoolInfo.unstakeRequests.reduce(
      (total, request) => total + request.amount,
      BigInt(0)
    );
  }

  /**
   * 检查用户的解质押请求是否可以执行
   * @param poolId 池子ID
   * @param user 用户地址
   * @param currentBlock 当前区块号（可选，默认获取最新）
   * @returns 可执行的解质押请求数组
   */
  async getExecutableUnstakeRequests(
    poolId: number,
    user: string,
    currentBlock?: bigint
  ): Promise<UnstakeRequest[]> {
    const userPoolInfo = await this.getUserPoolInfo(poolId, user);

    // 如果没有提供当前区块号，需要获取（这里简化处理，实际应该通过provider获取）
    if (!currentBlock) {
      // 简化处理：假设所有请求都可执行，实际应用中需要获取当前区块号
      return userPoolInfo.unstakeRequests;
    }

    return userPoolInfo.unstakeRequests.filter(
      (request) => request.unlockBlock <= currentBlock
    );
  }

  // ==================== 格式化工具 ====================

  /**
   * 格式化池子信息为可读格式
   * @param poolInfo 池子信息
   * @returns 格式化后的池子信息
   */
  static formatPoolInfo(poolInfo: PoolInfo) {
    return {
      ...poolInfo,
      startTimeFormatted: new Date(
        Number(poolInfo.startTime) * 1000
      ).toLocaleString(),
      endTimeFormatted: new Date(
        Number(poolInfo.endTime) * 1000
      ).toLocaleString(),
      lastUpdateTimeFormatted: new Date(
        Number(poolInfo.lastUpdateTime) * 1000
      ).toLocaleString(),
      totalRewardsFormatted: formatViemEther(poolInfo.totalRewards),
      totalStakedFormatted: formatViemEther(poolInfo.totalStaked),
      rewardRatePerDay: poolInfo.rewardRate * BigInt(86400), // 每天的奖励率
      cooldownPeriodDays: Number(poolInfo.cooldownPeriod) / 86400, // 冷却期天数
    };
  }

  /**
   * 格式化用户池子信息为可读格式
   * @param userPoolInfo 用户池子信息
   * @returns 格式化后的用户池子信息
   */
  static formatUserPoolInfo(userPoolInfo: UserPoolInfo) {
    return {
      ...userPoolInfo,
      stakeTimestampsFormatted: new Date(
        Number(userPoolInfo.stakeTimestamps) * 1000
      ).toLocaleString(),
      lastStakeTimesFormatted: new Date(
        Number(userPoolInfo.lastStakeTimes) * 1000
      ).toLocaleString(),
      lastClaimTimesFormatted: new Date(
        Number(userPoolInfo.lastClaimTimes) * 1000
      ).toLocaleString(),
      lastUnstakeTimesFormatted: new Date(
        Number(userPoolInfo.lastUnstakeTimes) * 1000
      ).toLocaleString(),
      balancesFormatted: formatViemEther(userPoolInfo.balances),
      rewardsFormatted: formatViemEther(userPoolInfo.rewards),
      totalRewardsByUserFormatted: formatViemEther(
        userPoolInfo.totalRewardsByUser
      ),
      totalClaimedByUserFormatted: formatViemEther(
        userPoolInfo.totalClaimedByUser
      ),
      unclaimedRewards:
        userPoolInfo.totalRewardsByUser - userPoolInfo.totalClaimedByUser,
      unclaimedRewardsFormatted: formatViemEther(
        userPoolInfo.totalRewardsByUser - userPoolInfo.totalClaimedByUser
      ),
    };
  }
}

// ==================== 导出实例和工厂函数 ====================

/**
 * 默认服务实例（推荐使用）
 */
export const multiStakeViemContract = new MultiStakeViemService();

/**
 * Viem 合约包装器实例（用于基础操作）
 */
export const multiStakeViemWrapper = createViemContractWrapper({
  contractAddress: contract.address as Address,
  contractAbi: contract.abi as Abi,
  contractName: "MultiStakePledgeContract",
});

/**
 * 工厂函数：创建自定义配置的服务实例
 * @param config 服务配置
 * @returns 服务实例
 */
export function createMultiStakeViemService(
  config: MultiStakeViemServiceConfig = {}
): MultiStakeViemService {
  return new MultiStakeViemService(config);
}

// 注意：服务类已在上面导出，这里不需要重复导出

// 重新导出一些有用的工具
export {
  formatViemEther,
  type ViemContractWriteResult,
  type ViemGasEstimation,
} from "../utils/viemContractUtils";

export type { Address, Log, Chain } from "viem";
