// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./MetaNodeToken.sol";

import "./structs/MultipoolTypes.sol";
import "./events/MultipoolEvents.sol";
import "./errors/MultipoolErrors.sol";

import "./errors/CustomErrors.sol";
import "./events/Events.sol";
import "./constants/Constants.sol";
import "./modify/CustomModifiers.sol";

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Utils.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MultiStakePledgeContractV2 - 多币种质押合约 V2
 * @notice 支持多种代币质押池的智能合约，增强的池子管理功能
 * @dev 每个池子独立管理，支持不同的质押代币和奖励代币
 * @dev V2 新增：优化的池子管理、池子停用/重启、更好的存储利用
 */
contract MultiStakePledgeContractV2 is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    CustomModifiers
{
    // 版本跟踪用于升级
    uint16 public constant CONTRACT_VERSION = 2;

    MetaNodeToken public metaNodeToken;

    // 多池支持
    uint256 public poolCounter; // 池子计数器
    uint256 public constant MAX_POOLS = 50; // 最大池子数量

    mapping(uint256 => PoolInfo) public pools; // 池子信息
    mapping(uint256 => mapping(address => UserPoolInfo)) public userPoolInfo; // 用户在各池子中的信息
    mapping(address => bool) public blacklist; // 全局黑名单

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice 初始化多币种质押合约 V2
     */
    function initialize(MetaNodeToken _metaNodeToken) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        metaNodeToken = _metaNodeToken;

        // 默认权限
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);

        // 初始化池子计数器从0开始
        poolCounter = 0;
    }

    // ========================================
    // 多池管理函数 - V2 增强
    // ========================================

    /**
     * @notice 创建新的质押池 - V2 优化
     */
    function createPool(
        CreatePoolParams calldata params
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256 poolId) {
        // 检查开放质押的池子数量而不是总池子数量
        uint256 activeCount = 0;
        for (uint256 i = 0; i < poolCounter; i++) {
            if (pools[i].isOpenForStaking) {
                activeCount++;
            }
        }
        if (activeCount >= MAX_POOLS) revert MaxPoolsReached(MAX_POOLS);
        if (address(params.stakeToken) == address(0))
            revert InvalidStakeToken(address(params.stakeToken));
        if (address(params.rewardToken) == address(0))
            revert InvalidRewardToken(address(params.rewardToken));
        if (params.stakeToken == params.rewardToken)
            revert SameTokenNotAllowed();
        if (params.totalRewards == 0)
            revert InvalidPoolRewards(params.totalRewards);
        if (bytes(params.name).length == 0) revert PoolNameEmpty();
        // 注意：minDepositAmount 和 cooldownPeriod 允许为 0，将使用默认值

        poolId = poolCounter++;

        // 设置最小质押金额：如果为 0 则使用默认值 1（允许任意小额质押）
        uint256 finalMinDeposit = params.minDepositAmount > 0 
            ? params.minDepositAmount 
            : 1; // 默认 1 wei
            
        // 设置冷却期：如果为 0 则使用默认值 1 分钟
        uint256 finalCooldown = params.cooldownPeriod > 0 
            ? params.cooldownPeriod 
            : 1 minutes; // 默认 1 分钟

        pools[poolId] = PoolInfo({
            stakeToken: params.stakeToken,
            rewardToken: params.rewardToken,
            totalRewards: params.totalRewards,
            rewardRate: 0, // 启动时设置
            totalRewardsIssued: 0,
            startTime: 0,
            endTime: 0,
            totalStaked: 0,
            lastUpdateTime: 0,
            rewardPerTokenStored: 0,
            minDepositAmount: finalMinDeposit,
            isOpenForStaking: true,
            cooldownPeriod: finalCooldown,
            name: params.name
        });

        emit PoolCreated(
            poolId,
            address(params.stakeToken),
            address(params.rewardToken),
            params.totalRewards,
            0, // duration 将在 startPool 时设置
            params.name
        );
    }

    /**
     * @notice 启动特定池子的质押期
     * @param poolId 池子ID
     * @param duration 质押期持续时间（秒）
     */
    function startPool(
        uint256 poolId,
        uint256 duration
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        PoolInfo storage pool = pools[poolId];
        if (!pool.isOpenForStaking) revert PoolNotActive(poolId);
        if (pool.startTime != 0) revert PoolAlreadyStarted(poolId);
        if (duration == 0) revert InvalidPoolDuration(duration);

        pool.startTime = block.timestamp;
        pool.endTime = pool.startTime + duration;
        pool.rewardRate = pool.totalRewards / duration;
        pool.lastUpdateTime = pool.startTime;

        emit PoolStarted(poolId, pool.startTime, pool.endTime, pool.rewardRate);
    }

    /**
     * @notice 停用池子 - V2 新增功能
     * @param poolId 池子ID
     */
    function deactivatePool(
        uint256 poolId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (poolId >= poolCounter) revert PoolNotExists(poolId);

        PoolInfo storage pool = pools[poolId];
        if (!pool.isOpenForStaking) revert PoolNotActive(poolId);

        // 检查池子是否可以安全停用（没有未领取的奖励或质押）
        if (pool.totalStaked > 0) {
            revert CannotDeactivatePoolWithStakes(poolId, pool.totalStaked);
        }

        pool.isOpenForStaking = false;

        emit PoolDeactivated(poolId, block.timestamp);
    }

    /**
     * @notice 重新开放池子质押 - V2 新增功能
     * @param poolId 池子ID
     */
    function reactivatePool(
        uint256 poolId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (poolId >= poolCounter) revert PoolNotExists(poolId);

        PoolInfo storage pool = pools[poolId];
        if (pool.isOpenForStaking) revert PoolAlreadyActive(poolId);

        // 检查重新开放质押是否会超过最大池子数
        uint256 activeCount = 0;
        for (uint256 i = 0; i < poolCounter; i++) {
            if (pools[i].isOpenForStaking) {
                activeCount++;
            }
        }
        if (activeCount >= MAX_POOLS) revert MaxPoolsReached(MAX_POOLS);

        pool.isOpenForStaking = true;

        emit PoolReactivated(poolId, block.timestamp);
    }

    // ========================================
    // 多池质押函数
    // ========================================

    /**
     * @notice 在指定池子中质押
     */
    function stakeInPool(
        uint256 poolId,
        uint256 amount
    ) public whenNotPaused nonReentrant onlyPositiveAmount(amount) {
        PoolInfo storage pool = pools[poolId];
        if (!pool.isOpenForStaking) revert PoolNotActive(poolId);
        if (pool.startTime == 0) revert PoolNotStarted(poolId);
        if (block.timestamp >= pool.endTime) revert PoolAlreadyEnded(poolId);
        if (blacklist[msg.sender]) revert BlacklistedAddress(msg.sender);
        if (amount < pool.minDepositAmount)
            revert MinPledgeNotMet(pool.minDepositAmount);

        // 更新奖励
        _updatePoolReward(poolId, msg.sender);

        // 增加用户质押
        userPoolInfo[poolId][msg.sender].balances += amount;
        userPoolInfo[poolId][msg.sender].lastStakeTimes = block.timestamp;
        userPoolInfo[poolId][msg.sender].stakeTimestamps = block.timestamp;

        // 增加池子总质押
        pool.totalStaked += amount;

        // 转移代币
        pool.stakeToken.transferFrom(msg.sender, address(this), amount);

        emit StakedInPool(msg.sender, poolId, amount, address(pool.stakeToken));
    }

    /**
     * @notice 从指定池子申请解质押
     * @dev 申请解质押后，该部分代币立即停止赚取奖励
     * @dev 🔒 安全检查：确保申请金额不超过当前有效质押余额
     */
    function requestUnstakeFromPool(
        uint256 poolId,
        uint256 amount
    ) public whenNotPaused nonReentrant onlyPositiveAmount(amount) {
        if (blacklist[msg.sender]) revert BlacklistedAddress(msg.sender);

        PoolInfo storage pool = pools[poolId];
        UserPoolInfo storage userPool = userPoolInfo[poolId][msg.sender];
        
        // 🔒 安全检查：确保申请金额不超过当前有效质押余额
        // balances 只包含有效质押的代币（不包括已申请解质押的冻结代币）
        if (userPool.balances < amount) {
            revert InsufficientStakeAmount(amount, userPool.balances, poolId);
        }

        // 🔧 先更新奖励（基于当前质押量）
        _updatePoolReward(poolId, msg.sender);

        // 🔧 立即减少质押余额和总质押量
        // 从此刻起，这部分代币不再赚取奖励
        userPool.balances -= amount;
        pool.totalStaked -= amount;

        // 计算解锁区块
        uint256 unlockBlock = block.number + (pool.cooldownPeriod / 12); // 以太坊平均12秒一个区块

        // 记录到待提取队列
        userPool.unstakeRequests.push(UnstakeRequest(amount, unlockBlock));

        emit RequestUnstakeFromPool(msg.sender, poolId, amount, unlockBlock);
    }

    /**
     * @notice 从指定池子执行解质押
     * @dev 解质押时会自动领取所有待领取的奖励
     * @dev 质押余额已在 requestUnstakeFromPool 时减少，这里只是转移代币
     */
    function unstakeFromPool(
        uint256 poolId,
        uint256 amount
    ) public whenNotPaused nonReentrant onlyPositiveAmount(amount) {
        if (blacklist[msg.sender]) revert BlacklistedAddress(msg.sender);

        PoolInfo storage pool = pools[poolId];
        UserPoolInfo storage userPool = userPoolInfo[poolId][msg.sender];

        if (userPool.unstakeRequests.length == 0) {
            revert RequestUnstakeFailed(userPool.unstakeRequests.length);
        }

        // 检查可解锁金额
        uint256 totalUnlockable = _calculateUnlockableAmount(
            userPool.unstakeRequests
        );
        if (amount > totalUnlockable) {
            revert InsufficientStakeAmount(amount, totalUnlockable, poolId);
        }

        // 处理解质押请求
        uint256 processedAmount = _processUnstakeRequests(
            userPool.unstakeRequests,
            amount
        );
        if (processedAmount != amount) {
            revert FailedToProcessFullAmount();
        }

        // 🔧 自动领取奖励（调用内部领取逻辑）
        _claimRewards(poolId, msg.sender);

        // 🔧 注意：余额已在 requestUnstakeFromPool 时减少，这里不需要再减
        userPool.lastUnstakeTimes = block.timestamp;

        // 转移质押代币
        pool.stakeToken.transfer(msg.sender, amount);

        emit UnstakedFromPool(
            msg.sender,
            poolId,
            amount,
            address(pool.stakeToken)
        );
    }

    /**

    /**
     * @notice 从指定池子领取奖励
     * @dev 用户可以在任何时候领取已产生的奖励，即使池子已结束或被停用
     * @dev 奖励计算会自动在 endTime 停止，不会产生新的奖励
     */
    function claimRewardsFromPool(
        uint256 poolId
    ) public whenNotPaused nonReentrant {
        if (blacklist[msg.sender]) revert BlacklistedAddress(msg.sender);

        PoolInfo storage pool = pools[poolId];
        
        // 检查池子是否已开始（必须要有 startTime）
        if (pool.startTime == 0) revert PoolNotStarted(poolId);

        _claimRewards(poolId, msg.sender);
    }

    /**
     * @notice 内部领取奖励逻辑（供复用）
     * @dev 被 claimRewardsFromPool 和 unstakeFromPool 调用
     */
    function _claimRewards(uint256 poolId, address account) internal {
        PoolInfo storage pool = pools[poolId];
        
        _updatePoolReward(poolId, account);

        UserPoolInfo storage userPool = userPoolInfo[poolId][account];
        uint256 reward = userPool.rewards;

        if (reward > 0) {
            if (pool.rewardToken.balanceOf(address(this)) < reward) {
                revert InsufficientRewardBalance(
                    reward,
                    pool.rewardToken.balanceOf(address(this)),
                    poolId
                );
            }

            userPool.rewards = 0;
            userPool.totalClaimedByUser += reward;
            userPool.lastClaimTimes = block.timestamp;

            pool.totalRewardsIssued += reward;

            pool.rewardToken.transfer(account, reward);

            emit RewardsClaimedFromPool(
                account,
                poolId,
                reward,
                address(pool.rewardToken)
            );
        }
    }

    // ========================================
    // 内部辅助函数
    // ========================================

    /**
     * @notice 更新池子奖励
     * @dev 修复：当 totalStaked = 0 时，也要更新 lastUpdateTime，避免奖励累积给第一个质押者
     */
    function _updatePoolReward(uint256 poolId, address account) internal {
        PoolInfo storage pool = pools[poolId];

        // 只有在有质押时才更新 rewardPerTokenStored
        if (pool.totalStaked > 0) {
            pool.rewardPerTokenStored = _rewardPerTokenForPool(poolId);
        }
        
        // 🔧 关键修复：无论是否有质押，都要更新 lastUpdateTime
        // 避免无人质押期间的奖励累积给第一个质押者
        pool.lastUpdateTime = min(block.timestamp, pool.endTime);

        if (account != address(0)) {
            UserPoolInfo storage userPool = userPoolInfo[poolId][account];
            userPool.rewards += _earnedInPool(poolId, account);
            userPool.userRewardPerTokenPaid = pool.rewardPerTokenStored;
        }
    }

    /**
     * @notice 计算池子的每代币奖励
     */
    function _rewardPerTokenForPool(
        uint256 poolId
    ) internal view returns (uint256) {
        PoolInfo storage pool = pools[poolId];

        if (pool.totalStaked == 0) {
            return pool.rewardPerTokenStored;
        }

        uint256 time = min(block.timestamp, pool.endTime) - pool.lastUpdateTime;
        uint256 reward = time * pool.rewardRate;

        return pool.rewardPerTokenStored + (reward / pool.totalStaked);
    }

    /**
     * @notice 计算用户在池子中的收益
     */
    function _earnedInPool(
        uint256 poolId,
        address account
    ) internal view returns (uint256) {
        UserPoolInfo storage userPool = userPoolInfo[poolId][account];
        return
            userPool.balances *
            (_rewardPerTokenForPool(poolId) - userPool.userRewardPerTokenPaid);
    }

    // ========================================
    // 查询函数 - V2 增强
    // ========================================

    /**
     * @notice 获取池子信息
     */
    function getPoolInfo(
        uint256 poolId
    ) external view returns (PoolInfo memory) {
        if (poolId >= poolCounter) revert PoolNotExists(poolId);
        return pools[poolId];
    }

    /**
     * @notice 获取用户在池子中的信息
     */
    function getUserPoolInfo(
        uint256 poolId,
        address account
    )
        external
        view
        returns (
            uint256 stakedBalance,
            uint256 pendingRewards,
            uint256 totalRewardsEarned,
            uint256 totalRewardsClaimed,
            UnstakeRequest[] memory pendingUnstakeRequests
        )
    {
        if (poolId >= poolCounter) revert PoolNotExists(poolId);

        UserPoolInfo storage userPool = userPoolInfo[poolId][account];
        stakedBalance = userPool.balances;
        pendingRewards = userPool.rewards + _earnedInPool(poolId, account);
        // totalRewardsEarned 应该包含已领取的 + 待领取的奖励
        totalRewardsEarned = userPool.totalClaimedByUser + pendingRewards;
        totalRewardsClaimed = userPool.totalClaimedByUser;
        pendingUnstakeRequests = userPool.unstakeRequests;
    }

    /**
     * @notice 获取用户在池子中的冻结代币数量
     * @dev 🔒 安全查询：显示用户在冷却期的代币总量
     * @param poolId 池子ID
     * @param account 用户地址
     * @return frozenAmount 冻结的代币总量
     * @return unlockableAmount 已可解锁的代币数量
     */
    function getUserFrozenInfo(
        uint256 poolId,
        address account
    ) external view returns (
        uint256 frozenAmount,
        uint256 unlockableAmount
    ) {
        if (poolId >= poolCounter) revert PoolNotExists(poolId);
        
        UserPoolInfo storage userPool = userPoolInfo[poolId][account];
        frozenAmount = _getFrozenAmount(userPool.unstakeRequests);
        unlockableAmount = _calculateUnlockableAmount(userPool.unstakeRequests);
    }

    /**
     * @notice 获取所有开放质押的池子数量
     */
    function getActivePoolCount() external view returns (uint256 count) {
        for (uint256 i = 0; i < poolCounter; i++) {
            if (pools[i].isOpenForStaking) {
                count++;
            }
        }
    }

    /**
     * @notice 检查是否可以创建新池子（考虑开放质押的池子数量）- V2 新增
     */
    function canCreateNewPool() external view returns (bool) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < poolCounter; i++) {
            if (pools[i].isOpenForStaking) {
                activeCount++;
            }
        }
        return activeCount < MAX_POOLS;
    }

    /**
     * @notice 获取所有池子状态概览 - V2 新增
     */
    function getPoolsOverview()
        external
        view
        returns (
            uint256 totalPools,
            uint256 activePools,
            uint256 inactivePools,
            uint256 availableSlots
        )
    {
        totalPools = poolCounter;

        for (uint256 i = 0; i < poolCounter; i++) {
            if (pools[i].isOpenForStaking) {
                activePools++;
            } else {
                inactivePools++;
            }
        }

        availableSlots = activePools < MAX_POOLS ? MAX_POOLS - activePools : 0;
    }

    /**
     * @notice 批量获取池子信息 - V2 新增
     * @param startIndex 开始索引
     * @param count 获取数量
     */
    function getPoolsBatch(
        uint256 startIndex,
        uint256 count
    )
        external
        view
        returns (PoolInfo[] memory poolsInfo, uint256[] memory poolIds)
    {
        if (startIndex >= poolCounter) {
            return (new PoolInfo[](0), new uint256[](0));
        }

        uint256 endIndex = startIndex + count;
        if (endIndex > poolCounter) {
            endIndex = poolCounter;
        }

        uint256 actualCount = endIndex - startIndex;
        poolsInfo = new PoolInfo[](actualCount);
        poolIds = new uint256[](actualCount);

        for (uint256 i = 0; i < actualCount; i++) {
            uint256 poolId = startIndex + i;
            poolsInfo[i] = pools[poolId];
            poolIds[i] = poolId;
        }
    }

    /**
     * @notice 获取开放质押的池子列表 - V2 新增
     */
    function getActivePools()
        external
        view
        returns (
            uint256[] memory activePoolIds,
            PoolInfo[] memory activePoolsInfo
        )
    {
        uint256 activeCount = 0;

        // 先计算开放质押的池子数量
        for (uint256 i = 0; i < poolCounter; i++) {
            if (pools[i].isOpenForStaking) {
                activeCount++;
            }
        }

        // 创建数组
        activePoolIds = new uint256[](activeCount);
        activePoolsInfo = new PoolInfo[](activeCount);

        // 填充数据
        uint256 index = 0;
        for (uint256 i = 0; i < poolCounter; i++) {
            if (pools[i].isOpenForStaking) {
                activePoolIds[index] = i;
                activePoolsInfo[index] = pools[i];
                index++;
            }
        }
    }

    // ========================================
    // 继承的必需函数
    // ========================================

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {
        emit ContractUpgraded(
            ERC1967Utils.getImplementation(),
            newImplementation,
            CONTRACT_VERSION
        );
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
        emit EmergencyPause(msg.sender, block.timestamp);
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
        emit EmergencyUnpause(msg.sender, block.timestamp);
    }

    function emergencyPause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
        emit EmergencyPause(msg.sender, block.timestamp);
    }

    function emergencyWithdraw(
        IERC20 token,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        token.transfer(msg.sender, amount);
    }

    function addToBlacklist(
        address account
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        blacklist[account] = true;
        emit BlacklistUpdated(account, true);
    }

    function removeFromBlacklist(
        address account
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        blacklist[account] = false;
        emit BlacklistUpdated(account, false);
    }

    function getVersion() external pure returns (uint16) {
        return CONTRACT_VERSION;
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    // ========================================
    // 辅助函数 (从原合约复制)
    // ========================================

    /**
     * @notice 计算用户冻结的代币总量（所有解质押请求的总和）
     * @dev 🔒 安全函数：用于查询用户在冻结期的代币总量
     * @dev 注意：这些代币已从 balances 中扣除，不再赚取奖励
     * @param requests 用户的解质押请求数组
     * @return frozenAmount 冻结的代币总量
     */
    function _getFrozenAmount(
        UnstakeRequest[] storage requests
    ) internal view returns (uint256 frozenAmount) {
        for (uint256 i = 0; i < requests.length; i++) {
            frozenAmount += requests[i].amount;
        }
    }

    /**
     * @notice 计算用户可解锁的代币总量（冷却期已过的解质押请求）
     * @param requests 用户的解质押请求数组
     * @return totalUnlockable 可解锁的代币总量
     */
    function _calculateUnlockableAmount(
        UnstakeRequest[] storage requests
    ) internal view returns (uint256 totalUnlockable) {
        for (uint256 i = 0; i < requests.length; i++) {
            if (block.number >= requests[i].unlockBlock) {
                totalUnlockable += requests[i].amount;
            }
        }
    }

    function _processUnstakeRequests(
        UnstakeRequest[] storage requests,
        uint256 requestedAmount
    ) internal returns (uint256 processedAmount) {
        uint256 remaining = requestedAmount;
        uint256 i = 0;

        while (remaining > 0 && i < requests.length) {
            if (block.number >= requests[i].unlockBlock) {
                if (requests[i].amount <= remaining) {
                    remaining -= requests[i].amount;
                    _removeUnstakeRequest(requests, i);
                } else {
                    requests[i].amount -= remaining;
                    remaining = 0;
                }
            } else {
                i++;
            }
        }

        processedAmount = requestedAmount - remaining;
    }

    function _removeUnstakeRequest(
        UnstakeRequest[] storage arr,
        uint256 index
    ) internal {
        if (index >= arr.length) revert IndexOutOfBounds();

        uint256 lastIndex = arr.length - 1;
        if (index != lastIndex) {
            arr[index] = arr[lastIndex];
        }
        arr.pop();
    }
}
