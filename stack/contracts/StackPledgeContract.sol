// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./MetaNodeToken.sol";

import "./errors/CustomErrors.sol";
import "./events/Events.sol";
import "./constants/Constants.sol";
import "./modify/CustomModifiers.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title 质押合约 单币种质押
 */

// STAKE 质押合约 基于动态APR模型
contract StakePledgeContract is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    CustomModifiers
{
    // 定义角色常量
    struct UserInfo {
        uint256 userRewardPerTokenPaid; // 用户已领取的每个质押代币的奖励
        uint256 rewards; // 用户的累计奖励
        uint256 balances; // 用户的质押余额
        uint256 stakeTimestamps; // 用户的质押时间戳
        uint256 lastStakeTimes; // 用户的最后质押时间
        uint256 lastClaimTimes; // 用户的最后领取奖励时间
        uint256 lastUnstakeTimes; // 用户的最后取消质押时间
        uint256 totalRewardsByUser; // 用户的总奖励量
        uint256 totalClaimedByUser; // 用户的总领取量
        UnstakeRequest[] unstakeRequests; // 用户的解质押请求列表
    }

    //解质押请求结构体
    struct UnstakeRequest {
        uint256 amount;
        uint256 unlockBlock;
    }

    MetaNodeToken public metaNodeToken;

    // 版本跟踪用于升级
    uint16 public constant CONTRACT_VERSION = 1;

    //质押代币和奖励代币
    IERC20 public stakeToken =
        IERC20(0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238); // USDC
    IERC20 public rewardToken =
        IERC20(0xAB0CE015038945e4f115e0dA011D0DEdcA491DfA); // 奖励的代币ID
    uint256 public TOTAL_REWARDS = 1_000_000 * 10 ** 18; // 总奖励量
    uint256 public constant DURATION = 30 days; // 质押持续时间
    uint256 public minDepositAmount = 0.01 ether; // 最小质押金额
    uint256 public rewardRate; // 每秒奖励率
    uint256 public totalRewardsIssued; // 已经发放奖励 issued
    uint256 public startTime; // 质押开始时间
    uint256 public endTime; // 质押结束时间
    uint256 public totalStaked; // 总质押量
    uint256 public lastUpdateTime; // 上次更新时间
    uint256 public rewardPerTokenStored; // 每个质押代币的累计奖励
    uint256 public stake_cooldown = 1 minutes; // 质押和取消质押之间的冷却时间

    mapping(address => bool) public blacklist; // 黑名单地址

    mapping(address => UserInfo) public userInfo; // 用户信息

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        // 禁用初始化器以防止实现合约被直接使用
        // 这是OpenZeppelin v5.x中UUPS可升级合约的正确模式
        _disableInitializers();
    }

    function initialize(MetaNodeToken _metaNodeToken) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        metaNodeToken = _metaNodeToken;
        //默认权限
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        //初始化开始计时
        startStakingPeriod();
    }

    //判断账号有没有权限
    function hasRole(
        bytes32 role,
        address account
    ) public view override(AccessControlUpgradeable) returns (bool) {
        return super.hasRole(role, account);
    }

    //赋予权限和收回权限 (内部已执行emit事件)
    function grantRole(
        bytes32 role,
        address account
    ) public override(AccessControlUpgradeable) onlyRole(DEFAULT_ADMIN_ROLE) {
        super.grantRole(role, account);
    }

    function revokeRole(
        bytes32 role,
        address account
    ) public override(AccessControlUpgradeable) onlyRole(DEFAULT_ADMIN_ROLE) {
        super.revokeRole(role, account);
    }

    //升级合约
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {
        // 仅角色可以升级
        emit ContractUpgraded(
            ERC1967Utils.getImplementation(),
            newImplementation,
            CONTRACT_VERSION
        );
    }

    //暂停合约
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
        emit EmergencyPause(msg.sender, block.timestamp);
    }

    // 取消暂停合约
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
        emit EmergencyUnpause(msg.sender, block.timestamp);
    }

    // 紧急情况下的应急函数
    function emergencyPause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
        emit EmergencyPause(msg.sender, block.timestamp);
    }
    // 紧急提取功能
    function emergencyWithdraw(
        IERC20 token,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        token.transfer(msg.sender, amount);
    }
    // 质押合约开始运行
    function startStakingPeriod() public onlyRole(DEFAULT_ADMIN_ROLE) {
        if (startTime != 0) {
            revert StakingPeriodAlreadyStarted();
        }
        startTime = block.timestamp;
        endTime = startTime + DURATION;
        rewardRate = TOTAL_REWARDS / DURATION;
        lastUpdateTime = startTime;
    }

    //设置总奖励
    function setTotalRewards(
        uint256 newTotalRewards
    )
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        nonReentrant
        whenNotPaused
        onlyPositiveAmount(newTotalRewards)
        onlyDuringStakingPeriod(startTime, endTime)
    {
        //总奖励
        TOTAL_REWARDS = TOTAL_REWARDS + newTotalRewards;
        //奖励率为剩余的总奖励除以剩余持续时间
        uint256 remainingTime = endTime - block.timestamp;
        uint256 remainRewards = TOTAL_REWARDS - totalRewardsIssued;
        rewardRate = remainRewards / remainingTime;

        emit TotalRewardsUpdated(TOTAL_REWARDS, remainRewards);
    }

    //设置奖励代币
    function setRewardToken(
        IERC20 newRewardToken
    ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant whenNotPaused {
        emit RewardTokenUpdated(rewardToken, newRewardToken);
        rewardToken = newRewardToken;
    }

    //设置质押代币
    function setStakeToken(
        IERC20 newStakeToken
    ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant whenNotPaused {
        emit StakeTokenUpdated(stakeToken, newStakeToken);
        stakeToken = newStakeToken;
    }
    //质押奖励
    function updateReward(address account) internal nonReentrant whenNotPaused {
        // 计算到目前为止的每个质押代币的奖励
        rewardPerTokenStored = rewardPerToken();

        lastUpdateTime = min(block.timestamp, endTime);

        if (account != address(0)) {
            // 更新用户的累计奖励
            userInfo[account].rewards += earned(account);
            // 更新用户已领取的每个质押代币的奖励
            userInfo[account].userRewardPerTokenPaid = rewardPerTokenStored;
        }
    }

    // 计算每个质押代币的奖励
    function rewardPerToken() public view returns (uint256) {
        // 如果没有质押代币，则返回上一次计算的奖励
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }

        // 计算自上次更新以来的时间 , 用min防止到期还在计算奖励
        uint256 time = min(block.timestamp, endTime) - lastUpdateTime;

        //计算这段时间应该发放的奖励代币总量
        uint256 reward = time * rewardRate;
        // 计算每个质押代币的奖励
        return rewardPerTokenStored + reward / totalStaked;
    }

    // 计算用户从"上次结算"到"现在"应得的新增奖励
    // 公式：新增奖励 = (当前每个代币奖励 - 上次每个代币奖励) × 用户质押数量
    function earned(address account) public view returns (uint256) {
        return (userInfo[account].balances *
            (rewardPerToken() - userInfo[account].userRewardPerTokenPaid));
    }

    // 质押业务
    function stake(
        uint256 amount
    )
        external
        whenNotPaused
        nonReentrant
        onlyPositiveAmount(amount)
        onlyDuringStakingPeriod(startTime, endTime)
        onlyNotInBlacklist(msg.sender, blacklist)
    {
        //先更新用户的奖励，确保“质押前”的奖励被正确结算
        updateReward(msg.sender);
        //检查最小质押金额
        if (amount < minDepositAmount) {
            revert MinPledgeNotMet(minDepositAmount);
        }

        // 增加用户的质押余额
        userInfo[msg.sender].balances += amount;
        // 增加总质押量
        totalStaked += amount;
        // 记录质押时间戳
        userInfo[msg.sender].stakeTimestamps = block.timestamp;
        // 记录最后质押时间
        userInfo[msg.sender].lastStakeTimes = block.timestamp;
        //从用户钱包转账质押代币到合约
        stakeToken.transferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount);
    }

    //申请解质押
    function requestUnstake(
        uint256 amount
    )
        external
        whenNotPaused
        nonReentrant
        onlyPositiveAmount(amount)
        onlyNotInBlacklist(msg.sender, blacklist)
    {
        if (userInfo[msg.sender].balances < amount) {
            revert InsufficientBalance(amount, userInfo[msg.sender].balances);
        }
        //更新奖励
        updateReward(msg.sender);
        //创建解质押请求，设置解锁区块为当前区块加上冷却时间对应的区块数
        uint256 unlockBlock = block.number + (stake_cooldown / 12); // ethereum平均每块约12秒
        userInfo[msg.sender].unstakeRequests.push(
            UnstakeRequest(amount, unlockBlock)
        );

        emit RequestUnstake(msg.sender, amount, unlockBlock);
    }

    // 取消质押业务 需要先申请, 只有在解锁区块后才能取消质押
    function unstake(
        uint256 amount
    )
        external
        whenNotPaused
        nonReentrant
        onlyPositiveAmount(amount)
        onlyNotInBlacklist(msg.sender, blacklist)
    {
        // 检查冷却时间
        if (
            block.timestamp <
            userInfo[msg.sender].lastStakeTimes + stake_cooldown
        ) {
            uint256 timeRemaining = (userInfo[msg.sender].lastStakeTimes +
                stake_cooldown) - block.timestamp;
            revert CooldownNotMet(timeRemaining);
        }

        // 判断用户是否有足够的质押余额
        if (userInfo[msg.sender].balances < amount) {
            revert InsufficientBalance(amount, userInfo[msg.sender].balances);
        }
        // 检查是否有解质押请求
        if (userInfo[msg.sender].unstakeRequests.length == 0) {
            revert RequestUnstakeFailed(
                userInfo[msg.sender].unstakeRequests.length
            );
        }

        // 查看解质押请求列表，找到可以解锁的请求
        uint256 totalUnlockable = 0;
        // 遍历解质押请求，计算可解锁的总金额
        for (
            uint256 i = 0;
            i < userInfo[msg.sender].unstakeRequests.length;
            i++
        ) {
            if (
                block.number >=
                userInfo[msg.sender].unstakeRequests[i].unlockBlock
            ) {
                totalUnlockable += userInfo[msg.sender]
                    .unstakeRequests[i]
                    .amount;
            }
        }
        // 检查用户请求取消质押的金额是否小于或等于可解锁的总金额
        if (amount > totalUnlockable) {
            revert InsufficientBalance(amount, totalUnlockable);
        }
        // 使用优化后的方法处理解质押请求
        uint256 processedAmount = unstakeRequestProcess(
            userInfo[msg.sender].unstakeRequests,
            amount
        );

        // 确保处理的金额等于请求的金额
        if (processedAmount != amount) {
            revert FailedToProcessFullAmount();
        }

        //先更新用户的奖励，确保"取消质押前"的奖励被正确结算
        updateReward(msg.sender);
        // 减少用户的质押余额
        userInfo[msg.sender].balances -= amount;
        // 减少总质押量
        totalStaked -= amount;
        // 记录最后取消质押时间
        userInfo[msg.sender].lastUnstakeTimes = block.timestamp;
        //将质押代币从合约转回用户钱包
        stakeToken.transfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    //领取奖励
    function claimRewards()
        external
        whenNotPaused
        nonReentrant
        onlyDuringStakingPeriod(startTime, endTime)
        onlyNotInBlacklist(msg.sender, blacklist)
    {
        uint256 reward = userInfo[msg.sender].rewards;

        if (rewardToken.balanceOf(address(this)) < reward) {
            revert InsufficientRewardPool();
        }

        //先更新用户的奖励，确保"领取奖励前"的奖励被正确结算
        updateReward(msg.sender);

        if (reward > 0) {
            // 清空用户的累计奖励
            userInfo[msg.sender].rewards = 0;
            // 增加已发放的总奖励
            totalRewardsIssued += reward;
            // 增加用户的总奖励量
            userInfo[msg.sender].totalRewardsByUser += reward;
            // 增加用户的总领取量
            userInfo[msg.sender].totalClaimedByUser += reward;
            // 记录最后领取奖励时间
            userInfo[msg.sender].lastClaimTimes = block.timestamp;
            //将奖励代币从合约转到用户钱包
            rewardToken.transfer(msg.sender, reward);

            emit RewardsClaimed(msg.sender, reward);
        }
    }

    // 设置质押和取消质押之间的冷却时间 默认1分钟
    function setStakeCooldown(
        uint256 newCooldown
    ) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        emit TransferCooldownUpdated(stake_cooldown, newCooldown);
        stake_cooldown = newCooldown;
    }

    // 合规和黑名单函数
    function addToBlacklist(
        address account
    )
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        onlyValidAddress(account)
        onlyNotInBlacklist(account, blacklist)
    {
        blacklist[account] = true;
        emit BlacklistUpdated(account, true);
    }

    function removeFromBlacklist(
        address account
    ) external onlyRole(DEFAULT_ADMIN_ROLE) onlyValidAddress(account) {
        if (!blacklist[account]) {
            revert AddressNotBlacklisted(account);
        }
        blacklist[account] = false;
        emit BlacklistUpdated(account, false);
    }

    //获取用户详细信息的视图函数
    function getUserInfo(
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
        UserInfo storage info = userInfo[account];
        stakedBalance = info.balances;
        pendingRewards = info.rewards + earned(account);
        totalRewardsEarned = info.totalRewardsByUser;
        totalRewardsClaimed = info.totalClaimedByUser;
        pendingUnstakeRequests = info.unstakeRequests;
    }

    //获取合约状态统计的函数
    function getContractStats()
        external
        view
        returns (
            uint256 totalStakedTokens,
            uint256 totalRewardsDistributed,
            uint256 currentRewardRate,
            uint256 stakingStartTime,
            uint256 stakingEndTime
        )
    {
        totalStakedTokens = totalStaked;
        totalRewardsDistributed = totalRewardsIssued;
        currentRewardRate = rewardRate;
        stakingStartTime = startTime;
        stakingEndTime = endTime;
    }

    // 批量查询用户列表的功能
    function batchGetUserInfos(
        address[] calldata accounts
    ) external view returns (UserInfo[] memory userInfos) {
        uint256 length = accounts.length;
        userInfos = new UserInfo[](length);
        for (uint256 i = 0; i < length; i++) {
            userInfos[i] = userInfo[accounts[i]];
        }
    }

    ///////////////////////////////////////////////常规方法/////////////////////////////////////////////
    //设置最小质押额度,默认0.01 ether
    function setMinDepositAmount(
        uint256 newMinDeposit
    ) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        minDepositAmount = newMinDeposit;
    }

    function getVersion() external pure returns (uint16) {
        return CONTRACT_VERSION;
    }

    // 辅助函数：返回两个数中较小的
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    /**
     * @dev 高效移除指定索引的元素（swap-and-pop，不保持顺序）
     * @param arr 要操作的数组
     * @param index 要移除的元素索引
     * @notice 这个函数会改变数组顺序，但效率最高 O(1)
     */
    function unstakeRequestRemove(
        UnstakeRequest[] storage arr,
        uint256 index
    ) internal {
        // 使用自定义错误替代 require，节省 gas
        if (index >= arr.length) {
            revert IndexOutOfBounds();
        }

        // 避免不必要的赋值操作
        uint256 lastIndex = arr.length - 1;
        if (index != lastIndex) {
            // 只有当要删除的不是最后一个元素时才进行 swap
            arr[index] = arr[lastIndex];
        }

        // 删除最后一个元素
        arr.pop();
    }

    /**
     * @dev 处理解质押请求，返回实际处理的金额
     * @param arr 解质押请求数组
     * @param requestedAmount 请求处理的金额
     * @return processedAmount 实际处理的金额
     */
    function unstakeRequestProcess(
        UnstakeRequest[] storage arr,
        uint256 requestedAmount
    ) internal returns (uint256 processedAmount) {
        uint256 remaining = requestedAmount;
        uint256 i = 0;

        while (remaining > 0 && i < arr.length) {
            if (block.number >= arr[i].unlockBlock) {
                // 已解锁
                if (arr[i].amount <= remaining) {
                    // 完全处理这个请求
                    remaining -= arr[i].amount;
                    unstakeRequestRemove(arr, i);
                    // 不增加 i，因为当前位置现在是之前的最后一个元素
                } else {
                    // 部分处理这个请求
                    arr[i].amount -= remaining;
                    remaining = 0;
                }
            } else {
                // 未解锁，检查下一个
                i++;
            }
        }

        processedAmount = requestedAmount - remaining;
    }
}
