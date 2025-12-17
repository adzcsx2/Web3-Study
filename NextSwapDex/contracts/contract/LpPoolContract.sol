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

    // 检查是否有权限操作指定的质押NFT（所有者或授权操作者）
    modifier isAuthorizedForToken(uint256 tokenId) {
        require(_isAuthorized(tokenId, msg.sender), "Not authorized");
        _;
    }
    modifier isNFTOwner(uint256 tokenId) {
        require(
            positionManager.ownerOf(tokenId) == msg.sender,
            "Not NFT owner"
        );
        _;
    }

    // 检查是否是 NFT 所有者
    modifier onlyStakeOwner(uint256 tokenId) {
        require(lpNftStakes[tokenId].owner == msg.sender, "Not owner");
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
     *   授权者必须是 NFT 的所有者或者被授权的操作者
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
        require(lpNftStakes[tokenId].owner == address(0), "Already staked");

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
            uint128 liquidity,
            ,
            ,
            ,

        ) = positionManager.positions(tokenId);

        // 验证代币对和费率是否匹配池配置
        require(
            token0 == poolInfo.poolConfig.tokenA &&
                token1 == poolInfo.poolConfig.tokenB,
            "Token pair mismatch"
        );
        require(fee == poolInfo.poolConfig.fee, "Fee rate mismatch");
        require(liquidity > 0, "No liquidity");

        // 从 NFT 所有者转移到本合约
        // 如果 msg.sender 不是所有者，需要有授权才能成功
        positionManager.safeTransferFrom(nftOwner, address(this), tokenId);

        // 记录质押信息 - owner 是 NFT 的原始所有者
        lpNftStakes[tokenId] = LpNftStakeInfo({
            owner: nftOwner,
            tokenId: tokenId,
            liquidity: liquidity,
            stakedAt: block.timestamp,
            receivedReward: 0,
            pendingRewards: 0,
            lastClaimAt: 0,
            requestedUnstakeAt: 0
        });
        // 总流动性增加
        poolInfo.totalLiquidity += liquidity;
        // 总质押数量增加
        poolInfo.totalStaked += 1;

        // 添加到真实所有者的质押列表
        tokenIdToIndex[tokenId] = userStakedTokens[nftOwner].length;
        userStakedTokens[nftOwner].push(tokenId);

        emit LpStaked(nftOwner, tokenId, block.timestamp);
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
        isNFTOwner(tokenId)
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
        isNFTOwner(tokenId)
        whenNotPaused
        nonReentrant
    {
        LpNftStakeInfo memory stakeInfo = lpNftStakes[tokenId];
        address nftOwner = stakeInfo.owner;

        // 检查是否已请求解质押
        require(stakeInfo.requestedUnstakeAt > 0, "Unstake not requested");
        // 检查冷却时间是否已过
        require(
            block.timestamp >= stakeInfo.requestedUnstakeAt + UNSTAKE_COOLDOWN,
            "Unstake cooldown not passed"
        );

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

        // 删除质押信息
        delete lpNftStakes[tokenId];
        // 总流动性减少
        poolInfo.totalLiquidity -= stakeInfo.liquidity;
        // 总质押数量减少
        poolInfo.totalStaked -= 1;

        // 将 NFT 返还给原始所有者
        positionManager.safeTransferFrom(address(this), nftOwner, tokenId);

        emit LpUnstaked(nftOwner, tokenId, block.timestamp);
    }

    /**
     * @notice 领取质押奖励（所有者或授权操作者都可以调用）
     * @param tokenId NFT 代币 ID
     */
    function _claimRewards(uint256 tokenId) internal {
        _updateRewards(tokenId);

        LpNftStakeInfo storage stakeInfo = lpNftStakes[tokenId];

        // 先保存待领取的奖励金额
        uint256 rewardAmount = stakeInfo.pendingRewards;
        require(rewardAmount > 0, "No rewards to claim");

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
    /**
     * 计算奖励并更新质押信息
     */
    function _updateRewards(
        address user
    ) internal poolMustBeActive(poolInfo.isActive) whenNotPaused nonReentrant {
        uint256[] tokenIds = userStakedTokens[user];
        if (tokenIds.length == 0) {
            revert NoStakedTokens();
        }

        for (uint256 i = 0; i < tokenIds.length; i++) {
            LpNftStakeInfo storage stakeInfo = lpNftStakes[tokenId];
            // 计算应得奖励
            uint256 liquidity = stakeInfo.liquidity;
            uint256 accNextSwapPerShare = poolInfo.accNextSwapPerShare;
            uint256 oldPendingRewards = stakeInfo.receivedReward +
                stakeInfo.pendingRewards;
            uint256 pending = (liquidity * accNextSwapPerShare) /
                1e18 -
                oldPendingRewards;
            // 更新待领取奖励
            stakeInfo.pendingRewards += pending;
        }

        emit RewardsUpdated(stakeInfo.owner, tokenIds, block.timestamp);
    }

    /**
     * @notice 设置解质押冷却时间
     * @param _cooldown 冷却时间（秒）
     */
    function setUnstakeCooldown(
        uint256 _cooldown
    ) external onlyAdminOrTimelock {
        UNSTAKE_COOLDOWN = _cooldown;
    }

    // ------------------------------------------overrides------------------------------------------
    //
    /**
     * @notice 检查暂停权限
     * @dev 实现 PublicPausable 的抽象方法，只有管理员或时间锁角色可以暂停/恢复合约
     */
    function _checkPauser() internal view override onlyAdminOrTimelock {}
    function _checkOwner()
        internal
        view
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}

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
        require(lpNftStakes[tokenId].owner != address(0), "Token not staked");
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
