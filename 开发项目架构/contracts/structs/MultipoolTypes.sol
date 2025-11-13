// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MultipoolTypes - 多币种质押池数据结构定义
 * @notice 定义多币种质押池所需的数据结构
 * @dev 统一管理数据结构，确保类型安全和一致性
 */

// ========================================
// 池子配置信息
// ========================================
struct PoolInfo {
    IERC20 stakeToken;              // 质押代币合约地址
    IERC20 rewardToken;             // 奖励代币合约地址
    uint256 totalRewards;           // 池子总奖励量
    uint256 rewardRate;             // 每秒奖励率（wei/秒）
    uint256 totalRewardsIssued;     // 已发放的奖励总量
    uint256 startTime;              // 质押开始时间戳
    uint256 endTime;                // 质押结束时间戳
    uint256 totalStaked;            // 池子总质押量
    uint256 lastUpdateTime;         // 奖励计算的最后更新时间
    uint256 rewardPerTokenStored;   // 每个质押代币的累计奖励
    uint256 minDepositAmount;       // 最小质押金额要求
    bool isOpenForStaking;          // 池子是否开放质押
    uint256 cooldownPeriod;         // 解质押冷却期（秒）
    string name;                    // 池子显示名称
}

// ========================================
// 用户在特定池子中的信息
// ========================================
struct UserPoolInfo {
    uint256 userRewardPerTokenPaid; // 用户已领取的每代币奖励记录
    uint256 rewards;                // 用户当前可领取的奖励
    uint256 balances;               // 用户在该池子中的质押余额
    uint256 stakeTimestamps;        // 用户首次质押的时间戳
    uint256 lastStakeTimes;         // 用户最后一次质押的时间
    uint256 lastClaimTimes;         // 用户最后一次领取奖励的时间
    uint256 lastUnstakeTimes;       // 用户最后一次解质押的时间
    uint256 totalRewardsByUser;     // 用户在该池子中获得的总奖励
    uint256 totalClaimedByUser;     // 用户在该池子中已领取的总奖励
    UnstakeRequest[] unstakeRequests; // 用户的解质押请求队列
}

// ========================================
// 解质押请求结构体
// ========================================
struct UnstakeRequest {
    uint256 amount;                 // 请求解质押的数量
    uint256 unlockBlock;            // 解锁的区块号
}

// ========================================
// 池子创建参数
// ========================================
struct CreatePoolParams {
    IERC20 stakeToken;              // 质押代币合约
    IERC20 rewardToken;             // 奖励代币合约
    uint256 totalRewards;           // 总奖励数量
    uint256 minDepositAmount;       // 最小质押金额（0 = 使用默认值）
    uint256 cooldownPeriod;         // 冷却期时长（秒，0 = 使用默认值）
    string name;                    // 池子名称
}