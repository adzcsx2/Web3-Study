// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "../lib/PublicWithdrawable.sol";

import "../../constants/Constants.sol";
import "../../modifiers/NextSwapModifier.sol";
import "../NextSwapToken.sol";
import "../../events/NextSwapEvents.sol";
import "../../structs/NextSwapStructs.sol";
import "../../errors/NextSwapErrors.sol";

/**
 * @title TeamInspire
 * @dev 团队激励合约
- **悬崖期（Cliff）**：1 年完全锁仓
- **线性释放期**：之后 3 年线性释放
- ** 1年后加入的成员**：从加入时间开始 3 年线性释放（无悬崖期）
 */

contract TeamInspire is Ownable2Step, PublicWithdrawable, NextSwapModifier {
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
    ) Ownable(initialOwner) PublicWithdrawable(_tokenAddress) {
        if (_tokenAddress == address(0)) {
            revert InvalidTokenAddress();
        }
        if (_startTime <= block.timestamp) {
            revert StartTimeMustBeInFuture();
        }

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

        if (totalAllocated + allocation > TEAM_TOTAL) {
            revert ExceedsMaximumTeamAllocation();
        }
        if (member.allocation != 0) {
            revert MemberAlreadyExists();
        }
        if (allocation == 0) {
            revert AllocationMustBeGreaterThanZero();
        }

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
        if (membersAddress.length != allocations.length) {
            revert MembersAndAllocationsLengthMismatch();
        }
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

        if (member.allocation == 0) {
            revert NoAllocationFound();
        }
        if (block.timestamp < member.claimStartTime) {
            revert TokensNotYetClaimable();
        }

        // 计算可领取数量
        uint256 claimableAmount = _calculateClaimable(msg.sender);
        if (claimableAmount == 0) {
            revert NoTokensAvailableToClaim();
        }

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
    //------------------------------------------ override functions ------------------------------------------

    function _checkOwner() internal view override(Ownable, PublicWithdrawable) {
        super._checkOwner();
    }

    function _checkPauser() internal view override {
        super._checkOwner();
    }
}
