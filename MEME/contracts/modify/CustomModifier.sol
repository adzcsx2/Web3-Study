// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title CustomModifier
 * @notice 提供可重用的修饰符
 */
abstract contract CustomModifier {
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
    modifier NonZeroAddress(address addr) {
        require(addr != address(0), "Address cannot be zero");
        _;
    }
}
