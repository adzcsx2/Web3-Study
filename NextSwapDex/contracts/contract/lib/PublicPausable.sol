// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PublicPausable
 * @notice 可暂停合约基础库 - 提供紧急暂停功能
 * @dev 为子合约提供统一的暂停/恢复机制，支持独立的暂停权限控制
 *
 * 核心功能：pause（暂停合约）、unpause（恢复合约）
 * 继承自 OpenZeppelin Pausable，提供标准化的暂停机制和事件
 *
 * @custom:security-contact security@example.com
 */
abstract contract PublicPausable is Pausable {
    // ====== 抽象函数 ======

    /**
     * @dev 暂停权限检查
     * @notice 子合约必须实现此方法以控制 pause/unpause 函数的访问权限
     */
    function _checkPauser() internal view virtual;

    // ====== 暂停控制 ======

    /**
     * @notice 暂停合约
     * @dev 禁用所有带 whenNotPaused 修饰符的函数，触发 Paused 事件
     */
    function pause() public virtual {
        _checkPauser();
        _pause();
    }

    /**
     * @notice 恢复合约
     * @dev 启用所有带 whenNotPaused 修饰符的函数，触发 Unpaused 事件
     */
    function unpause() public virtual {
        _checkPauser();
        _unpause();
    }
}
