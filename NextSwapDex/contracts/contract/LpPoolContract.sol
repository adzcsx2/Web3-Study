// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../types/NextswapStructs.sol";
import "../errors/NextswapErrors.sol";
import "../modifiers/NextswapModifiers.sol";
import "../contract/swap/periphery/interfaces/INonfungiblePositionManager.sol";
import "../events/NextswapEvents.sol";
import "../contract/lib/PublicWithdrawable.sol";
import "./LpPoolManager.sol";

contract LpPoolContract is
    AccessControl,
    PublicWithdrawable,
    NextswapModifiers
{
    using SafeERC20 for IERC20;

    //LpPoolManager 合约地址
    LpPoolManager public immutable lpm;
    // LP NFT 头寸管理器合约地址
    INonfungiblePositionManager public immutable positionManager;
    // 奖励代币地址（immutable 节省 gas）
    address public immutable rewardTokenAddress;

    //池信息
    LpPoolInfo public poolInfo;

    // 用户质押信息映射: tokenId => 质押信息
    mapping(uint256 => LpNftStakeInfo) public lpNftStakes;

    // 用户质押的所有 NFT 列表: user => tokenId[]
    mapping(address => uint256[]) public userStakedTokens;

    // tokenId 在用户数组中的索引位置: tokenId => index
    mapping(uint256 => uint256) private tokenIdToIndex;

    // 解质押冷却时间
    uint256 public UNSTAKE_COOLDOWN = 3 days;

    // 必须是管理员或者时间锁角色（检查调用者在 LpPoolManager 中的角色）
    modifier onlyAdminOrTimelock() {
        if (
            !lpm.hasRole(DEFAULT_ADMIN_ROLE, msg.sender) &&
            !lpm.hasRole(TIMELOCK_ROLE, msg.sender)
        ) {
            revert UnauthorizedAdminOrTimelock();
        }
        _;
    }

    // 检查是否有权限操作指定的质押NFT（所有者或授权操作者）
    modifier isAuthorizedForToken(uint256 tokenId) {
        if (!_isAuthorized(tokenId, msg.sender)) {
            revert NotAuthorizedForToken();
        }
        _;
    }
    modifier isNFTOwner(uint256 tokenId) {
        if (positionManager.ownerOf(tokenId) != msg.sender) {
            revert NotNFTOwner();
        }
        _;
    }

    // 检查是否是 NFT 所有者
    modifier onlyStakeOwner(uint256 tokenId) {
        if (lpNftStakes[tokenId].owner != msg.sender) {
            revert NotStakeOwner();
        }
        _;
    }

    constructor(
        address _lpPoolManager,
        address _positionManager,
        address _rewardTokenAddress,
        LpPool memory _initialConfig
    )
        PublicWithdrawable(_rewardTokenAddress)
        nonZeroAddress(_positionManager)
        nonZeroAddress(_rewardTokenAddress)
    {
        lpm = LpPoolManager(_lpPoolManager);
        positionManager = INonfungiblePositionManager(_positionManager);
        rewardTokenAddress = _rewardTokenAddress;
        poolInfo = LpPoolInfo({
            poolConfig: _initialConfig,
            lastRewardTime: block.timestamp,
            activeTime: block.timestamp,
            endTime: 0,
            accNextSwapPerShare: 0,
            totalStaked: 0,
            totalLiquidity: 0,
            isActive: false
        });

        // 不需要在这里初始化角色，权限检查委托给 LpPoolManager
        // 但需要给 LpPoolManager 授予 DEFAULT_ADMIN_ROLE 以便调用 _checkOwner
        _grantRole(DEFAULT_ADMIN_ROLE, _lpPoolManager);
    }

    /**
     * @notice 设置池子激活状态
     */
    function activatePool(bool isActive) external onlyAdminOrTimelock {
        if (poolInfo.isActive == isActive) {
            revert PoolStatusNotChange();
        }
        poolInfo.isActive = isActive;
        if (isActive) {
            poolInfo.activeTime = block.timestamp;
        } else {
            poolInfo.endTime = block.timestamp;
        }
        emit PoolActivate(
            msg.sender,
            poolInfo.poolConfig.poolId,
            isActive,
            block.timestamp
        );
    }

    /**
     * @notice 质押 LP NFT
     * @param tokenId NFT 代币 ID
     * @dev 授权者必须是 NFT 的所有者或者被授权的操作者
     */
    function stakeLP(
        uint256 tokenId
    )
        external
        poolMustBeActive(poolInfo.isActive)
        isAuthorizedForToken(tokenId)
        whenNotPaused
        nonReentrant
    {
        // 验证并执行质押
        uint256 liquidity = _stakeSingleLP(tokenId, true);

        // 更新池子状态
        poolInfo.totalLiquidity += liquidity;
        poolInfo.totalStaked += 1;
    }

    /**
     * @notice 批量质押多个 LP NFT（Gas 优化版本）
     * @param tokenIds NFT 代币 ID 数组
     * @dev 批量操作可以节省 Gas，因为只需要一次重入检查和暂停检查
     */
    function batchStakeLP(
        uint256[] calldata tokenIds
    ) external poolMustBeActive(poolInfo.isActive) whenNotPaused nonReentrant {
        if (tokenIds.length == 0) {
            revert EmptyTokenIdArray();
        }
        if (tokenIds.length > 50) {
            revert BatchSizeTooLarge();
        }

        uint256 totalLiquidityAdded = 0;
        uint256 successCount = 0;

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];

            // 跳过已质押的 NFT
            if (lpNftStakes[tokenId].owner != address(0)) {
                continue;
            }

            // 检查权限
            if (!_isAuthorized(tokenId, msg.sender)) {
                continue; // 跳过无权限的 NFT
            }

            // 尝试质押，如果验证失败则跳过
            uint256 liquidity = _stakeSingleLP(tokenId, false);
            if (liquidity == 0) {
                continue; // 验证失败，跳过
            }

            // 累加流动性和成功计数
            totalLiquidityAdded += liquidity;
            successCount++;
        }

        // 批量更新池子状态（Gas 优化）
        if (successCount == 0) {
            revert NoValidNFTsToStake();
        }
        poolInfo.totalLiquidity += totalLiquidityAdded;
        poolInfo.totalStaked += successCount;
    }

    /**
     * @notice 请求解质押（检查冷却时间）
     * @param tokenId NFT 代币 ID
     * 授权者必须是 NFT 的所有者,被授权者不能请求解质押
     */
    function requestUnstakeLP(
        uint256 tokenId
    )
        external
        poolMustBeActive(poolInfo.isActive)
        onlyStakeOwner(tokenId)
        whenNotPaused
    {
        LpNftStakeInfo memory stakeInfo = lpNftStakes[tokenId];
        if (stakeInfo.requestedUnstakeAt == 0) {
            lpNftStakes[tokenId].requestedUnstakeAt = block.timestamp;
        } else {
            revert UnstakeAlreadyRequested();
        }
        emit RquestUnstakeLP(msg.sender, tokenId, block.timestamp);
    }

    /**
     * @notice 取消质押 LP NFT（所有者或授权操作者都可以调用）
     * @param tokenId NFT 代币 ID
     * 授权者必须是 NFT 的所有者,被授权者不能取消质押
     */
    function unstakeLP(
        uint256 tokenId
    )
        external
        poolMustBeActive(poolInfo.isActive)
        onlyStakeOwner(tokenId)
        whenNotPaused
        nonReentrant
    {
        LpNftStakeInfo memory stakeInfo = lpNftStakes[tokenId];
        address nftOwner = stakeInfo.owner;

        // 检查是否已请求解质押
        if (stakeInfo.requestedUnstakeAt == 0) {
            revert UnstakeNotRequested();
        }
        // 检查冷却时间是否已过
        if (block.timestamp < stakeInfo.requestedUnstakeAt + UNSTAKE_COOLDOWN) {
            revert UnstakeCooldownNotPassed();
        }

        // 先领取所有待领取的奖励（如果有）
        _updateRewardByTokenId(tokenId);
        if (lpNftStakes[tokenId].pendingRewards > 0) {
            _claimRewards(tokenId);
        }

        // 从所有者的质押列表中移除（使用交换删除法，避免数组重排）
        uint256 index = tokenIdToIndex[tokenId];
        uint256 lastIndex = userStakedTokens[nftOwner].length - 1;

        if (index != lastIndex) {
            uint256 lastTokenId = userStakedTokens[nftOwner][lastIndex];
            userStakedTokens[nftOwner][index] = lastTokenId;
            tokenIdToIndex[lastTokenId] = index;
        }

        userStakedTokens[nftOwner].pop();
        delete tokenIdToIndex[tokenId];

        // 总流动性减少
        poolInfo.totalLiquidity -= stakeInfo.liquidity;
        // 总质押数量减少
        poolInfo.totalStaked -= 1;

        // 删除质押信息
        delete lpNftStakes[tokenId];

        // 将 NFT 返还给原始所有者
        positionManager.safeTransferFrom(address(this), nftOwner, tokenId);

        emit LpUnstaked(nftOwner, tokenId, block.timestamp);
    }

    /**
     * @notice 领取质押奖励（公共接口）
     * @param tokenId NFT 代币 ID
     */
    function claimRewards(
        uint256 tokenId
    )
        external
        poolMustBeActive(poolInfo.isActive)
        isAuthorizedForToken(tokenId)
        whenNotPaused
        nonReentrant
    {
        _claimRewards(tokenId);
    }

    /**
     * @notice 批量领取质押奖励
     * @param tokenIds NFT 代币 ID 数组
     */
    function claimRewardsBatch(
        uint256[] calldata tokenIds
    ) external poolMustBeActive(poolInfo.isActive) whenNotPaused nonReentrant {
        _claimRewardsBatch(tokenIds);
    }
    /**
     * @notice 领取用户所有质押 NFT 的奖励
     * @param user 用户地址
     */
    function claimRewardsByUser(
        address user
    ) external poolMustBeActive(poolInfo.isActive) whenNotPaused nonReentrant {
        uint256[] memory tokenIds = userStakedTokens[user];
        if (tokenIds.length == 0) {
            revert NoStakedTokens();
        }
        _claimRewardsBatch(tokenIds);
    }

    /**
     * @notice 设置解质押冷却时间
     * @param _cooldown 冷却时间（秒）
     */
    function setUnstakeCooldown(
        uint256 _cooldown
    ) external onlyAdminOrTimelock whenNotPaused {
        UNSTAKE_COOLDOWN = _cooldown;
    }

    /**
     * @notice 同步 NFT 实际流动性（当用户调用 increaseLiquidity/decreaseLiquidity 后）
     * @param tokenId NFT 代币 ID
     * @dev 先结算当前奖励，再更新流动性值
     * @dev 只有 NFT 所有者或授权操作者可以调用
     */
    function syncLiquidity(
        uint256 tokenId
    )
        external
        poolMustBeActive(poolInfo.isActive)
        isAuthorizedForToken(tokenId)
        whenNotPaused
        nonReentrant
    {
        LpNftStakeInfo storage stakeInfo = lpNftStakes[tokenId];
        if (stakeInfo.owner == address(0)) {
            revert TokenNotStaked();
        }

        // 先按旧流动性结算奖励
        _updateRewardByTokenId(tokenId);

        // 获取实际流动性
        uint128 actualLiquidity = getPositionLiquidity(tokenId);
        uint256 oldLiquidity = stakeInfo.liquidity;

        if (actualLiquidity == oldLiquidity) {
            return; // 流动性未变化
        }

        // 更新总流动性
        if (actualLiquidity > oldLiquidity) {
            poolInfo.totalLiquidity += (actualLiquidity - oldLiquidity);
        } else {
            poolInfo.totalLiquidity -= (oldLiquidity - actualLiquidity);
        }

        // 更新质押信息中的流动性
        stakeInfo.liquidity = actualLiquidity;
    }
    // ------------------------------------ internal helper functions ------------------------------------

    /**
     * @notice 质押单个 LP NFT 的内部逻辑
     * @param tokenId NFT 代币 ID
     * @param revertOnError 是否在错误时回退（true=回退，false=返回0跳过）
     * @return liquidity 质押的流动性数量（验证失败时返回0）
     * @dev 提取公共逻辑，供 stakeLP 和 batchStakeLP 调用
     */
    function _stakeSingleLP(
        uint256 tokenId,
        bool revertOnError
    ) internal returns (uint256 liquidity) {
        // 检查是否已质押
        if (lpNftStakes[tokenId].owner != address(0)) {
            if (revertOnError) revert AlreadyStaked();
            return 0;
        }

        // 获取 NFT 的真实所有者（质押前）
        address nftOwner = positionManager.ownerOf(tokenId);

        // 从 Position Manager 获取流动性信息
        (
            ,
            ,
            address token0,
            address token1,
            uint24 fee,
            ,
            ,
            uint128 _liquidity,
            ,
            ,
            ,

        ) = positionManager.positions(tokenId);

        // 验证代币对和费率是否匹配池配置
        if (
            token0 != poolInfo.poolConfig.tokenA ||
            token1 != poolInfo.poolConfig.tokenB
        ) {
            if (revertOnError) revert TokenPairMismatch();
            return 0;
        }
        if (fee != poolInfo.poolConfig.fee) {
            if (revertOnError) revert FeeRateMismatch();
            return 0;
        }
        if (_liquidity == 0) {
            if (revertOnError) revert NoLiquidity();
            return 0;
        }

        // 从 NFT 所有者转移到本合约
        // 如果 msg.sender 不是所有者，需要有授权才能成功
        positionManager.safeTransferFrom(nftOwner, address(this), tokenId);

        // 记录质押信息 - owner 是 NFT 的原始所有者
        lpNftStakes[tokenId] = LpNftStakeInfo({
            owner: nftOwner,
            tokenId: tokenId,
            liquidity: _liquidity,
            stakedAt: block.timestamp,
            receivedReward: 0,
            pendingRewards: 0,
            lastClaimAt: 0,
            requestedUnstakeAt: 0
        });

        // 添加到真实所有者的质押列表
        tokenIdToIndex[tokenId] = userStakedTokens[nftOwner].length;
        userStakedTokens[nftOwner].push(tokenId);

        emit LpStaked(nftOwner, tokenId, block.timestamp);

        return uint256(_liquidity);
    }

    /**
     * @notice 更新池子的累计奖励
     * @dev 根据时间差和动态奖励率计算新增的累计每份额奖励
     */
    function _updatePool() internal whenNotPaused {
        // 如果当前时间还没到上次奖励时间，直接返回
        if (block.timestamp <= poolInfo.lastRewardTime) {
            return;
        }

        // 如果总流动性为0，只更新时间
        if (poolInfo.totalLiquidity == 0) {
            poolInfo.lastRewardTime = block.timestamp;
            return;
        }

        // 计算时间差
        uint256 timeDiff = block.timestamp - poolInfo.lastRewardTime;

        // 从 LpPoolManager 获取该池子当前的每秒奖励速率（根据权重自动计算）
        uint256 rewardPerSecond = lpm.getPoolRewardPerSecond(
            poolInfo.poolConfig.poolId
        );

        // 计算这段时间应发放的奖励总额
        uint256 reward = timeDiff * rewardPerSecond;

        // 更新累计每份额奖励（放大1e18倍以保持精度）
        poolInfo.accNextSwapPerShare +=
            (reward * 1e18) /
            poolInfo.totalLiquidity;

        // 更新最后奖励时间
        poolInfo.lastRewardTime = block.timestamp;
    }

    /**
     * @notice 领取质押奖励（内部函数）
     * @param tokenId NFT 代币 ID
     */
    function _claimRewards(uint256 tokenId) internal {
        //更新待领取奖励
        _updateRewardByTokenId(tokenId);
        LpNftStakeInfo storage stakeInfo = lpNftStakes[tokenId];
        // 先保存待领取的奖励金额
        uint256 rewardAmount = stakeInfo.pendingRewards;
        if (rewardAmount == 0) {
            revert NoRewardsToClaim();
        }

        // 更新状态
        stakeInfo.lastClaimAt = block.timestamp;
        stakeInfo.receivedReward += rewardAmount;
        stakeInfo.pendingRewards = 0;

        // 从奖励池地址转账奖励代币到用户
        // 调用 LiquidityMiningReward 合约的转账接口
        lpm.liquidityMiningRewardContract().transferRewards(
            stakeInfo.owner,
            rewardAmount
        );

        emit RewardsClaimed(
            stakeInfo.owner,
            tokenId,
            rewardAmount,
            block.timestamp
        );
    }
    function _updateRewardByTokenId(
        uint256 tokenId
    ) internal poolMustBeActive(poolInfo.isActive) whenNotPaused {
        // 先更新池子的累计奖励
        _updatePool();

        LpNftStakeInfo storage stakeInfo = lpNftStakes[tokenId];

        // 同步实际流动性（如果有变化）
        uint128 actualLiquidity = getPositionLiquidity(tokenId);
        uint256 oldLiquidity = stakeInfo.liquidity;

        if (actualLiquidity != oldLiquidity) {
            // 更新总流动性
            if (actualLiquidity > oldLiquidity) {
                poolInfo.totalLiquidity += (actualLiquidity - oldLiquidity);
            } else {
                poolInfo.totalLiquidity -= (oldLiquidity - actualLiquidity);
            }
            // 更新质押信息中的流动性
            stakeInfo.liquidity = actualLiquidity;
        }

        // 计算该NFT的待领取奖励（使用更新后的流动性）
        uint256 liquidity = stakeInfo.liquidity;
        uint256 accNextSwapPerShare = poolInfo.accNextSwapPerShare;
        uint256 oldPendingRewards = stakeInfo.receivedReward +
            stakeInfo.pendingRewards;
        uint256 newPending = (liquidity * accNextSwapPerShare) /
            1e18 -
            oldPendingRewards;

        // 更新待领取奖励
        stakeInfo.pendingRewards += newPending;

        emit RewardsUpdated(
            stakeInfo.owner,
            _asArray(tokenId),
            block.timestamp
        );
    }

    /**
     * @notice 批量领取质押奖励
     * @param tokenIds NFT 代币 ID 数组
     */
    function _claimRewardsBatch(uint256[] memory tokenIds) internal {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (!_isAuthorized(tokenIds[i], msg.sender)) {
                revert NotAuthorizedForToken();
            }
            _claimRewards(tokenIds[i]);
        }
    }

    /**
     * @notice 将单个元素转换为数组
     * @param element 单个元素
     * @return arr 包含单个元素的数组
     */
    function _asArray(
        uint256 element
    ) internal pure returns (uint256[] memory arr) {
        arr = new uint256[](1);
        arr[0] = element;
        return arr;
    }

    // ------------------------------------------overrides------------------------------------------
    //
    /**
     * @notice 检查暂停权限
     * @dev 实现 PublicPausable 的抽象方法，检查调用者在 LpPoolManager 中的权限
     */
    function _checkPauser() internal view override {
        if (
            !lpm.hasRole(DEFAULT_ADMIN_ROLE, msg.sender) &&
            !lpm.hasRole(TIMELOCK_ROLE, msg.sender)
        ) {
            revert UnauthorizedAdminOrTimelock();
        }
    }

    /**
     * @notice 检查所有者权限（用于 PublicWithdrawable）
     * @dev 检查调用者在 LpPoolManager 中是否有管理员角色
     */
    function _checkOwner() internal view override {
        if (!lpm.hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedAdminOrTimelock();
        }
    }

    // --------------------------------------------view functions--------------------------------------------

    /**
     * @notice 获取用户质押的所有 NFT
     * @param user 用户地址
     * @return tokenIds NFT ID 数组
     */
    function getUserStakedTokens(
        address user
    ) external view returns (uint256[] memory) {
        return userStakedTokens[user];
    }

    /**
     * @notice 获取用户质押的 NFT 数量
     * @param user 用户地址
     * @return count NFT 数量
     */
    function getUserStakedCount(address user) external view returns (uint256) {
        return userStakedTokens[user].length;
    }

    /**
     * @notice 获取 NFT 当前的流动性
     * @param tokenId NFT 代币 ID
     * @return liquidity 流动性数量
     */
    function getPositionLiquidity(
        uint256 tokenId
    ) public view returns (uint128 liquidity) {
        (, , , , , , , liquidity, , , , ) = positionManager.positions(tokenId);
        return liquidity;
    }

    /**
     * @notice 获取 NFT 当前的授权操作者
     * @dev 直接从 Position Manager 读取，实时同步
     * @param tokenId NFT 代币 ID
     * @return operator 授权操作者地址
     */
    function getStakeOperator(
        uint256 tokenId
    ) external view returns (address operator) {
        if (lpNftStakes[tokenId].owner == address(0)) {
            revert TokenNotStaked();
        }
        (, operator, , , , , , , , , , ) = positionManager.positions(tokenId);
        return operator;
    }

    /**
     * @notice 获取池配置
     */
    function getPoolConfig() public view returns (LpPool memory) {
        return poolInfo.poolConfig;
    }
    /**
     *   @notice 获取池信息
     */
    function getPoolInfo() public view returns (LpPoolInfo memory) {
        return poolInfo;
    }

    /**
     * @notice 检查地址是否有权限操作NFT
     * @param tokenId NFT ID
     * @param operator 操作者地址
     */

    function _isAuthorized(
        uint256 tokenId,
        address operator
    ) internal view returns (bool) {
        LpNftStakeInfo memory stakeInfo = lpNftStakes[tokenId];
        if (stakeInfo.owner == operator) return true;

        // 从 Position Manager 获取当前的 operator
        (, address positionOperator, , , , , , , , , , ) = positionManager
            .positions(tokenId);
        return positionOperator == operator;
    }
}
