// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "../lib/PublicWithdrawable.sol";
import "../NextSwapToken.sol";

import "../../constants/Constants.sol";
import "../../modifiers/NextSwapModifier.sol";
import "../../events/NextSwapEvents.sol";
/**
 * @title PrivateSale
 * @dev 私募合约
 */
contract PrivateSale is
    Ownable2Step,
    PublicWithdrawable,
    NextSwapModifier,
    NextSwapEvents
{
    using Constants for *;
    using SafeERC20 for IERC20;
    IERC20 public immutable token;

    constructor(
        address _tokenAddress,
        address initialOwner
    ) Ownable(initialOwner) PublicWithdrawable(_tokenAddress) {
        // Ownable2Step 会自动从 Ownable 继承
        token = IERC20(_tokenAddress);
    }

    //------------------------------------- override functions ------------------------------------------
    /**
     * @dev 实现 PublicWithdrawable 的 _checkOwner，使用 Ownable 的权限检查
     * @notice 使用 super 确保正确遵循继承链
     */
    function _checkOwner() internal view override(Ownable, PublicWithdrawable) {
        super._checkOwner();
    }

    /**
     * @dev 实现 PublicPausable 的 _checkPauser，只有 owner 可以暂停/恢复
     */
    function _checkPauser() internal view override {
        super._checkOwner();
    }
}
