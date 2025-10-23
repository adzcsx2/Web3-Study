/**
 * MultiStakePledgeContract 专用包装器
 *
 * 基于 ethersContractUtils.ts 的 ContractWrapper 类创建
 * 预配置了合约地址和 ABI，提供类型安全的合约交互
 *
 * 使用方式：
 * ```typescript
 * // 1. 使用预配置的合约实例（基础用法）
 * import { multiStakeContract } from '@/utils/MultiStakePledgeContractWrapper';
 * const poolCount = await multiStakeContract.read<number>('poolCount');
 *
 * // 2. 使用类型化的服务类
 * import { MultiStakePledgeContractService } from '@/utils/MultiStakePledgeContractWrapper';
 *
 * // 2.1 默认构造（无 provider）
 * const service = new MultiStakePledgeContractService();
 *
 * // 2.2 带 provider 构造
 * const serviceWithProvider = new MultiStakePledgeContractService({
 *   provider: wagmiProvider,
 *   signer: wagmiSigner
 * });
 *
 * // 2.3 动态设置 provider
 * service.setDefaultProvider(wagmiProvider);
 * service.setDefaultSigner(wagmiSigner);
 *
 * // 读取数据
 * const poolInfo = await service.getPoolInfo(0);
 * const userPoolInfo = await service.getUserPoolInfo(0, userAddress);
 *
 * // 普通写入（使用默认 signer）
 * const result = await service.stakeInPool(0, ethers.parseEther('1.0'));
 *
 * // 临时覆盖 signer
 * const result2 = await service.stakeInPool(0, ethers.parseEther('1.0'), {
 *   signer: otherSigner  // 覆盖默认 signer
 * });
 *
 * // 带状态跟踪的写入
 * await service.stakeInPoolWithStatus(0, ethers.parseEther('1.0'), {
 *   onPending: () => console.log('🔄 正在发送交易...'),
 *   onSent: (hash) => console.log('📤 交易已发送:', hash),
 *   onSuccess: (receipt) => console.log('✅ 质押成功！'),
 *   onError: (error) => console.error('💥 交易失败:', error)
 * });
 * ```
 */

import {
  ContractWrapper,
  createContractWrapper,
  ContractWriteOptions,
  ExtendedContractWriteOptions,
} from "../utils/ethersContractUtils";
import { ethers } from "ethers";
import contract from "@/app/abi/MultiStakePledgeContract.json";
import type { PoolInfo, UserPoolInfo } from "@/types/StakePledgeContractStructs";
/**
 * MultiStakePledgeContract 专用包装器实例
 */
export const multiStakeContract = createContractWrapper({
  contractAddress: contract.address,
  contractAbi: contract.abi,
  contractName: "MultiStakePledgeContract",
});


// 重新导出 ethersContractUtils 中的类型，以保持兼容性
export type TransactionOptions = Partial<
  Omit<
    ContractWriteOptions,
    "contractAddress" | "contractAbi" | "functionName" | "args"
  >
>;

export type ExtendedTransactionOptions = Partial<
  Omit<
    ExtendedContractWriteOptions,
    "contractAddress" | "contractAbi" | "functionName" | "args"
  >
>;

export interface ContractEvent extends ethers.Log {
  // 可以根据实际事件结构扩展
  args?: unknown[];
}

/**
 * 🎯 MultiStakePledgeContract 类型化接口
 *
 * 为常用方法提供类型安全的包装函数
 */
export class MultiStakePledgeContractService {
  private wrapper: ContractWrapper;
  private defaultProvider?: ethers.Provider;
  private defaultSigner?: ethers.Signer;

  constructor(options?: {
    contractAddress?: string;
    provider?: ethers.Provider;
    signer?: ethers.Signer;
  }) {
    this.wrapper = createContractWrapper({
      contractAddress: options?.contractAddress || contract.address,
      contractAbi: contract.abi,
      contractName: "MultiStakePledgeContract",
    });

    this.defaultProvider = options?.provider;
    this.defaultSigner = options?.signer;
  }

  /**
   * 设置默认的 Provider
   * @param provider ethers Provider 实例
   */
  setDefaultProvider(provider: ethers.Provider) {
    this.defaultProvider = provider;
  }

  /**
   * 设置默认的 Signer
   * @param signer ethers Signer 实例
   */
  setDefaultSigner(signer: ethers.Signer) {
    this.defaultSigner = signer;
  }

  /**
   * 获取默认的交易选项（包含默认的 provider 和 signer）
   * @param options 用户提供的选项
   */
  private getDefaultOptions(options?: TransactionOptions): TransactionOptions {
    return {
      provider: this.defaultProvider,
      signer: this.defaultSigner,
      ...options, // 用户选项优先级更高
    };
  }

