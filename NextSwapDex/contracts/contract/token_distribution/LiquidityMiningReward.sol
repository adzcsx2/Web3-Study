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
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "../swap/periphery/interfaces/INonfungiblePositionManager.sol";

import "../../events/NextswapEvents.sol";
import "../../modifiers/NextswapModifiers.sol";
import "../../errors/NextswapErrors.sol";

contract LiquidityMiningReward is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable,
    NextswapModifiers
{
    using SafeERC20 for IERC20;

    // ====== 时间常量 ======
    uint256 public constant MINING_DURATION_YEARS = 4; // 挖矿持续时间：4年
    uint256 public constant MAX_CLAIM_PERIOD_YEARS = 5; // 最大领取期限：5年（包含4年挖矿期）

    // 生态基金地址
    address public ecosystemFundAddress;
    // 时间锁合约地址
    address public timelock;
    // Nextswap代币合约地址
    IERC20 public immutable nextSwapToken;

    uint256 public immutable startTime; //开始时间
    uint256 public immutable endTime; //结束时间 4年后
    uint256 public immutable claimDeadline; //奖励领取截止时间 -- 结束时间后1年

    //已发放代币总量
    uint256 public totalDistributed;

    // npm
    INonfungiblePositionManager public immutable npm;

    // 授权的池子映射
    mapping(address => bool) public authorizedPools;

    // 必须是管理员或者时间锁角色
    modifier onlyAdminOrTimelock() {
        if (
            !hasRole(DEFAULT_ADMIN_ROLE, msg.sender) &&
            !hasRole(TIMELOCK_ROLE, msg.sender)
        ) {
            revert UnauthorizedAdminOrTimelock();
        }
        _;
    }

    // 必须是授权的池子
    modifier onlyAuthorizedPool() {
        if (!authorizedPools[msg.sender]) {
            revert NotAuthorizedPool();
        }
        _;
    }

    /**
     * @dev Constructor 用于初始化 immutable 变量
     * @notice UUPS 模式下，constructor 只在部署实现合约时执行一次
     * @param _tokenAddress NST 代币地址
     * @param _npm Uniswap V3 Position Manager 地址
     * @param _startTime 挖矿开始时间
     */
    constructor(address _tokenAddress, address _npm, uint256 _startTime) {
        // 参数验证
        if (_tokenAddress == address(0)) {
            revert InvalidTokenAddress();
        }
        if (_npm == address(0)) {
            revert InvalidNPMAddress();
        }
        if (_startTime <= block.timestamp) {
            revert StartTimeNotInFuture();
        }

        // 初始化 immutable 变量（这些值部署后不可更改）
        nextSwapToken = IERC20(_tokenAddress);
        npm = INonfungiblePositionManager(_npm);
        startTime = _startTime;
        endTime = _startTime + MINING_DURATION_YEARS * 365 days; // 4年后
        claimDeadline = _startTime + MAX_CLAIM_PERIOD_YEARS * 365 days; // 最大领取期限：开始后5年

        // 注释掉禁用初始化，允许在非代理模式下使用
        // _disableInitializers();
    }

    /**
     * @dev 代理合约的初始化函数
     * @notice 只能被调用一次，用于初始化代理合约的状态
     * @notice initializer 修饰符确保只能调用一次，无需额外权限检查
     * @param _ecosystemFundAddress 生态基金地址
     * @param _timelock 时间锁合约地址
     * @param _admin 初始管理员地址
     */
    function initialize(
        address _ecosystemFundAddress,
        address _timelock,
        address _admin
    )
        public
        initializer
        nonZeroAddress(_ecosystemFundAddress)
        nonZeroAddress(_timelock)
        nonZeroAddress(_admin)
    {
        // 初始化继承的合约
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        // 初始化普通状态变量
        ecosystemFundAddress = _ecosystemFundAddress;
        timelock = _timelock;

        // 授予角色
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(TIMELOCK_ROLE, _timelock);
    }

    // -------------------------------------------核心功能-------------------------------------

    /**
     * @notice 授权池子调用的转账函数
     * @dev 只有授权的池子合约可以调用，用于发放挖矿奖励
     * @param to 接收地址
     * @param amount 转账数量
     */
    function transferRewards(
        address to,
        uint256 amount
    )
        external
        onlyAuthorizedPool
        nonReentrant
        whenNotPaused
        nonZeroAddress(to)
        amountGreaterThanZero(amount)
    {
        uint256 releasedTokens = calculateReleasedTokens();
        uint256 availableTokens = releasedTokens - totalDistributed;

        if (amount > availableTokens) {
            revert InsufficientReleasedTokens();
        }

        totalDistributed += amount;
        nextSwapToken.safeTransfer(to, amount);
        emit RewardClaimed(to, amount);
    }

    /**
     * @notice 添加授权池子
     * @param pool 池子地址
     */
    function addAuthorizedPool(
        address pool
    ) external onlyAdminOrTimelock nonZeroAddress(pool) {
        authorizedPools[pool] = true;
        emit PoolAuthorized(pool, true);
    }

    /**
     * @notice 移除授权池子
     * @param pool 池子地址
     */
    function removeAuthorizedPool(
        address pool
    ) external onlyAdminOrTimelock nonZeroAddress(pool) {
        authorizedPools[pool] = false;
        emit PoolAuthorized(pool, false);
    }

    /**
     * @dev 设置生态基金地址
     * @param newAddress 新地址
     */
    function setEcosystemFundAddress(
        address newAddress
    ) external onlyAdminOrTimelock nonZeroAddress(newAddress) {
        emit EcosystemFundAddressChanged(ecosystemFundAddress, newAddress);
        ecosystemFundAddress = newAddress;
    }

    /**
     * @notice 5年后最终处理剩余奖励
     * @dev 在最大领取期限（5年）后执行：
     *      1. 将所有剩余的奖励代币转入生态基金地址
     *      2. NFT仍可继续质押，但第5年起无挖矿奖励（仅4年挖矿期）
     *      3. 后续可通过合约升级添加手续费分配或其他奖励机制
     *      注意：此函数不回收NFT，用户需手动解除质押
     */
    function finalizeRewards()
        external
        onlyAdminOrTimelock
        nonReentrant
        whenNotPaused
    {
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
    function pause() external onlyAdminOrTimelock {
        _pause();
    }

    /**
     * @dev 恢复合约
     */
    function unpause() external onlyAdminOrTimelock {
        _unpause();
    }

    /**
     * @dev UUPS升级授权
     * @notice 只有管理员或时间锁可以升级合约
     * @param newImplementation 新实现合约地址
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override nonZeroAddress(newImplementation) onlyAdminOrTimelock {}

    // ====== 紧急提取函数 ======
    /**
     * @notice 紧急提取代币（仅在暂停时可用）
     * @dev 允许管理员在紧急情况下提取代币到生态基金
     * @param amount 提取数量，如果为0则提取全部
     */
    function emergencyWithdraw(
        uint256 amount
    ) external onlyAdminOrTimelock whenPaused {
        uint256 balance = nextSwapToken.balanceOf(address(this));
        uint256 withdrawAmount = amount == 0 ? balance : amount;

        if (withdrawAmount > balance) {
            revert InsufficientContractBalance();
        }
        if (withdrawAmount == 0) {
            revert NothingToWithdraw();
        }

        nextSwapToken.safeTransfer(ecosystemFundAddress, withdrawAmount);
        emit EmergencyTokenRecovered(
            address(nextSwapToken),
            ecosystemFundAddress,
            withdrawAmount,
            msg.sender
        );
    }

    // ---------------------------------------view functions----------------------------------------
    /**
     * @notice 获取当前可用的奖励余额
     * @return 当前可以发放的代币数量
     */
    function getAvailableRewards() public view returns (uint256) {
        uint256 releasedTokens = calculateReleasedTokens();
        if (releasedTokens <= totalDistributed) {
            return 0;
        }
        return releasedTokens - totalDistributed;
    }

    /**
     * @notice 检查地址是否为授权池子
     * @param pool 池子地址
     * @return 是否授权
     */
    function isAuthorizedPool(address pool) public view returns (bool) {
        return authorizedPools[pool];
    }

    /**
     * @notice 获取合约当前代币余额
     * @return 合约持有的代币数量
     */
    function getContractBalance() public view returns (uint256) {
        return nextSwapToken.balanceOf(address(this));
    }

    /**
     * @notice 获取当前每秒奖励速率
     * @dev 根据总释放量和释放周期计算
     *      注意：只在4年挖矿期内有奖励，第5年奖励为0
     * @return 每秒应该释放的代币数量
     */
    function getRewardPerSecond() public view returns (uint256) {
        if (block.timestamp < startTime || block.timestamp >= endTime) {
            return 0;
        }

        // 总释放周期（秒）
        uint256 totalDuration = endTime - startTime; // 4 年 = 126,144,000 秒

        // 每秒释放量 = 总量 / 总秒数
        // 5亿 / 126,144,000 ≈ 3,963.45 NST/秒
        // 换算成每日 ≈ 342,465 NST/天
        return LIQUIDITY_MINING_TOTAL / totalDuration;
    }

    /**
     * @notice 计算已释放的代币数量
     * @dev 线性释放模型：
     *      - 前4年：线性释放5亿代币
     *      - 第4年结束后：总释放量固定为5亿
     *      - 第5年：不再释放新代币（奖励为0）
     * @return 已释放的代币总量
     */
    function calculateReleasedTokens() public view returns (uint256) {
        if (block.timestamp <= startTime) {
            return 0;
        } else if (block.timestamp >= endTime) {
            return LIQUIDITY_MINING_TOTAL; // 4年后释放量固定，第5年不再增加
        } else {
            uint256 elapsedTime = block.timestamp - startTime;
            uint256 totalDuration = endTime - startTime;
            return (LIQUIDITY_MINING_TOTAL * elapsedTime) / totalDuration;
        }
    }
}
