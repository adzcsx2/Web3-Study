/**
 * 用户池子数据类型定义
 *
 * 用于 WithdrawModal 组件中展示用户在各个池子的质押和奖励信息
 *
 * @author Hoyn
 * @version 1.0.0
 * @lastModified 2025-10-31
 */

/**
 * 用户池子详细数据接口
 */
export interface UserPoolData {
  /** 活跃质押余额（正在赚取奖励的部分） */
  stakedBalance: bigint;

  /** 可再次申请解质押的余额（等同于 stakedBalance） */
  availableBalance: bigint;

  /** 已冻结（已申请解质押但还在冷却期的部分） */
  frozenBalance: bigint;

  /** 已解冻（冷却期已过，可立即提取的部分） */
  unfrozenBalance: bigint;

  /** 可领取奖励（当前累积的奖励） */
  pendingRewards: bigint;

  /** 总共可领取奖励（历史总奖励） */
  totalRewardsEarned: bigint;

  /** 已冻结奖励（与冻结质押对应的奖励） */
  frozenRewards: bigint;

  /** 已领取奖励（历史已领取的奖励） */
  totalRewardsClaimed: bigint;

  /** 质押代币地址 */
  stakeToken: string;

  /** 是否有解质押请求 */
  hasUnstakeRequest: boolean;

  /** 是否可以提取 */
  canWithdraw: boolean;

  /** 剩余区块数（可选） */
  remainingBlocks?: bigint;

  /** 预估解锁时间（可选） */
  estimatedTime?: string;
}
