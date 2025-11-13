// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// 自定义错误类型以提高gas效率
error IndexOutOfBounds(); // 索引超出范围
error ExceedsMaxSupply(uint256 requested, uint256 available); // 超过最大供应量
error ZeroAddress(); // 零地址错误
error ZeroAmount(); // 零金额错误
error InsufficientBalance(uint256 requested, uint256 available); // 余额不足
error BlacklistedAddress(address account); // 地址被列入黑名单
error AddressNotBlacklisted(address account); // 地址未被列入黑名单
error ArrayLengthMismatch(uint256 recipientsLength, uint256 amountsLength); // 数组长度不匹配
error CooldownNotMet(uint256 timeRemaining); // 冷却时间未满足
error RecoveryAmountTooLarge(uint256 requested, uint256 maxAllowed); // 恢复金额过大
error EmptyArray(); // 空数组错误
error OwnTokenRecoveryNotAllowed(); // 不允许恢复自己的代币
error RecoveryAmountTooSmall(uint256 requested, uint256 minimum); // 恢复金额过小
error InvalidConfirmationHash(); // 无效的确认哈希
error NotInStakingPeriod(); // 不在质押周期内
error StakingPeriodAlreadyStarted(); // 质押周期已开始
error MinPledgeNotMet(uint256 minimumRequired); // 未满足最小质押要求
error RequestUnstakeFailed(uint256 requestCount); // 请求解质押失败
error FailedToProcessFullAmount(); // 未能处理全部金额
error InsufficientRewardPool(); // 奖励池不足
