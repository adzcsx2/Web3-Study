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
