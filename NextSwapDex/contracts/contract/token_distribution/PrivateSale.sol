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
import "../../structs/NextSwapStructs.sol";
import "../../errors/NextSwapErrors.sol";
/**
 * @title PrivateSale
 * @dev 私募合约
 */
contract PrivateSale is
    Ownable2Step,
    PublicWithdrawable,
    NextSwapModifier
{
    using SafeERC20 for IERC20;

    IERC20 public immutable token;

    mapping(address => PrivateSaleInvestor) public privateSaleInvestors;

    mapping(uint256 => PrivateSaleRound) public privateSaleRounds;
    uint256 public currentRound;

    // 余额警告阈值（百分比），当合约余额低于此阈值时触发警告
    uint256 public constant LOW_BALANCE_THRESHOLD = 10; // 10%

    constructor(
        address _tokenAddress,
        address initialOwner
    ) Ownable(initialOwner) PublicWithdrawable(_tokenAddress) {
        // Ownable2Step 会自动从 Ownable 继承
        token = IERC20(_tokenAddress);
    }

    //设置私募轮次
    function setPrivateSaleRound(
        uint256 roundId,
        uint256 rate,
        uint256 startTime,
        uint256 endTime,
        uint256 cap,
        bool isActive
    ) external onlyOwner endTimeAfterStartTime(startTime, endTime) {
        privateSaleRounds[roundId] = PrivateSaleRound({
            rate: rate,
            startTime: startTime,
            endTime: endTime,
            cap: cap,
            totalSold: 0,
            isActive: isActive
        });
        currentRound = roundId;
        emit PrivateSaleRoundSet(
            roundId,
            rate,
            startTime,
            endTime,
            cap,
            isActive
        );
    }
    // 将轮次设置为非活动状态
    function deactivatePrivateSaleRound(uint256 roundId) external onlyOwner {
        PrivateSaleRound storage round = privateSaleRounds[roundId];
        round.isActive = false;
        emit PrivateSaleRoundSet(
            roundId,
            round.rate,
            round.startTime,
            round.endTime,
            round.cap,
            false
        );
    }

    //接收私募者资金后,分配代币
    function allocateTokens(
        address investor,
        uint256 amountPaid
    )
        internal
        nonReentrant
        whenNotPaused
        nonZeroAddress(investor)
        amountGreaterThanZero(amountPaid)
    {
        PrivateSaleRound storage round = privateSaleRounds[currentRound];

        if (!round.isActive) {
            revert PrivateSaleRoundIsNotActive();
        }
        if (
            block.timestamp < round.startTime ||
            block.timestamp > round.endTime
        ) {
            revert PrivateSaleRoundTimeNotActive();
        }
        uint256 tokensToAllocate = amountPaid * round.rate;
        if (round.totalSold + tokensToAllocate > round.cap) {
            revert PrivateSaleRoundCapExceeded();
        }

        // 检查合约代币余额是否充足
        uint256 contractBalance = token.balanceOf(address(this));
        if (contractBalance < tokensToAllocate) {
            // 余额不足，触发事件并回退
            emit InsufficientTokenBalance(
                investor,
                tokensToAllocate,
                contractBalance,
                currentRound
            );
            revert InsufficientTokenBalanceInContract();
        }

        PrivateSaleInvestor storage investorInfo = privateSaleInvestors[
            investor
        ];

        // 如果是首次购买，初始化解锁时间
        if (investorInfo.purchased == 0) {
            investorInfo.claimStartTime = round.endTime; // 私募结束后开始领取
            investorInfo.claimEndTime = round.endTime + 365 days; // 365天线性解锁
        }

        investorInfo.purchased += tokensToAllocate;
        investorInfo.lastClaimTime = block.timestamp;

        round.totalSold += tokensToAllocate;

        emit TokensAllocated(investor, amountPaid, tokensToAllocate);

        // 检查剩余余额是否低于警告阈值
        _checkLowBalance(contractBalance - tokensToAllocate);
    }

    // 私募者领取代币
    function claimTokens()
        external
        nonReentrant
        whenNotPaused
        nonZeroAddress(msg.sender)
    {
        PrivateSaleInvestor storage investorInfo = privateSaleInvestors[
            msg.sender
        ];
        if (investorInfo.purchased == 0) {
            revert NoTokensPurchasedInPrivateSale();
        }
        if (block.timestamp < investorInfo.claimStartTime) {
            revert ClaimPeriodHasNotStarted();
        }

        uint256 totalUnlockable = _viewUnlockableTokens(msg.sender);

        uint256 claimable = totalUnlockable - investorInfo.claimed;
        if (claimable == 0) {
            revert NoTokensAvailableToClaimInPrivateSale();
        }

        // 检查合约余额是否足够支付
        uint256 contractBalance = token.balanceOf(address(this));
        if (contractBalance < claimable) {
            emit InsufficientTokenBalance(
                msg.sender,
                claimable,
                contractBalance,
                currentRound
            );
            revert InsufficientTokenBalanceInContract();
        }

        investorInfo.claimed += claimable;
        investorInfo.lastClaimTime = block.timestamp;

        // 转移代币给投资者
        token.safeTransfer(msg.sender, claimable);

        emit RewardClaimed(msg.sender, claimable);

        // 检查剩余余额是否低于警告阈值
        _checkLowBalance(contractBalance - claimable);
    }

    // 接收 ETH 并分配代币
    receive() external payable override {
        allocateTokens(msg.sender, msg.value);
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

    // ----------------------------------------- internal functions --------------------------------------------

    /**
     * @notice 检查合约余额是否低于警告阈值
     * @dev 当余额低于总分配量的阈值百分比时触发警告事件
     * @param currentBalance 当前合约余额
     */
    function _checkLowBalance(uint256 currentBalance) internal {
        PrivateSaleRound storage round = privateSaleRounds[currentRound];

        // 计算预期需要的余额（基于当前轮次的总售出量）
        uint256 requiredBalance = round.totalSold;

        if (requiredBalance == 0) {
            return; // 没有售出任何代币，不需要检查
        }

        // 计算警告阈值
        uint256 thresholdBalance = (requiredBalance * LOW_BALANCE_THRESHOLD) /
            100;

        // 如果当前余额低于阈值，触发警告事件
        if (currentBalance < thresholdBalance) {
            emit LowTokenBalance(
                address(this),
                currentBalance,
                requiredBalance,
                currentRound
            );
        }
    }

    // ----------------------------------------- view functions --------------------------------------------

    // 查看私募者已解锁的代币数量（内部函数，返回总可解锁量）
    function _viewUnlockableTokens(
        address investor
    ) internal view returns (uint256) {
        PrivateSaleInvestor storage investorInfo = privateSaleInvestors[
            investor
        ];
        if (block.timestamp < investorInfo.claimStartTime) {
            return 0;
        }

        // 立即解锁20%
        uint256 immediateUnlock = (investorInfo.purchased * 20) / 100;

        // 计算线性解锁部分（剩余80%）
        uint256 linearUnlockable;
        if (block.timestamp >= investorInfo.claimEndTime) {
            // 全部解锁
            linearUnlockable = investorInfo.purchased - immediateUnlock;
        } else {
            // 计算已过时间比例
            uint256 timeElapsed = block.timestamp - investorInfo.claimStartTime;
            uint256 totalVestingTime = investorInfo.claimEndTime -
                investorInfo.claimStartTime;
            uint256 vestedAmount = investorInfo.purchased - immediateUnlock; // 需要线性释放的80%
            linearUnlockable = (vestedAmount * timeElapsed) / totalVestingTime;
        }

        return immediateUnlock + linearUnlockable;
    }

    // 公共查看私募者已解锁的代币数量
    function viewUnlockableTokens(
        address investor
    ) external view returns (uint256) {
        return _viewUnlockableTokens(investor);
    }
    // 公共查看私募者可领取的代币数量
    function viewClaimableTokens(
        address investor
    ) external view returns (uint256) {
        PrivateSaleInvestor storage investorInfo = privateSaleInvestors[
            investor
        ];
        uint256 totalUnlockable = _viewUnlockableTokens(investor);
        return totalUnlockable - investorInfo.claimed;
    }

    // 查看私募者信息
    function viewPrivateSaleInvestor(
        address investor
    ) external view returns (PrivateSaleInvestor memory) {
        return privateSaleInvestors[investor];
    }

    // 查看当前私募轮次信息
    function viewCurrentPrivateSaleRound()
        external
        view
        returns (PrivateSaleRound memory)
    {
        return privateSaleRounds[currentRound];
    }

    /**
     * @notice 查看合约当前代币余额
     * @return balance 合约持有的代币数量
     */
    function getContractTokenBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    /**
     * @notice 查看当前轮次还需要多少代币才能满足所有已售出的承诺
     * @return required 需要的代币数量
     * @return current 当前余额
     * @return shortage 缺口（如果为0则充足）
     */
    function getBalanceStatus()
        external
        view
        returns (uint256 required, uint256 current, uint256 shortage)
    {
        PrivateSaleRound storage round = privateSaleRounds[currentRound];
        required = round.totalSold;
        current = token.balanceOf(address(this));
        shortage = current >= required ? 0 : required - current;
    }
}
