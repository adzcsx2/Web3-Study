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
 */
export interface UserPoolInfo {
  userRewardPerTokenPaid: bigint; // 用户已领取的每代币奖励记录
  rewards: bigint; // 用户当前可领取的奖励
  balances: bigint; // 用户在该池子中的质押余额
  stakeTimestamps: bigint; // 用户首次质押的时间戳
  lastStakeTimes: bigint; // 用户最后一次质押的时间
  lastClaimTimes: bigint; // 用户最后一次领取奖励的时间
  lastUnstakeTimes: bigint; // 用户最后一次解质押的时间
  totalRewardsByUser: bigint; // 用户在该池子中获得的总奖励
  totalClaimedByUser: bigint; // 用户在该池子中已领取的总奖励
  unstakeRequests: UnstakeRequest[]; // 用户的解质押请求队列
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
