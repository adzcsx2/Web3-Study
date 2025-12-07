// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title CustomModifier
 * @notice 提供可重用的修饰符
 */

import "../constants/Constants.sol";

abstract contract NextSwapModifier {
    using Constants for *;
    /**
     * @notice 时间限制修饰符
     * @param startTime 开始时间戳
     * @param endTime 结束时间戳
     */
    modifier TimeRestricted(uint256 startTime, uint256 endTime) {
        require(
            block.timestamp >= startTime && block.timestamp <= endTime,
            "Donation period is not active"
        );
        _;
    }
    //零地址检查
    modifier nonZeroAddress(address addr) {
        require(addr != address(0), "caller is the zero address");
        _;
    }
    // 非管理员角色检查
    modifier nonAdminRole(bytes32 role) {
        require(
            role != Constants.DEFAULT_ADMIN_ROLE,
            "cannot operate admin role"
        );
        _;
    }
    // 非时间锁角色检查
    modifier nonTimeLockRole(bytes32 role) {
        require(
            role != Constants.TIMELOCK_ROLE,
            "cannot operate timelock role"
        );
        _;
    }
    // 数量大于零检查
    modifier amountGreaterThanZero(uint256 amount) {
        require(amount > 0, "amount must be greater than zero");
        _;
    }
    // 余额是否有足够数量检查
    modifier hasSufficientBalance(uint256 balance, uint256 amount) {
        require(balance >= amount, "insufficient balance");
        _;
    }

    // 时间需要大于当前时间检查
    modifier timeInFuture(uint256 time) {
        require(time > block.timestamp, "time must be in the future");
        _;
    }
    // 结束时间需要大于开始时间检查
    modifier endTimeAfterStartTime(uint256 startTime, uint256 endTime) {
        require(endTime > startTime, "endTime must be after startTime");
        _;
    }
}
