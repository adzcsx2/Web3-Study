// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
// 团队成员激励结构体
struct TeamMemberInspire {
    uint256 allocation; // 分配数量
    uint256 claimed; // 已领取数量
    uint256 lastClaimTime; // 上次领取时间
    uint256 claimStartTime; // 奖励开始释放时间
    uint256 claimEndTime; // 奖励结束释放时间
}
// 空投轮次信息
struct AirdropRound {
    bytes32 merkleRoot;
    uint256 startTime;
    uint256 endTime;
    bool isActive;
}

// 私募投资者信息
struct PrivateSaleInvestor {
    uint256 purchased; // 总分配数量
    uint256 claimed; // 已领取数量
    uint256 lastClaimTime; // 上次领取时间
    uint256 claimStartTime; // 奖励开始释放时间
    uint256 claimEndTime; // 奖励结束释放时间
}

// 私募轮次信息
struct PrivateSaleRound {
    uint256 rate; // 兑换率
    uint256 startTime; // 轮次开始时间
    uint256 endTime; // 轮次结束时间
    uint256 cap; // 轮次总额度
    uint256 totalSold; // 已售出数量
    bool isActive; // 轮次是否激活
}

/**
 * LP 池配置结构体
 */
struct LpPoolConfig {
    address tokenA;
    address tokenB;
    uint24 fee;
    uint256 allocPoint;
}

// LP 池信息
struct LpPoolInfo {
    address lpToken; // LP Token 或 NFT 合约地址
    uint256 allocPoint; // 分配点数
    uint256 lastRewardTime; // 上次奖励时间
    uint256 accNextSwapPerShare; // 每份额累计的奖励
    uint256 totalStaked; // 总质押数量
    bool isActive; // 池是否激活
}

// LP NFT 质押信息
struct LpNftStakeInfo {
    address owner; // NFT 所有者
    uint256 tokenId; // NFT Token ID
    uint256 liquidity; // 流动性数量
    uint256 stakedAt; // 质押时间
    uint256 receivedReward; //已领取奖励
    uint256 pendingRewards; // 待领取奖励
    uint256 lastClaimAt; // 上次领取奖励时间
    uint256 requestedUnstakeAt; // 请求解除质押时间
}

// 用户在某个池中的质押信息
struct UserStakeInfo {
    uint256 amount; // 质押数量（ERC20模式）
    uint256[] nftTokenIds; // 质押的NFT ID列表（NFT模式）
    uint256 rewardDebt; // 奖励债务
    uint256 pendingRewards; // 待领取奖励
}
