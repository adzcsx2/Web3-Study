// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// 自定义错误类型以提高gas效率
error ExceedsMaxSupply(uint256 requested, uint256 available);
error ZeroAddress();
error ZeroAmount();
error InsufficientBalance(uint256 requested, uint256 available);
error BlacklistedAddress(address account);
error ArrayLengthMismatch(uint256 recipientsLength, uint256 amountsLength);
error CooldownNotMet(uint256 timeRemaining);
error RecoveryAmountTooLarge(uint256 requested, uint256 maxAllowed);
error EmptyArray();
error OwnTokenRecoveryNotAllowed();
error RecoveryAmountTooSmall(uint256 requested, uint256 minimum);
error InvalidConfirmationHash();
