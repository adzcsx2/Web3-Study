// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./MetaNodeToken.sol";
import "./multipool/MultipoolTypes.sol";
import "./multipool/MultipoolEvents.sol";
import "./multipool/MultipoolErrors.sol";

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
 * @title MultiStakePledgeContract - 多币种质押合约
 * @notice 支持多种代币质押池的智能合约
 * @dev 每个池子独立管理，支持不同的质押代币和奖励代币
 */
contract MultiStakePledgeContract is
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
    uint256 public poolCounter;                                    // 池子计数器
    uint256 public constant MAX_POOLS = 50;                        // 最大池子数量
    
    mapping(uint256 => PoolInfo) public pools;                     // 池子信息
    mapping(uint256 => mapping(address => UserPoolInfo)) public userPoolInfo; // 用户在各池子中的信息
    mapping(address => bool) public blacklist;                     // 全局黑名单
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice 初始化多币种质押合约
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
    // 多池管理函数
    // ========================================
    
    /**
     * @notice 创建新的质押池
     */
    function createPool(
        CreatePoolParams calldata params
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256 poolId) {
        if (poolCounter >= MAX_POOLS) revert MaxPoolsReached(MAX_POOLS);
        if (address(params.stakeToken) == address(0)) revert InvalidStakeToken(address(params.stakeToken));
        if (address(params.rewardToken) == address(0)) revert InvalidRewardToken(address(params.rewardToken));
        if (params.stakeToken == params.rewardToken) revert SameTokenNotAllowed();
        if (params.totalRewards == 0) revert InvalidPoolRewards(params.totalRewards);
        if (params.duration == 0) revert InvalidPoolDuration(params.duration);
        if (bytes(params.name).length == 0) revert PoolNameEmpty();
        
        poolId = poolCounter++;
        
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
            minDepositAmount: params.minDepositAmount > 0 ? params.minDepositAmount : 0.01 ether,
            isActive: true,
            cooldownPeriod: params.cooldownPeriod > 0 ? params.cooldownPeriod : 1 minutes,
            name: params.name
        });
        
        emit PoolCreated(
            poolId,
            address(params.stakeToken),
            address(params.rewardToken),
            params.totalRewards,
            params.duration,
            params.name
        );
    }

    /**
     * @notice 启动特定池子的质押期
     */
    function startPool(uint256 poolId, uint256 duration) public onlyRole(DEFAULT_ADMIN_ROLE) {
        PoolInfo storage pool = pools[poolId];
        if (!pool.isActive) revert PoolNotActive(poolId);
        if (pool.startTime != 0) revert PoolAlreadyStarted(poolId);
        if (duration == 0) revert InvalidPoolDuration(duration);
        
        pool.startTime = block.timestamp;
        pool.endTime = pool.startTime + duration;
        pool.rewardRate = pool.totalRewards / duration;
        pool.lastUpdateTime = pool.startTime;
        
        emit PoolStarted(poolId, pool.startTime, pool.endTime, pool.rewardRate);
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
        if (!pool.isActive) revert PoolNotActive(poolId);
        if (pool.startTime == 0) revert PoolNotStarted(poolId);
        if (block.timestamp >= pool.endTime) revert PoolAlreadyEnded(poolId);
        if (blacklist[msg.sender]) revert BlacklistedAddress(msg.sender);
        if (amount < pool.minDepositAmount) revert MinPledgeNotMet(pool.minDepositAmount);
        
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
     */
    function requestUnstakeFromPool(
        uint256 poolId,
        uint256 amount
    ) public whenNotPaused nonReentrant onlyPositiveAmount(amount) {
        if (blacklist[msg.sender]) revert BlacklistedAddress(msg.sender);
        
        UserPoolInfo storage userPool = userPoolInfo[poolId][msg.sender];
        if (userPool.balances < amount) {
            revert InsufficientStakeAmount(amount, userPool.balances, poolId);
        }
        
        _updatePoolReward(poolId, msg.sender);
        
        PoolInfo storage pool = pools[poolId];
        uint256 unlockBlock = block.number + (pool.cooldownPeriod / 12); // 以太坊平均12秒一个区块
        
        userPool.unstakeRequests.push(UnstakeRequest(amount, unlockBlock));
        
        emit RequestUnstakeFromPool(msg.sender, poolId, amount, unlockBlock);
    }

    /**
     * @notice 从指定池子执行解质押
     */
    function unstakeFromPool(
        uint256 poolId,
        uint256 amount
    ) public whenNotPaused nonReentrant onlyPositiveAmount(amount) {
        if (blacklist[msg.sender]) revert BlacklistedAddress(msg.sender);
        
        PoolInfo storage pool = pools[poolId];
        UserPoolInfo storage userPool = userPoolInfo[poolId][msg.sender];
        
        // 检查冷却时间
        if (block.timestamp < userPool.lastStakeTimes + pool.cooldownPeriod) {
            uint256 timeRemaining = (userPool.lastStakeTimes + pool.cooldownPeriod) - block.timestamp;
            revert PoolCooldownNotMet(poolId, timeRemaining);
        }
        
        if (userPool.balances < amount) {
            revert InsufficientStakeAmount(amount, userPool.balances, poolId);
        }
        
        if (userPool.unstakeRequests.length == 0) {
            revert RequestUnstakeFailed(userPool.unstakeRequests.length);
        }
        
        // 检查可解锁金额
        uint256 totalUnlockable = _calculateUnlockableAmount(userPool.unstakeRequests);
        if (amount > totalUnlockable) {
            revert InsufficientStakeAmount(amount, totalUnlockable, poolId);
        }
        
        // 处理解质押请求
        uint256 processedAmount = _processUnstakeRequests(userPool.unstakeRequests, amount);
        if (processedAmount != amount) {
            revert FailedToProcessFullAmount();
        }
        
        _updatePoolReward(poolId, msg.sender);
        
        // 减少用户质押
        userPool.balances -= amount;
        userPool.lastUnstakeTimes = block.timestamp;
        
        // 减少池子总质押
        pool.totalStaked -= amount;
        
        // 转移代币
        pool.stakeToken.transfer(msg.sender, amount);
        
        emit UnstakedFromPool(msg.sender, poolId, amount, address(pool.stakeToken));
    }

    /**
     * @notice 从指定池子领取奖励
     */
    function claimRewardsFromPool(uint256 poolId) public whenNotPaused nonReentrant {
        if (blacklist[msg.sender]) revert BlacklistedAddress(msg.sender);
        
        PoolInfo storage pool = pools[poolId];
        if (block.timestamp < pool.startTime || block.timestamp >= pool.endTime) {
            revert PoolNotActive(poolId);
        }
        
        _updatePoolReward(poolId, msg.sender);
        
        UserPoolInfo storage userPool = userPoolInfo[poolId][msg.sender];
        uint256 reward = userPool.rewards;
        
        if (reward > 0) {
            if (pool.rewardToken.balanceOf(address(this)) < reward) {
                revert InsufficientRewardBalance(reward, pool.rewardToken.balanceOf(address(this)), poolId);
            }
            
            userPool.rewards = 0;
            userPool.totalRewardsByUser += reward;
            userPool.totalClaimedByUser += reward;
            userPool.lastClaimTimes = block.timestamp;
            
            pool.totalRewardsIssued += reward;
            
            pool.rewardToken.transfer(msg.sender, reward);
            
            emit RewardsClaimedFromPool(msg.sender, poolId, reward, address(pool.rewardToken));
        }
    }



    // ========================================
    // 内部辅助函数
    // ========================================
    
    /**
     * @notice 更新池子奖励
     */
    function _updatePoolReward(uint256 poolId, address account) internal {
        PoolInfo storage pool = pools[poolId];
        
        pool.rewardPerTokenStored = _rewardPerTokenForPool(poolId);
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
    function _rewardPerTokenForPool(uint256 poolId) internal view returns (uint256) {
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
    function _earnedInPool(uint256 poolId, address account) internal view returns (uint256) {
        UserPoolInfo storage userPool = userPoolInfo[poolId][account];
        return userPool.balances * (_rewardPerTokenForPool(poolId) - userPool.userRewardPerTokenPaid);
    }



    // ========================================
    // 查询函数
    // ========================================
    
    /**
     * @notice 获取池子信息
     */
    function getPoolInfo(uint256 poolId) external view returns (PoolInfo memory) {
        if (poolId >= poolCounter) revert PoolNotExists(poolId);
        return pools[poolId];
    }
    
    /**
     * @notice 获取用户在池子中的信息
     */
    function getUserPoolInfo(uint256 poolId, address account) external view returns (
        uint256 stakedBalance,
        uint256 pendingRewards,
        uint256 totalRewardsEarned,
        uint256 totalRewardsClaimed,
        UnstakeRequest[] memory pendingUnstakeRequests
    ) {
        if (poolId >= poolCounter) revert PoolNotExists(poolId);
        
        UserPoolInfo storage userPool = userPoolInfo[poolId][account];
        stakedBalance = userPool.balances;
        pendingRewards = userPool.rewards + _earnedInPool(poolId, account);
        totalRewardsEarned = userPool.totalRewardsByUser;
        totalRewardsClaimed = userPool.totalClaimedByUser;
        pendingUnstakeRequests = userPool.unstakeRequests;
    }
    
    /**
     * @notice 获取所有活跃的池子数量
     */
    function getActivePoolCount() external view returns (uint256 count) {
        for (uint256 i = 0; i < poolCounter; i++) {
            if (pools[i].isActive) {
                count++;
            }
        }
    }

    // ========================================
    // 继承的必需函数
    // ========================================
    
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {
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
    
    function emergencyWithdraw(IERC20 token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        token.transfer(msg.sender, amount);
    }
    
    function addToBlacklist(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        blacklist[account] = true;
        emit BlacklistUpdated(account, true);
    }
    
    function removeFromBlacklist(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
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
    
    function _calculateUnlockableAmount(UnstakeRequest[] storage requests) internal view returns (uint256 totalUnlockable) {
        for (uint256 i = 0; i < requests.length; i++) {
            if (block.number >= requests[i].unlockBlock) {
                totalUnlockable += requests[i].amount;
            }
        }
    }
    
    function _processUnstakeRequests(UnstakeRequest[] storage requests, uint256 requestedAmount) internal returns (uint256 processedAmount) {
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
    
    function _removeUnstakeRequest(UnstakeRequest[] storage arr, uint256 index) internal {
        if (index >= arr.length) revert IndexOutOfBounds();
        
        uint256 lastIndex = arr.length - 1;
        if (index != lastIndex) {
            arr[index] = arr[lastIndex];
        }
        arr.pop();
    }
    

}