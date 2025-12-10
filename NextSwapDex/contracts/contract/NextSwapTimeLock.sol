// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title NextswapTimelock
 * @dev NextswapTimelock
 */
import "@openzeppelin/contracts/governance/TimelockController.sol";

contract NextswapTimelock is TimelockController {
    /**
     * @dev 构造函数
     * @param minDelay 最小延迟时间(秒) - 建议 2 天 = 172800 秒
     * @param proposers 提案者地址数组 - 可以调度操作的地址
     * @param executors 执行者地址数组 - 可以执行操作的地址
     * @param admin 管理员地址 - 可以授予/撤销角色
     */
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {}
}
