// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MultipoolEvents - 多币种质押池事件定义
 * @notice 定义多币种质押池相关的所有事件
 * @dev 统一管理事件，便于前端监听和数据分析
 */

// ========================================
// 池子管理事件
// ========================================

/**
 * @notice 池子创建事件
 * @param poolId 池子ID
 * @param stakeToken 质押代币地址
 * @param rewardToken 奖励代币地址
 * @param totalRewards 总奖励数量
 * @param duration 池子持续时间
 * @param name 池子名称
 */
event PoolCreated(
    uint256 indexed poolId,
    address indexed stakeToken,
    address indexed rewardToken,
    uint256 totalRewards,
    uint256 duration,
    string name
);

/**
 * @notice 池子参数更新事件
 * @param poolId 池子ID
 * @param newTotalRewards 新的总奖励数量
 * @param newRewardRate 新的奖励速率
 */
event PoolUpdated(
    uint256 indexed poolId,
    uint256 newTotalRewards,
    uint256 newRewardRate
);

/**
 * @notice 池子激活状态变更事件
 * @param poolId 池子ID
 * @param isActive 是否激活
 */
event PoolActivated(uint256 indexed poolId, bool isActive);

/**
 * @notice 池子启动事件
 * @param poolId 池子ID
 * @param startTime 开始时间戳
 * @param endTime 结束时间戳
 * @param rewardRate 奖励速率（每秒代币数）
 */
event PoolStarted(
    uint256 indexed poolId,
    uint256 startTime,
    uint256 endTime,
    uint256 rewardRate
);

// ========================================
// 用户操作事件
// ========================================

/**
 * @notice 用户质押事件
 * @param user 用户地址
 * @param poolId 池子ID
 * @param amount 质押数量
 * @param stakeToken 质押代币地址
 */
event StakedInPool(
    address indexed user,
    uint256 indexed poolId,
    uint256 amount,
    address stakeToken
);

/**
 * @notice 用户解质押事件
 * @param user 用户地址
 * @param poolId 池子ID
 * @param amount 解质押数量
 * @param stakeToken 质押代币地址
 */
event UnstakedFromPool(
    address indexed user,
    uint256 indexed poolId,
    uint256 amount,
    address stakeToken
);

/**
 * @notice 用户领取奖励事件
 * @param user 用户地址
 * @param poolId 池子ID
 * @param amount 领取的奖励数量
 * @param rewardToken 奖励代币地址
 */
event RewardsClaimedFromPool(
    address indexed user,
    uint256 indexed poolId,
    uint256 amount,
    address rewardToken
);

/**
 * @notice 用户请求解质押事件
 * @param user 用户地址
 * @param poolId 池子ID
 * @param amount 请求解质押数量
 * @param unlockBlock 解锁区块号
 */
event RequestUnstakeFromPool(
    address indexed user,
    uint256 indexed poolId,
    uint256 amount,
    uint256 unlockBlock
);

// ========================================
// 管理员操作事件
// ========================================

/**
 * @notice 管理员向池子存入奖励代币事件
 * @param poolId 池子ID
 * @param token 代币地址
 * @param amount 存入数量
 * @param depositor 存入者地址
 */
event RewardTokensDeposited(
    uint256 indexed poolId,
    address indexed token,
    uint256 amount,
    address indexed depositor
);

/**
 * @notice 紧急提取事件
 * @param poolId 池子ID
 * @param token 代币地址
 * @param amount 提取数量
 * @param admin 管理员地址
 */
event EmergencyWithdrawFromPool(
    uint256 indexed poolId,
    address indexed token,
    uint256 amount,
    address indexed admin
);

/**
 * @notice 池子冷却期更新事件
 * @param poolId 池子ID
 * @param oldCooldown 旧冷却期
 * @param newCooldown 新冷却期
 */
event PoolCooldownUpdated(
    uint256 indexed poolId,
    uint256 oldCooldown,
    uint256 newCooldown
);

/**
 * @notice 池子最小质押金额更新事件
 * @param poolId 池子ID
 * @param oldMinDeposit 旧最小质押金额
 * @param newMinDeposit 新最小质押金额
 */
event PoolMinDepositUpdated(
    uint256 indexed poolId,
    uint256 oldMinDeposit,
    uint256 newMinDeposit
);