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
import "../../structs/NextSwapStructs.sol";

/**
 * @title TeamInspire
 * @dev 团队激励合约
- **悬崖期（Cliff）**：1 年完全锁仓
- **线性释放期**：之后 3 年线性释放
 */

contract TeamInspire is
    Ownable2Step,
    ReentrancyGuard,
    Pausable,
    NextSwapModifier,
    NextSwapEvents
{
    using Constants for *;
    using SafeERC20 for IERC20;

    // NextSwap 代币合约地址
    IERC20 public immutable token;

    // 合约计时开始时间
    uint256 public immutable startTime;
    // 悬崖期结束时间
    uint256 public immutable cliffEndTime;
    // 释放结束时间
    uint256 public immutable claimEndTime;

    // 已分配代币总量
    uint256 public totalAllocated;

    // 成员分配映射
    mapping(address => TeamMemberInspire) public memberAllocations;

    constructor(
        address initialOwner,
        address _tokenAddress,
        uint256 _startTime
    ) Ownable(initialOwner) {
        require(_tokenAddress != address(0), "Invalid token address");
        require(
            _startTime > block.timestamp,
            "Start time must be in the future"
        );

        token = IERC20(_tokenAddress);
        startTime = _startTime;
        cliffEndTime = _startTime + 365 days; // 悬崖期结束时间,1年后
        claimEndTime = cliffEndTime + 3 * 365 days; // 线性释放期3年
    }

    /**
     * @dev 添加团队成员分配
     * @param memberAddress 成员地址
     * @param allocation 分配数量
     *
     * 释放规则：
     * - 项目启动前加入：等待 1 年悬崖期 + 3 年线性释放
     * - 项目启动后加入：从加入时间开始 + 3 年线性释放（无悬崖期）
     * - 保证每个员工从加入开始都需要等待 3 年才能完全释放
     */
    function _addMemberAllocation(
        address memberAddress,
        uint256 allocation
    ) internal onlyOwner nonZeroAddress(memberAddress) {
        TeamMemberInspire memory member = memberAllocations[memberAddress];

        require(
            totalAllocated + allocation <= Constants.TEAM_TOTAL,
            "Exceeds maximum team allocation"
        );
        require(member.allocation == 0, "Member already exists");
        require(allocation > 0, "Allocation must be greater than zero");

        totalAllocated += allocation;
        member.allocation = allocation;

        // 动态计算释放时间：确保每个成员都有 3 年释放期
        if (block.timestamp < cliffEndTime) {
            // 项目启动前加入：遵循全局悬崖期 + 3 年释放
            member.claimStartTime = cliffEndTime;
            member.claimEndTime = claimEndTime;
        } else {
            // 项目启动后加入：从当前时间开始 + 3 年释放（无悬崖期）
            member.claimStartTime = block.timestamp;
            member.claimEndTime = block.timestamp + 3 * 365 days;
        }

        memberAllocations[memberAddress] = member;

        emit MemberAllocationAdded(
            memberAddress,
            allocation,
            member.claimStartTime,
            member.claimEndTime,
            msg.sender
        );
    }

    // 添加团队成员分配
    function addMemberAllocation(
        address memberAddress,
        uint256 allocation
    ) external onlyOwner nonZeroAddress(memberAddress) {
        _addMemberAllocation(memberAddress, allocation);
    }
    // 批量添加团队成员分配
    function addMemberAllocations(
        address[] calldata membersAddress,
        uint256[] calldata allocations
    ) external onlyOwner {
        require(
            membersAddress.length == allocations.length,
            "Members and allocations length mismatch"
        );
        for (uint256 i = 0; i < membersAddress.length; i++) {
            _addMemberAllocation(membersAddress[i], allocations[i]);
        }
    }

    /**
     * @dev 团队成员领取代币
     * 领取量 = calculateMemberClaimableTokens - 已领取量
     */
    function claimTokens()
        external
        nonReentrant
        whenNotPaused
        nonZeroAddress(msg.sender)
    {
        TeamMemberInspire storage member = memberAllocations[msg.sender];

        require(member.allocation > 0, "No allocation found");
        require(
            block.timestamp >= member.claimStartTime,
            "Tokens not yet claimable"
        );

        // 计算可领取数量
        uint256 claimableAmount = _calculateClaimable(msg.sender);
        require(claimableAmount > 0, "No tokens available to claim");

        // 更新成员状态（CEI 模式：先修改状态再转账）
        member.claimed += claimableAmount;
        member.lastClaimTime = block.timestamp;

        // 转账代币给成员（使用正确的 token 地址）
        token.safeTransfer(msg.sender, claimableAmount);

        emit TeamInspireTokensClaimed(
            msg.sender,
            claimableAmount,
            address(token)
        );
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
    ) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(amount <= address(this).balance, "Insufficient balance");
        to.transfer(amount);
        emit EmergencyTokenRecovered(address(0), to, amount, msg.sender);
    }

    /**
     * @dev 仅允许提取非激励代币的其他 ERC20（防止 owner 盗取团队激励）
     */
    function withdrawERC20(
        address tokenAddress,
        address to,
        uint256 amount
    ) external onlyOwner nonZeroAddress(tokenAddress) nonZeroAddress(to) {
        require(
            tokenAddress != address(token),
            "Cannot withdraw incentive tokens"
        );

        IERC20 tokenContract = IERC20(tokenAddress);
        uint256 contractBalance = tokenContract.balanceOf(address(this));
        require(amount <= contractBalance, "Insufficient token balance");
        tokenContract.safeTransfer(to, amount);
        emit EmergencyTokenRecovered(tokenAddress, to, amount, msg.sender);
    }

    // ====== 安全：接收 ETH ======
    receive() external payable {
        emit FundReceived(address(0), msg.value, msg.sender);
    }

    //-----------------------------view functions-----------------------------

    // 已解锁代币总量
    function calculateReleasedTokens() public view returns (uint256) {
        if (block.timestamp <= cliffEndTime) {
            return 0;
        } else if (block.timestamp >= claimEndTime) {
            return totalAllocated;
        } else {
            uint256 elapsedTime = block.timestamp - cliffEndTime;
            uint256 totalVestingTime = claimEndTime - cliffEndTime;
            return (totalAllocated * elapsedTime) / totalVestingTime;
        }
    }

    /**
     * @dev 查询某成员可领取代币数量（公开视图函数）
     * @param memberAddress 成员地址
     * @return 可领取的代币数量
     */
    function calculateMemberClaimableTokens(
        address memberAddress
    ) external view nonZeroAddress(memberAddress) returns (uint256) {
        return _calculateClaimable(memberAddress);
    }
    /**
     * @dev 内部函数：计算成员可领取的代币数量
     * @param memberAddress 成员地址
     * @return 可领取的代币数量
     */
    function _calculateClaimable(
        address memberAddress
    ) internal view returns (uint256) {
        TeamMemberInspire memory member = memberAllocations[memberAddress];

        if (member.allocation == 0 || block.timestamp < member.claimStartTime) {
            return 0;
        }

        uint256 claimableAmount;

        if (block.timestamp >= member.claimEndTime) {
            // 释放期已结束，可领取全部剩余
            claimableAmount = member.allocation - member.claimed;
        } else {
            // 线性释放中，计算已释放总量
            uint256 elapsedTime = block.timestamp - member.claimStartTime;
            uint256 totalVestingTime = member.claimEndTime -
                member.claimStartTime;
            uint256 totalReleasable = (member.allocation * elapsedTime) /
                totalVestingTime;

            // 可领取 = 已释放总量 - 已领取量
            claimableAmount = totalReleasable > member.claimed
                ? totalReleasable - member.claimed
                : 0;
        }

        return claimableAmount;
    }
}
