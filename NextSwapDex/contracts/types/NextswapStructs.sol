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
