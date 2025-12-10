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

//主网地址
address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
address constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
address constant TBTC = 0x8dAEBADE922dF735c38C80C7eBD708Af50815fAa;
address constant WBTC = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
// 测试网地址