  // ==================== 读取方法 ====================

  /**
   * 获取池子总数
   */
  async getPoolCount(): Promise<number> {
    const result = await this.wrapper.read<number>("poolCount");
    if (result === null) {
      throw new Error("Failed to get pool count");
    }
    return result;
  }

  /**
   * 获取池子信息
   * @param poolId 池子ID
   */
  async getPoolInfo(poolId: number): Promise<PoolInfo> {
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
   */
  async getRewardBalance(user: string): Promise<bigint> {
    const result = await this.wrapper.read<bigint>("getRewardBalance", [user]);
    if (result === null) {
      throw new Error(`Failed to get reward balance for user ${user}`);
    }
    return result;
  }

  /**
   * 检查池子是否存在（这个方法在合约中不存在，使用 getPoolInfo 替代）
   * @param poolId 池子ID
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
   */
  async getActivePoolCount(): Promise<number> {
    const result = await this.wrapper.read<number>("getActivePoolCount");
    if (result === null) {
      throw new Error("Failed to get active pool count");
    }
    return result;
  }

  /**
   * 获取合约版本
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
   */
  async getMaxPools(): Promise<number> {
    const result = await this.wrapper.read<number>("MAX_POOLS");
    if (result === null) {
      throw new Error("Failed to get max pools");
    }
    return result;
  }

  /**
   * 获取 MetaNodeToken 地址
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
   */
  async stake(poolId: number, amount: bigint, options?: TransactionOptions) {
    return this.wrapper.executeWrite("stake", [poolId], {
      ...this.getDefaultOptions(options),
      value: amount,
    });
  }

  /**
   * 从指定池子解除质押
   * @param poolId 池子ID
   * @param amount 解除质押金额（wei）
   * @param options 交易配置
   */
  async unstake(poolId: number, amount: bigint, options?: TransactionOptions) {
    return this.wrapper.executeWrite(
      "unstake",
      [poolId, amount],
      this.getDefaultOptions(options)
    );
  }

  /**
   * 领取奖励（从指定池子）
   * @param poolId 池子ID
   * @param options 交易配置
   */
  async claimRewardsFromPool(poolId: number, options?: TransactionOptions) {
    return this.wrapper.executeWrite("claimRewardsFromPool", [poolId], options);
  }

  /**
   * 领取奖励（从指定池子，带状态跟踪）
   * @param poolId 池子ID
   * @param options 扩展交易配置（支持状态回调）
   */
  async claimRewardsFromPoolWithStatus(
    poolId: number,
    options?: ExtendedTransactionOptions
  ) {
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
   */
  async requestUnstakeFromPool(
    poolId: number,
    amount: bigint,
    options?: TransactionOptions
  ) {
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
   */
  async requestUnstakeFromPoolWithStatus(
    poolId: number,
    amount: bigint,
    options?: ExtendedTransactionOptions
  ) {
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
   */
  async unstakeFromPool(poolId: number, options?: TransactionOptions) {
    return this.wrapper.executeWrite("unstakeFromPool", [poolId], options);
  }

  /**
   * 在指定池子中质押
   * @param poolId 池子ID
   * @param amount 质押金额（wei）
   * @param options 交易配置
   */
  async stakeInPool(
    poolId: number,
    amount: bigint,
    options?: TransactionOptions
  ) {
    return this.wrapper.executeWrite("stakeInPool", [poolId, amount], options);
  }

  /**
   * 在指定池子中质押（带状态跟踪）
   * @param poolId 池子ID
   * @param amount 质押金额（wei）
   * @param options 扩展交易配置（支持状态回调）
   * @returns 写入结果
   *
   * @example
   * ```typescript
   * const result = await contract.stakeInPoolWithStatus(0, ethers.parseEther('1.0'), {
   *   signer: wagmiSigner,
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
    options?: ExtendedTransactionOptions
  ) {
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
   */
  async createPool(
    stakeToken: string,
    rewardToken: string,
    totalRewards: bigint,
    duration: number,
    name: string,
    options?: TransactionOptions
  ) {
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
   */
  async createPoolWithStatus(
    stakeToken: string,
    rewardToken: string,
    totalRewards: bigint,
    duration: number,
    name: string,
    options?: ExtendedTransactionOptions
  ) {
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
   */
  async startPool(poolId: number, options?: TransactionOptions) {
    return this.wrapper.executeWrite("startPool", [poolId], options);
  }

  // ==================== 管理员方法 ====================

  /**
   * 暂停合约（需要管理员权限）
   * @param options 交易配置
   */
  async pause(options?: TransactionOptions) {
    return this.wrapper.executeWrite("pause", [], options);
  }

  /**
   * 取消暂停合约（需要管理员权限）
   * @param options 交易配置
   */
  async unpause(options?: TransactionOptions) {
    return this.wrapper.executeWrite("unpause", [], options);
  }

  /**
   * 紧急暂停（需要管理员权限）
   * @param options 交易配置
   */
  async emergencyPause(options?: TransactionOptions) {
    return this.wrapper.executeWrite("emergencyPause", [], options);
  }

  /**
   * 紧急提取（需要管理员权限）
   * @param token 代币地址
   * @param to 接收地址
   * @param amount 提取金额
   * @param options 交易配置
   */
  async emergencyWithdraw(
    token: string,
    to: string,
    amount: bigint,
    options?: TransactionOptions
  ) {
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
   */
  async addToBlacklist(account: string, options?: TransactionOptions) {
    return this.wrapper.executeWrite("addToBlacklist", [account], options);
  }

  /**
   * 从黑名单中移除（需要管理员权限）
   * @param account 要移除黑名单的地址
   * @param options 交易配置
   */
  async removeFromBlacklist(account: string, options?: TransactionOptions) {
    return this.wrapper.executeWrite("removeFromBlacklist", [account], options);
  }

  /**
   * 授予角色（需要管理员权限）
   * @param role 角色哈希
   * @param account 账户地址
   * @param options 交易配置
   */
  async grantRole(role: string, account: string, options?: TransactionOptions) {
    return this.wrapper.executeWrite("grantRole", [role, account], options);
  }

  /**
   * 撤销角色（需要管理员权限）
   * @param role 角色哈希
   * @param account 账户地址
   * @param options 交易配置
   */
  async revokeRole(
    role: string,
    account: string,
    options?: TransactionOptions
  ) {
    return this.wrapper.executeWrite("revokeRole", [role, account], options);
  }

  /**
   * 放弃角色
   * @param role 角色哈希
   * @param callerConfirmation 调用者确认地址
   * @param options 交易配置
   */
  async renounceRole(
    role: string,
    callerConfirmation: string,
    options?: TransactionOptions
  ) {
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
   */
  async upgradeToAndCall(
    newImplementation: string,
    data: string,
    options?: TransactionOptions
  ) {
    return this.wrapper.executeWrite(
      "upgradeToAndCall",
      [newImplementation, data],
      { ...options, value: options?.value || BigInt(0) }
    );
  }

  // ==================== 事件监听 ====================

  /**
   * 监听池子创建事件
   * @param callback 事件回调
   */
  onPoolCreated(callback: (event: ContractEvent) => void) {
    return this.wrapper.addEventListener("PoolCreated", callback);
  }

  /**
   * 监听池子启动事件
   * @param callback 事件回调
   * @param poolIdFilter 可选的池子ID过滤
   */
  onPoolStarted(
    callback: (event: ContractEvent) => void,
    poolIdFilter?: number
  ) {
    return this.wrapper.addEventListener(
      "PoolStarted",
      callback,
      poolIdFilter !== undefined ? { poolId: poolIdFilter } : undefined
    );
  }

  /**
   * 监听请求解除质押事件
   * @param callback 事件回调
   * @param userFilter 可选的用户地址过滤
   * @param poolIdFilter 可选的池子ID过滤
   */
  onRequestUnstakeFromPool(
    callback: (event: ContractEvent) => void,
    userFilter?: string,
    poolIdFilter?: number
  ) {
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
   */
  onRewardsClaimedFromPool(
    callback: (event: ContractEvent) => void,
    userFilter?: string,
    poolIdFilter?: number
  ) {
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
   */
  onBlacklistUpdated(
    callback: (event: ContractEvent) => void,
    accountFilter?: string
  ) {
    return this.wrapper.addEventListener(
      "BlacklistUpdated",
      callback,
      accountFilter ? { account: accountFilter } : undefined
    );
  }

  /**
   * 监听合约升级事件
   * @param callback 事件回调
   */
  onContractUpgraded(callback: (event: ContractEvent) => void) {
    return this.wrapper.addEventListener("ContractUpgraded", callback);
  }

  /**
   * 监听紧急暂停事件
   * @param callback 事件回调
   */
  onEmergencyPause(callback: (event: ContractEvent) => void) {
    return this.wrapper.addEventListener("EmergencyPause", callback);
  }

  /**
   * 监听紧急取消暂停事件
   * @param callback 事件回调
   */
  onEmergencyUnpause(callback: (event: ContractEvent) => void) {
    return this.wrapper.addEventListener("EmergencyUnpause", callback);
  }

  /**
   * 监听暂停事件
   * @param callback 事件回调
   */
  onPaused(callback: (event: ContractEvent) => void) {
    return this.wrapper.addEventListener("Paused", callback);
  }

  /**
   * 监听角色管理员变更事件
   * @param callback 事件回调
   */
  onRoleAdminChanged(callback: (event: ContractEvent) => void) {
    return this.wrapper.addEventListener("RoleAdminChanged", callback);
  }

  /**
   * 监听角色授予事件
   * @param callback 事件回调
   * @param roleFilter 可选的角色过滤
   * @param accountFilter 可选的账户过滤
   */
  onRoleGranted(
    callback: (event: ContractEvent) => void,
    roleFilter?: string,
    accountFilter?: string
  ) {
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
   */
  onRoleRevoked(
    callback: (event: ContractEvent) => void,
    roleFilter?: string,
    accountFilter?: string
  ) {
    const filters: Record<string, unknown> = {};
    if (roleFilter) filters.role = roleFilter;
    if (accountFilter) filters.account = accountFilter;

    return this.wrapper.addEventListener(
      "RoleRevoked",
      callback,
      Object.keys(filters).length > 0 ? filters : undefined
    );
  }

  // ==================== 批量操作 ====================

  /**
   * 批量获取多个池子信息
   * @param poolIds 池子ID数组
   */
  async batchGetPoolInfo(poolIds: number[]) {
    const calls = poolIds.map((id) => ({
      functionName: "getPoolInfo",
      args: [id],
    }));

    return this.wrapper.batchRead(calls);
  }

  /**
   * 批量获取用户在多个池子的质押信息
   * @param poolIds 池子ID数组
   * @param user 用户地址
   */
  async batchGetUserPoolInfo(poolIds: number[], user: string) {
    const calls = poolIds.map((id) => ({
      functionName: "getUserPoolInfo",
      args: [id, user],
    }));

    return this.wrapper.batchRead(calls);
  }

  /**
   * @deprecated 使用 batchGetUserPoolInfo 替代
   * 批量获取用户在多个池子的质押信息（向后兼容）
   * @param poolIds 池子ID数组
   * @param user 用户地址
   */
  async batchGetUserStakes(poolIds: number[], user: string) {
    return this.batchGetUserPoolInfo(poolIds, user);
  }

  // ==================== 工具方法 ====================

  /**
   * 估算质押操作的 Gas 费用
   * @param poolId 池子ID
   * @param amount 质押金额（wei）
   */
  async estimateStakeGas(poolId: number, amount: bigint) {
    return this.wrapper.estimateGas("stake", [poolId], { value: amount });
  }

  /**
   * 检查池子是否处于活跃期间
   * @param poolId 池子ID
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
   * 格式化池子信息为可读格式
   * @param poolInfo 池子信息
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
      totalRewardsFormatted: ethers.formatEther(poolInfo.totalRewards),
      totalStakedFormatted: ethers.formatEther(poolInfo.totalStaked),
      rewardRatePerDay: poolInfo.rewardRate * BigInt(86400), // 每天的奖励率
      cooldownPeriodDays: Number(poolInfo.cooldownPeriod) / 86400, // 冷却期天数
    };
  }

  /**
   * 格式化用户池子信息为可读格式
   * @param userPoolInfo 用户池子信息
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
      balancesFormatted: ethers.formatEther(userPoolInfo.balances),
      rewardsFormatted: ethers.formatEther(userPoolInfo.rewards),
      totalRewardsByUserFormatted: ethers.formatEther(
        userPoolInfo.totalRewardsByUser
      ),
      totalClaimedByUserFormatted: ethers.formatEther(
        userPoolInfo.totalClaimedByUser
      ),
      unclaimedRewards:
        userPoolInfo.totalRewardsByUser - userPoolInfo.totalClaimedByUser,
      unclaimedRewardsFormatted: ethers.formatEther(
        userPoolInfo.totalRewardsByUser - userPoolInfo.totalClaimedByUser
      ),
    };
  }

  /**
   * 检查用户的解质押请求是否可以执行
   * @param poolId 池子ID
   * @param user 用户地址
   * @param currentBlock 当前区块号（可选，默认获取最新）
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

  /**
   * 计算用户总的待解质押金额
   * @param poolId 池子ID
   * @param user 用户地址
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
   * 获取合约实例（用于底层操作）
   */
  getWrapper(): ContractWrapper {
    return this.wrapper;
  }

  /**
   * 获取合约地址
   */
  get address(): string {
    return this.wrapper.address;
  }
}

// 导出默认实例（推荐使用）
export const multiStakePledgeContract = new MultiStakePledgeContractService();

// 导出类（用于创建自定义实例）
export { MultiStakePledgeContractService as MultiStakePledgeContract };
