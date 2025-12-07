// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PublicPausable.sol";

/**
 * @title PublicWithdrawable
 * @notice 可提取合约基础库 - 提供安全的误转资金回收功能
 * @dev 为子合约提供误转资金（ERC20/ETH）的安全提取能力
 *
 * 核心功能：withdraw（提取代币）、receive（接收 ETH）、暂停机制
 * 安全特性：重入保护、SafeERC20、零地址检查、余额验证
 *
 * ⚠️ 重要：本合约不保护业务代币，子合约需重写 withdraw 方法保护重要代币
 *
 * @custom:security-contact security@example.com
 */
abstract contract PublicWithdrawable is ReentrancyGuard, PublicPausable {
    using SafeERC20 for IERC20;

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

    // ====== 资金提取 ======

    /**
     * @notice 提取误转入合约的代币或原生 ETH
     * @dev 默认实现不保护业务代币，子合约应重写此方法保护重要代币
     *
     * @param tokenAddress 代币地址（address(0) 表示 ETH）
     * @param to 接收地址
     * @param amount 提取数量
     *
     * 安全机制：权限控制、重入保护、暂停检查、零地址检查、余额验证、SafeERC20
     */
    function withdraw(
        address tokenAddress,
        address to,
        uint256 amount
    ) external virtual nonReentrant whenNotPaused _nonZeroAddress(to) {
        _checkOwner();
        require(amount > 0, "Zero amount");

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

    // ====== ETH 接收 ======

    /**
     * @notice 接收原生 ETH 转账
     * @dev 接收的 ETH 可通过 withdraw(address(0), ...) 提取
     */
    receive() external payable virtual {
        emit _FundReceived(address(0), msg.value, msg.sender);
    }
}
