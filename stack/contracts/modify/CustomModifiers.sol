// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import "../errors/CustomErrors.sol";

abstract contract CustomModifiers {
    // 0地址判断
    modifier onlyValidAddress(address _address) {
        if (_address == address(0)) revert ZeroAddress();
        _;
    }
    // 0币量判断
    modifier onlyPositiveAmount(uint256 _amount) {
        if (_amount == 0) revert ZeroAmount();
        _;
    }
    // 质押时间判断
    modifier onlyDuringStakingPeriod(uint256 startTime, uint256 endTime) {
        if (block.timestamp < startTime || block.timestamp > endTime)
            revert NotInStakingPeriod();
        _;
    }
    // 限制合约调用频次
    modifier onlyAfterCooldown(
        address account,
        mapping(address => uint256) storage lastActionTimes,
        uint256 cooldown
    ) {
        uint256 lastActionTime = lastActionTimes[account];
        if (block.timestamp < lastActionTime + cooldown) {
            uint256 timeRemaining = (lastActionTime + cooldown) -
                block.timestamp;
            revert CooldownNotMet(timeRemaining);
        }
        _;
    }
}
