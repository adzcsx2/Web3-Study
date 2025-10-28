// ==================== 类型定义 ====================

/**
 * 池子信息结构体
 */
export interface PoolInfo {
  stakeToken: string; // 质押代币合约地址
  rewardToken: string; // 奖励代币合约地址
  totalRewards: bigint; // 池子总奖励量
  rewardRate: bigint; // 每秒奖励率（wei/秒）
  totalRewardsIssued: bigint; // 已发放的奖励总量
  startTime: bigint; // 质押开始时间戳
  endTime: bigint; // 质押结束时间戳
  totalStaked: bigint; // 池子总质押量
  lastUpdateTime: bigint; // 奖励计算的最后更新时间
  rewardPerTokenStored: bigint; // 每个质押代币的累计奖励
  minDepositAmount: bigint; // 最小质押金额要求
  isActive: boolean; // 池子激活状态
  cooldownPeriod: bigint; // 解质押冷却期（秒）
  name: string; // 池子显示名称
}

/**
 * 解质押请求结构体
 */
export interface UnstakeRequest {
  amount: bigint; // 请求解质押的数量
  unlockBlock: bigint; // 解锁的区块号
}

/**
 * 用户在特定池子中的信息
 *
 * 注意：这些字段名必须与合约 ABI 中的返回值匹配
 * 合约实际返回: stakedBalance, pendingRewards, totalRewardsEarned, totalRewardsClaimed, pendingUnstakeRequests
 */
export interface UserPoolInfo {
  stakedBalance: bigint; // 用户在该池子中的质押余额
  pendingRewards: bigint; // 用户当前可领取的奖励（待领取）
  totalRewardsEarned: bigint; // 用户在该池子中获得的总奖励
  totalRewardsClaimed: bigint; // 用户在该池子中已领取的总奖励
  pendingUnstakeRequests: UnstakeRequest[]; // 用户的解质押请求队列

  // 以下为旧版本字段，保留以兼容旧代码
  userRewardPerTokenPaid?: bigint;
  rewards?: bigint; // 已废弃，使用 pendingRewards
  balances?: bigint; // 已废弃，使用 stakedBalance
  stakeTimestamps?: bigint;
  lastStakeTimes?: bigint;
  lastClaimTimes?: bigint;
  lastUnstakeTimes?: bigint;
  totalRewardsByUser?: bigint; // 已废弃，使用 totalRewardsEarned
  totalClaimedByUser?: bigint; // 已废弃，使用 totalRewardsClaimed
  unstakeRequests?: UnstakeRequest[]; // 已废弃，使用 pendingUnstakeRequests
}

/**
 * 池子创建参数
 */
export interface CreatePoolParams {
  stakeToken: string; // 质押代币合约地址
  rewardToken: string; // 奖励代币合约地址
  totalRewards: bigint; // 总奖励数量
  duration: bigint; // 质押持续时间（秒）
  minDepositAmount: bigint; // 最小质押金额
  cooldownPeriod: bigint; // 冷却期时长（秒）
  name: string; // 池子名称
}
