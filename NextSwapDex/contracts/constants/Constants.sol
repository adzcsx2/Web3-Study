// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
/**
 * @title Constants
 * @dev 常量定义
 */

library Constants {
    bytes32 constant TIMELOCK_ROLE = keccak256("TIMELOCK_ROLE");
    bytes32 constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 constant DEFAULT_ADMIN_ROLE = 0x00;

    //流动性挖矿代币总量
    uint256 constant LIQUIDITY_MINING_TOTAL = 500_000_000 * 10 ** 18;
    //空投代币总量
    uint256 constant AIRDROP_TOTAL = 50_000_000 * 10 ** 18;
    //团队代币总量
    uint256 constant TEAM_TOTAL = 150_000_000 * 10 ** 18;
    //生态基金代币总量
    uint256 constant ECOSYSTEM_FUND_TOTAL = 200_000_000 * 10 ** 18;
    // 私募轮代币总量
    uint256 constant PRIVATE_SALE_TOTAL = 100_000_000 * 10 ** 18;

    // 团队成员激励结构体
    struct TeamMemberInspire {
        uint256 allocation; // 分配数量
        uint256 claimed; // 已领取数量
        uint256 lastClaimTime; // 上次领取时间
        uint256 claimStartTime; // 奖励开始释放时间
    }
}
