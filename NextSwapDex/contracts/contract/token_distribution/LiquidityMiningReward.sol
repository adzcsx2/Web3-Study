// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 #### 流动性挖矿（50% - 5 亿 NST）

- **释放周期**：4 年（48 个月）
- **每日释放**：约 342,465 NST
- **释放机制**：
  - 自动进入挖矿合约
  - 根据流动性贡献分配
  - 支持多池挖矿激励
 */
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "../../events/NextSwapEvents.sol";
import "../../modifiers/NextSwapModifier.sol";
import "../../errors/NextSwapErrors.sol";

contract LiquidityMiningReward is
    AccessControl,
    ReentrancyGuard,
    Pausable,
    NextSwapModifier
{
    using SafeERC20 for IERC20;
    // 生态基金地址
    address public ecosystemFundAddress;
    // NextSwap代币合约地址
    IERC20 public immutable nextSwapToken;

    uint256 public immutable startTime; //开始时间
    uint256 public immutable endTime; //结束时间 4年后
    uint256 public immutable claimDeadline; //奖励领取截止时间 -- 结束时间后1年

    //已发放代币总量
    uint256 public totalDistributed;

    //用户奖励映射
    mapping(address => uint256) public rewards;

    constructor(
        address tokenAddress,
        address _ecosystemFundAddress,
        uint256 _startTime
    ) {
        nextSwapToken = IERC20(tokenAddress);
        ecosystemFundAddress = _ecosystemFundAddress;

        startTime = _startTime;
        endTime = _startTime + 4 * 365 days; // 4年后
        claimDeadline = endTime + 365 days; // 结束时间后1年
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev 设置生态基金地址
     * @param newAddress 新地址
     */
    function setEcosystemFundAddress(
        address newAddress
    ) external onlyRole(DEFAULT_ADMIN_ROLE) nonZeroAddress(newAddress) {
        emit EcosystemFundAddressChanged(ecosystemFundAddress, newAddress);
        ecosystemFundAddress = newAddress;
    }

    // 奖励领取截止,所有剩余代币打入生态基金地址
    function finalizeRewards() external nonReentrant whenNotPaused {
        if (block.timestamp <= claimDeadline) {
            revert ClaimDeadlineHasNotPassed();
        }
        uint256 contractBalance = nextSwapToken.balanceOf(address(this));
        if (contractBalance > 0) {
            nextSwapToken.safeTransfer(ecosystemFundAddress, contractBalance);
            emit FinalizeRewards(ecosystemFundAddress, contractBalance);
        }
    }

    // ====== 紧急控制函数 ======
    /**
     * @dev 暂停合约（紧急情况）
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev 恢复合约
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ---------------------------------------view functions----------------------------------------
    // 计算已解锁代币数量
    function calculateReleasedTokens() public view returns (uint256) {
        if (block.timestamp <= startTime) {
            return 0;
        } else if (block.timestamp >= endTime) {
            return LIQUIDITY_MINING_TOTAL;
        } else {
            uint256 elapsedTime = block.timestamp - startTime;
            uint256 totalDuration = endTime - startTime;
            return
                (LIQUIDITY_MINING_TOTAL * elapsedTime) /
                totalDuration;
        }
    }
}
