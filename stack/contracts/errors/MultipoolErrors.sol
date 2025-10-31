// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @notice MultipoolErrors - 多币种质押池错误定义
 * @dev 定义多币种质押池相关的所有自定义错误，统一管理错误类型，便于调试和用户体验优化
 */

// ========================================
// 池子管理相关错误
// ========================================
error PoolNotExists(uint256 poolId);                    // 池子不存在
error PoolNotActive(uint256 poolId);                    // 池子未开放质押
error PoolAlreadyStarted(uint256 poolId);               // 池子已经启动
error PoolNotStarted(uint256 poolId);                   // 池子尚未启动
error PoolAlreadyEnded(uint256 poolId);                 // 池子已经结束
error InvalidPoolParameters();                          // 无效的池子参数
error PoolNameEmpty();                                  // 池子名称为空
error MaxPoolsReached(uint256 maxPools);                // 达到最大池子数量限制
error PoolAlreadyActive(uint256 poolId);                // 池子已开放质押
error CannotDeactivatePoolWithStakes(uint256 poolId, uint256 totalStaked); // 无法停用有质押的池子

// ========================================
// 代币相关错误
// ========================================
error InvalidStakeToken(address token);                 // 无效的质押代币地址
error InvalidRewardToken(address token);                // 无效的奖励代币地址
error SameTokenNotAllowed();                            // 不允许质押代币和奖励代币相同
error TokenAlreadyUsedInPool(address token, uint256 existingPoolId); // 代币已在其他池子中使用

// ========================================
// 用户操作相关错误
// ========================================
error UserNotInPool(address user, uint256 poolId);      // 用户未参与该池子
error InsufficientStakeAmount(uint256 requested, uint256 available, uint256 poolId); // 质押数量不足
error InsufficientRewardBalance(uint256 requested, uint256 available, uint256 poolId); // 奖励余额不足
error PoolCooldownNotMet(uint256 poolId, uint256 remainingTime); // 冷却期未满

// ========================================
// 数额验证错误
// ========================================
error InvalidPoolRewards(uint256 amount);               // 无效的池子奖励数量
error InvalidPoolDuration(uint256 duration);            // 无效的池子持续时间
error PoolMinDepositTooLow(uint256 amount);             // 最小质押金额过低