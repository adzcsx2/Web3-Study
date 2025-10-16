// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./MetaNodeToken.sol";

import "./errors/CustomErrors.sol";
import "./events/Events.sol";
import "./constants/Constants.sol";
import "./modify/CustomModifiers.sol";
import "./struct/UnstakeRequest.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

// STAKE 质押合约
contract StakePledgeContract is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    CustomModifiers
{
    MetaNodeToken public metaNodeToken;

    // 版本跟踪用于升级
    uint16 public constant CONTRACT_VERSION = 1;

    //质押代币和奖励代币
    IERC20 public stakeToken; // 质押的代币ID
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

    mapping(address => uint256) public userRewardPerTokenPaid; // 用户已领取的每个质押代币的奖励
    mapping(address => uint256) public rewards; // 用户的累计奖励
    mapping(address => uint256) public balances; // 用户的质押余额
    mapping(address => uint256) public stakeTimestamps; // 用户的质押时间戳
    mapping(address => uint256) public lastStakeTimes; // 用户的最后质押时间
    mapping(address => uint256) public lastClaimTimes; // 用户的最后领取奖励时间
    mapping(address => uint256) public lastUnstakeTimes; // 用户的最后取消质押时间
    mapping(address => uint256) public totalRewardsByUser; // 用户的总奖励量
    mapping(address => uint256) public totalClaimedByUser; // 用户的总领取量
    mapping(address => UnstakeRequest[]) public unstakeRequests; // 用户的解质押请求列表

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

    //开始质押周期
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

    //质押奖励
    function updateReward(address account) internal nonReentrant whenNotPaused {
        // 计算到目前为止的每个质押代币的奖励
        rewardPerTokenStored = rewardPerToken();

        lastUpdateTime = min(block.timestamp, endTime);

        if (account != address(0)) {
            // 更新用户的累计奖励
            rewards[account] += earned(account);
            // 更新用户已领取的每个质押代币的奖励
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
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

    // 计算用户从“上次结算”到“现在”应得的新增奖励
    // 公式：新增奖励 = (当前每个代币奖励 - 上次每个代币奖励) × 用户质押数量
    function earned(address account) public view returns (uint256) {
        return (balances[account] *
            (rewardPerToken() - userRewardPerTokenPaid[account]));
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
    {
        //先更新用户的奖励，确保“质押前”的奖励被正确结算
        updateReward(msg.sender);
        //检查最小质押金额
        if (amount < minDepositAmount) {
            revert MinPledgeNotMet(minDepositAmount);
        }

        // 增加用户的质押余额
        balances[msg.sender] += amount;
        // 增加总质押量
        totalStaked += amount;
        // 记录质押时间戳
        stakeTimestamps[msg.sender] = block.timestamp;
        // 记录最后质押时间
        lastStakeTimes[msg.sender] = block.timestamp;
        //从用户钱包转账质押代币到合约
        stakeToken.transferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount);
    }

    //申请解质押
    function requestUnstake(
        uint256 amount
    ) external whenNotPaused nonReentrant onlyPositiveAmount(amount) {
        if (balances[msg.sender] < amount) {
            revert InsufficientBalance(amount, balances[msg.sender]);
        }
        //更新奖励
        updateReward(msg.sender);
        //创建解质押请求，设置解锁区块为当前区块加上冷却时间对应的区块数
        uint256 unlockBlock = block.number + (stake_cooldown / 12); // ethereum平均每块约12秒
        unstakeRequests[msg.sender].push(UnstakeRequest(amount, unlockBlock));

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
        onlyAfterCooldown(msg.sender, lastStakeTimes, stake_cooldown)
    {
        // 判断用户是否有足够的质押余额
        if (balances[msg.sender] < amount) {
            revert InsufficientBalance(amount, balances[msg.sender]);
        }
        // 检查是否有解质押请求
        if (unstakeRequests[msg.sender].length == 0) {
            revert RequestUnstakeFailed(unstakeRequests[msg.sender]);
        }

        // 查看解质押请求列表，找到可以解锁的请求
        uint256 totalUnlockable = 0;
        // 遍历解质押请求，计算可解锁的总金额
        for (uint256 i = 0; i < unstakeRequests[msg.sender].length; i++) {
            if (block.number >= unstakeRequests[msg.sender][i].unlockBlock) {
                totalUnlockable += unstakeRequests[msg.sender][i].amount;
            }
        }
        // 检查用户请求取消质押的金额是否小于或等于可解锁的总金额
        if (amount > totalUnlockable) {
            revert InsufficientBalance(amount, totalUnlockable);
        }
        // 从解质押请求列表中移除已处理的请求
        uint256 remaining = amount;
        while (remaining > 0 && unstakeRequests[msg.sender].length > 0) {
            if (block.number >= unstakeRequests[msg.sender][0].unlockBlock) {
                //已解锁
                if (unstakeRequests[msg.sender][0].amount <= remaining) {
                    // 如果解锁请求的金额小于等于剩余需要取消质押的金额
                    remaining -= unstakeRequests[msg.sender][0].amount;
                    // 移除请求
                    unstakeRequestRemoveAt(unstakeRequests[msg.sender], 0);
                } else {
                    //如果解锁请求的金额大于剩余需要取消质押的金额
                    unstakeRequests[msg.sender][0].amount -= remaining;
                    remaining = 0;
                }
            } else {
                break; // 后续请求还未解锁，直接跳出循环
            }
        }

        //先更新用户的奖励，确保“取消质押前”的奖励被正确结算
        updateReward(msg.sender);
        // 减少用户的质押余额
        balances[msg.sender] -= amount;
        // 减少总质押量
        totalStaked -= amount;
        // 记录最后取消质押时间
        lastUnstakeTimes[msg.sender] = block.timestamp;
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
    {
        //先更新用户的奖励，确保“领取奖励前”的奖励被正确结算
        updateReward(msg.sender);
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            // 清空用户的累计奖励
            rewards[msg.sender] = 0;
            // 增加已发放的总奖励
            totalRewardsIssued += reward;
            // 增加用户的总奖励量
            totalRewardsByUser[msg.sender] += reward;
            // 增加用户的总领取量
            totalClaimedByUser[msg.sender] += reward;
            // 记录最后领取奖励时间
            lastClaimTimes[msg.sender] = block.timestamp;
            //将奖励代币从合约转到用户钱包
            rewardToken.transfer(msg.sender, reward);

            emit RewardsClaimed(msg.sender, reward);
        }
    }

    // 设置质押和取消质押之间的冷却时间 默认1分钟
    function setStakeCooldown(
        uint256 newCooldown
    ) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        stake_cooldown = newCooldown;
    }

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
     *  移除指定索引的元素（保持顺序）
     */
    function unstakeRequestRemoveAt(
        UnstakeRequest[] storage arr,
        uint256 index
    ) internal {
        require(index < arr.length, "Index out of bounds");
        for (uint256 i = index; i < arr.length - 1; i++) {
            arr[i] = arr[i + 1];
        }
        arr.pop();
    }
}
