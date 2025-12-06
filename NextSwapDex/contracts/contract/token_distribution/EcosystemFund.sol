// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "../../constants/Constants.sol";
import "../../modifiers/NextSwapModifier.sol";
import "../NextSwapToken.sol";
import "../../events/NextSwapEvents.sol";

/**
 * @title EcosystemFund
 * @dev 生态基金合约
 */

contract EcosystemFund is
    Ownable2Step,
    ReentrancyGuard,
    Pausable,
    NextSwapModifier,
    NextSwapEvents
{
    using Constants for *;
    using SafeERC20 for IERC20;

    constructor(address initialOwner) Ownable(initialOwner) {
        // Ownable2Step 会自动从 Ownable 继承
    }

    // ====== 紧急控制函数 ======
    /**
     * @dev 暂停合约（紧急情况）
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev 恢复合约
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ====== 治理：提取 ETH（如果误收）======
    function withdrawETH(
        address payable to,
        uint256 amount
    ) external onlyOwner nonReentrant whenNotPaused {
        require(to != address(0), "Invalid recipient");
        require(amount <= address(this).balance, "Insufficient balance");
        to.transfer(amount);
        emit EmergencyTokenRecovered(address(0), to, amount, msg.sender);
    }
    function withdrawERC20(
        address tokenAddress,
        address to,
        uint256 amount
    )
        external
        onlyOwner
        nonReentrant
        whenNotPaused
        nonZeroAddress(tokenAddress)
        nonZeroAddress(to)
    {
        IERC20 token = IERC20(tokenAddress);
        uint256 contractBalance = token.balanceOf(address(this));
        require(amount <= contractBalance, "Insufficient token balance");
        token.safeTransfer(to, amount);
        emit EmergencyTokenRecovered(tokenAddress, to, amount, msg.sender);
    }

    // ====== 安全：接收 ETH ======
    receive() external payable {
        emit FundReceived(address(0), msg.value, msg.sender);
    }
}
