// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PublicPausable.sol";

/**
 * @title PublicWithdrawable
 * @notice 可提取合约基础库 - 提供安全的误转资金回收功能
 * @dev 为子合约提供误转资金（ERC20/ETH）的安全提取能力，同时保护业务代币不被误提取
 *
 * 核心功能：emergencyWithdraw（提取代币）、receive（接收 ETH）、暂停机制
 * 安全特性：重入保护、SafeERC20、零地址检查、余额验证、业务代币保护
 *
 * ✅ 业务代币保护：通过 originalTokenAddress 白名单机制，禁止提取业务核心代币
 * ⚠️ 仅可提取误转入的其他代币或 ETH，保障合约核心资产安全
 *
 * @custom:security-contact security@example.com
 */
abstract contract PublicWithdrawable is ReentrancyGuard, PublicPausable {
    using SafeERC20 for IERC20;

    // 业务代币合约地址
    address public immutable originalTokenAddress;

    constructor(address _tokenAddress) {
        originalTokenAddress = _tokenAddress;
    }

    // ====== 事件 ======

    /**
     * @notice 资金回收事件
     * @param token 代币地址（address(0) 表示 ETH）
     * @param to 接收地址
     * @param amount 回收数量
     * @param operator 操作者地址
     */
    event _EmergencyTokenRecovered(
        address indexed token,
        address indexed to,
        uint256 amount,
        address indexed operator
    );
    /**
     * @notice 原生(业务)代币提取事件
     * @param token 代币地址
     * @param to 接收地址
     * @param amount 回收数量
     * @param operator 操作者地址
     */
    event _WithdrawOriginalToken(
        address indexed token,
        address indexed to,
        uint256 amount,
        address indexed operator
    );

    /**
     * @notice 资金接收事件
     * @param token 代币地址（ETH 为 address(0)）
     * @param amount 接收数量
     * @param from 发送者地址
     */
    event _FundReceived(
        address indexed token,
        uint256 amount,
        address indexed from
    );

    // ====== 修饰符 ======

    /**
     * @dev 零地址检查修饰符
     * @param addr 待检查的地址
     */
    modifier _nonZeroAddress(address addr) {
        require(addr != address(0), "Zero address");
        _;
    }

    // ====== 抽象函数 ======

    /**
     * @dev 提取权限检查
     * @notice 子合约必须实现此方法以控制 withdraw 函数的访问权限
     */
    function _checkOwner() internal view virtual;

    /**
     * @dev 设置原生(业务)代币提取的时间点
     * @notice 子合约必须实现此方法以开启业务代币的紧急提取功能
     */
    function _withdrawOringinTokenExpiry()
        internal
        view
        virtual
        returns (uint256)
    {
        return 0;
    }

    // ====== 资金提取 ======

    /**
     * @notice 提取误转入合约的代币或原生 ETH
     * @dev 已实现业务代币保护，禁止提取 originalTokenAddress 指定的核心业务代币
     *
     * @param tokenAddress 代币地址（address(0) 表示 ETH）
     * @param to 接收地址
     * @param amount 提取数量
     *
     * 保护机制：
     * - ✅ 业务代币白名单保护：禁止提取 originalTokenAddress
     * - ✅ 权限控制：仅授权地址可调用
     * - ✅ 重入攻击防护：nonReentrant 修饰符
     * - ✅ 暂停机制：支持紧急暂停
     * - ✅ 参数验证：零地址检查、余额验证
     * - ✅ 安全转账：使用 SafeERC20
     */
    function emergencyWithdraw(
        address tokenAddress,
        address to,
        uint256 amount
    ) external virtual nonReentrant whenNotPaused _nonZeroAddress(to) {
        _checkOwner();
        require(amount > 0, "Zero amount");
        require(
            tokenAddress != originalTokenAddress,
            "cannot withdraw original token"
        );

        if (tokenAddress == address(0)) {
            // 提取原生 ETH
            require(address(this).balance >= amount, "Insufficient balance");
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "Transfer failed");
        } else {
            // 提取 ERC20 代币
            IERC20 token = IERC20(tokenAddress);
            require(
                token.balanceOf(address(this)) >= amount,
                "Insufficient balance"
            );
            token.safeTransfer(to, amount);
        }

        emit _EmergencyTokenRecovered(tokenAddress, to, amount, msg.sender);
    }

    /**
     * 紧急提取业务代币（仅在紧急情况下，且经过时间锁后可用）
     */
    function withdrawOriginalToken(
        address to,
        uint256 amount
    ) external virtual nonReentrant whenNotPaused _nonZeroAddress(to) {
        _checkOwner();
        require(amount > 0, "Zero amount");
        uint256 withdrawOringinTokenExpiry = _withdrawOringinTokenExpiry();
        require(
            withdrawOringinTokenExpiry > 0,
            "Emergency withdrawal not enabled"
        );
        require(
            block.timestamp >= withdrawOringinTokenExpiry,
            "Emergency withdrawal not allowed yet"
        );
        IERC20 token = IERC20(originalTokenAddress);
        require(
            token.balanceOf(address(this)) >= amount,
            "Insufficient balance"
        );
        token.safeTransfer(to, amount);
        emit _WithdrawOriginalToken(
            originalTokenAddress,
            to,
            amount,
            msg.sender
        );
    }

    // ====== ETH 接收 ======

    /**
     * @notice 接收原生 ETH 转账
     * @dev 接收的 ETH 可通过 withdraw(address(0), ...) 提取
     */
    receive() external payable virtual {
        emit _FundReceived(address(0), msg.value, msg.sender);
    }
}
