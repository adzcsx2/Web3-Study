// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../lib/PublicWithdrawable.sol";
import "../NextswapToken.sol";

import "../../constants/Constants.sol";
import "../../modifiers/NextswapModifiers.sol";
import "../../events/NextswapEvents.sol";

/**
 * @title EcosystemFund
 * @dev 生态基金合约
 */

contract EcosystemFund is Ownable2Step, PublicWithdrawable, NextswapModifiers {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;

    constructor(
        address _tokenAddress,
        address initialOwner
    ) Ownable(initialOwner) PublicWithdrawable(_tokenAddress) {
        // Ownable2Step 会自动从 Ownable 继承
        token = IERC20(_tokenAddress);
    }
    //------------------------------------------ override functions ------------------------------------------

    function _checkOwner() internal view override(Ownable, PublicWithdrawable) {
        super._checkOwner();
    }

    function _checkPauser() internal view override {
        super._checkOwner();
    }

    // 业务代币过期时间设为当前时间，允许随时提取
    function _withdrawOringinTokenExpiry()
        internal
        view
        override
        returns (uint256)
    {
        return block.timestamp;
    }
}
