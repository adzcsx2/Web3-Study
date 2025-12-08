// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// 常量定义

// 角色定义
bytes32 constant TIMELOCK_ROLE = keccak256("TIMELOCK_ROLE"); // 时间锁角色
bytes32 constant PAUSER_ROLE = keccak256("PAUSER_ROLE"); // 暂停角色
bytes32 constant DEFAULT_ADMIN_ROLE = 0x00; // 默认管理员角色

// 代币总量定义
uint256 constant LIQUIDITY_MINING_TOTAL = 500_000_000 * 10 ** 18; // 流动性挖矿代币总量：5亿
uint256 constant AIRDROP_TOTAL = 50_000_000 * 10 ** 18; // 空投代币总量：5千万
uint256 constant TEAM_TOTAL = 150_000_000 * 10 ** 18; // 团队代币总量：1.5亿
uint256 constant ECOSYSTEM_FUND_TOTAL = 200_000_000 * 10 ** 18; // 生态基金代币总量：2亿
uint256 constant PRIVATE_SALE_TOTAL = 100_000_000 * 10 ** 18; // 私募轮代币总量：1亿
