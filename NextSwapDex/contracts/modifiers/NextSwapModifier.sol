// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title CustomModifier
 * @notice 提供可重用的修饰符
 */

import "../constants/Constants.sol";
import "../errors/NextSwapErrors.sol";

abstract contract NextSwapModifier {
    /**
     * @notice 时间限制修饰符
     * @param startTime 开始时间戳
     * @param endTime 结束时间戳
     */
    modifier TimeRestricted(uint256 startTime, uint256 endTime) {
        if (block.timestamp < startTime || block.timestamp > endTime) {
            revert DonationPeriodNotActive();
        }
        _;
    }
    //零地址检查
    modifier nonZeroAddress(address addr) {
        if (addr == address(0)) {
            revert CallerIsZeroAddress();
        }
        _;
    }
    // 非管理员角色检查
    modifier nonAdminRole(bytes32 role) {
        if (role == DEFAULT_ADMIN_ROLE) {
            revert CannotOperateAdminRole();
        }
        _;
    }
    // 非时间锁角色检查
    modifier nonTimeLockRole(bytes32 role) {
        if (role == TIMELOCK_ROLE) {
            revert CannotOperateTimelockRole();
        }
        _;
    }
    // 数量大于零检查
    modifier amountGreaterThanZero(uint256 amount) {
        if (amount == 0) {
            revert AmountMustBeGreaterThanZeroModifier();
        }
        _;
    }
    // 余额是否有足够数量检查
    modifier hasSufficientBalance(uint256 balance, uint256 amount) {
        if (balance < amount) {
            revert InsufficientBalanceModifier();
        }
        _;
    }

    // 时间需要大于当前时间检查
    modifier timeInFuture(uint256 time) {
        if (time <= block.timestamp) {
            revert TimeMustBeInFuture();
        }
        _;
    }
    // 结束时间需要大于开始时间检查
    modifier endTimeAfterStartTime(uint256 startTime, uint256 endTime) {
        if (endTime <= startTime) {
            revert EndTimeMustBeAfterStartTime();
        }
        _;
    }
}
