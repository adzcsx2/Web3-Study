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
import "../../modifiers/NextswapModifier.sol";
import "../../errors/NextswapErrors.sol";

contract LiquidityMiningReward is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable,
    NextswapModifier
{
    using SafeERC20 for IERC20;
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

    //用户奖励映射
    mapping(address => uint256) public rewards;

    // npm
    INonfungiblePositionManager public immutable npm;

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

    /**
     * @dev Constructor 用于初始化 immutable 变量
     * @notice UUPS 模式下，constructor 只在部署实现合约时执行一次
     * @param _tokenAddress NST 代币地址
     * @param _npm Uniswap V3 Position Manager 地址
     * @param _startTime 挖矿开始时间
     */
    constructor(address _tokenAddress, address _npm, uint256 _startTime) {
        // 初始化 immutable 变量（这些值部署后不可更改）
        nextSwapToken = IERC20(_tokenAddress);
        npm = INonfungiblePositionManager(_npm);
        startTime = _startTime;
        endTime = _startTime + 4 * 365 days; // 4年后
        claimDeadline = endTime + 365 days; // 结束时间后1年

        // 禁用实现合约的初始化，防止被直接调用
        _disableInitializers();
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
    ) public initializer {
        // 初始化普通状态变量
        ecosystemFundAddress = _ecosystemFundAddress;
        timelock = _timelock;

        // 授予角色
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(TIMELOCK_ROLE, _timelock);
    }

    // -------------------------------------------核心功能-------------------------------------

   

    /**
     * @dev 流动性挖矿合约开发任务清单（按开发顺序）
     *
     * ===== 阶段一：基础架构 =====
     * [TODO] 1. 定义核心数据结构
     *        - PoolInfo: 池子信息（地址、权重、累积奖励、总流动性）
     *        - StakeInfo: 质押信息（tokenId、流动性、奖励债务、质押时间、解质押请求时间）
     *        - 相关映射关系（用户->质押列表、池子->配置）
     *
     * [TODO] 2. 实现池子管理功能
     *        - addPool: 添加支持的流动性池子
     *        - updatePoolWeight: 调整池子分配权重
     *        - massUpdatePools: 批量更新所有池子的奖励
     *
     * ===== 阶段二：核心质押功能 =====
     * [TODO] 3. 实现NFT质押功能
     *        - stake: 质押单个LP NFT
     *        - batchStake: 批量质押多个NFT（Gas优化）
     *        - 验证NFT有效性（所有权、流动性>0、价格区间）
     *        - 防止重复质押检查
     *
     * [TODO] 4. 实现NFT解质押流程
     *        - requestUnstake: 申请解质押（进入冷却期）
     *        - unstake: 执行解质押（冷却期结束后）
     *        - 冷却期配置管理
     *
     * ===== 阶段三：奖励系统 =====
     * [TODO] 5. 实现奖励计算机制
     *        - updatePool: 更新单个池子的累积奖励
     *        - pendingReward: 计算用户待领取奖励
     *        - 支持多池子权重分配
     *        - 基于流动性大小的奖励分配
     *
     * [TODO] 6. 实现奖励领取功能
     *        - claimReward: 领取单个NFT奖励
     *        - claimAll: 批量领取所有奖励
     *        - 自动更新奖励债务
     *
     * ===== 阶段四：安全增强 =====
     * [TODO] 7. NFT流动性验证
     *        - 检查流动性是否>0
     *        - 验证价格区间是否在当前价格附近
     *        - 排除已过期或无效的仓位
     *
     * [TODO] 8. 防作弊机制
     *        - 最小质押时长限制（防闪电贷攻击）
     *        - NFT转移后自动失效检查
     *        - 单个NFT奖励上限控制
     *
     * ===== 阶段五：查询接口 =====
     * [TODO] 9. 用户数据查询
     *        - getUserStakes: 查询用户所有质押的NFT
     *        - getUserTotalReward: 查询用户总待领取奖励
     *        - getStakeInfo: 查询单个质押详情
     *
     * [TODO] 10. 池子数据查询
     *         - getPoolInfo: 查询池子详细信息
     *         - getPoolAPR: 计算池子实时年化收益率
     *         - getTotalAllocPoint: 查询总权重
     *
     * [DONE] 11. 统计数据查询
     *         ✓ calculateReleasedTokens: 已解锁代币数量
     *         - totalDistributed: 已发放代币总量（需在领取时更新）
     *
     * ===== 阶段六：优化功能 =====
     * [TODO] 12. Boost机制
     *         - 长期质押时间加成
     *         - 价格区间宽度权重调整
     *         - VIP等级加成系统
     *
     * [TODO] 13. Gas优化
     *         - 使用uint128/uint64打包存储
     *         - 批量操作接口
     *         - 延迟更新机制
     *
     * ===== 阶段七：管理与控制 =====
     * [DONE] 14. 紧急控制
     *         ✓ pause: 暂停合约
     *         ✓ unpause: 恢复合约
     *         - emergencyWithdraw: 紧急提取NFT（暂停时可用）
     *
     * [TODO] 15. 参数配置管理
     *         - setMinStakeDuration: 设置最小质押时长
     *         - setUnstakeCooldown: 设置解质押冷却期
     *         - setRewardCap: 设置奖励上限
     *
     * [DONE] 16. 合约升级
     *         ✓ _authorizeUpgrade: UUPS升级授权
     *         ✓ 时间锁控制
     *
     * ===== 阶段八：收尾与清算 =====
     * [DONE] 17. 最终清算
     *         ✓ finalizeRewards: 领取截止后转移剩余代币到生态基金
     *
     * [TODO] 18. 奖励池监控
     *         - checkRewardBalance: 检查奖励池余额充足性
     *         - 余额不足时的降级处理
     */

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

    /**
     * @dev UUPS升级授权
     * @notice 只有管理员或时间锁可以升级合约
     * @param newImplementation 新实现合约地址
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override nonZeroAddress(newImplementation) onlyAdminOrTimelock {}

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
            return (LIQUIDITY_MINING_TOTAL * elapsedTime) / totalDuration;
        }
    }
}
