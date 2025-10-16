// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// 增强事件用于更好的追踪
event TokenMinted(address indexed to, uint256 amount, address indexed minter);
event TokenBurned(address indexed from, uint256 amount, address indexed burner);
event ContractUpgraded(
    address indexed oldImplementation,
    address indexed newImplementation,
    uint256 version
);
event EmergencyPause(address indexed pauser, uint256 timestamp);
event EmergencyUnpause(address indexed unpauser, uint256 timestamp);
event SupplyCapUpdated(uint256 oldCap, uint256 newCap);

event BlacklistUpdated(address indexed account, bool isBlacklisted);
event TransferCooldownUpdated(uint256 newCooldown);
event OwnTokenRecoveryAttempted(
    address indexed admin,
    uint256 amount,
    uint256 timestamp
);
event OwnTokenRecovered(address indexed admin, uint256 amount);
event OwnTokenRecoveryDisabled(address indexed admin, uint256 timestamp);
event TokenRecovered(address indexed token, uint256 amount);

//质押事件
event Staked(address user, uint256 amount);
event Unstaked(address user, uint256 amount);
event RewardsClaimed(address user, uint256 amount);
event RewardRateUpdated(uint256 newRate);
event TotalRewardsUpdated(uint256 newTotalRewards, uint256 remainRewards);
event RequestUnstake(address user, uint256 amount, uint256 unlockBlock);
