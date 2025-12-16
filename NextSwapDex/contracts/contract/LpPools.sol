// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "../types/NextswapStructs.sol";
import "../errors/NextswapErrors.sol";
import "../modifiers/NextswapModifiers.sol";
import "../contract/swap/periphery/interfaces/INonfungiblePositionManager.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "../events/NextswapEvents.sol";

contract LpPool is AccessControl, ReentrancyGuard, NextswapModifiers {
    // LP NFT 头寸管理器合约地址
    INonfungiblePositionManager public immutable positionManager;

    // 池配置
    LpPoolConfig public poolConfig;

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

    // 检查是否是 NFT 所有者
    modifier onlyStakeOwner(uint256 tokenId) {
        require(lpNftStakes[tokenId].owner == msg.sender, "Not owner");
        _;
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
    constructor(
        address _positionManager,
        LpPoolConfig memory _initialConfig
    ) nonZeroAddress(_positionManager) {
        positionManager = INonfungiblePositionManager(_positionManager);
        poolConfig = _initialConfig;
    }

    /**
     * @notice 质押 LP NFT
     * @param tokenId NFT 代币 ID
     */
    function stakeLP(uint256 tokenId) external nonReentrant {
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
            token0 == poolConfig.tokenA && token1 == poolConfig.tokenB,
            "Token pair mismatch"
        );
        require(fee == poolConfig.fee, "Fee rate mismatch");
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

        // 添加到真实所有者的质押列表
        tokenIdToIndex[tokenId] = userStakedTokens[nftOwner].length;
        userStakedTokens[nftOwner].push(tokenId);

        emit LpStaked(nftOwner, tokenId, block.timestamp);
    }

    /**
     * @notice 请求解质押（检查冷却时间）
     * @param tokenId NFT 代币 ID
     */
    function requestUnstakeLP(
        uint256 tokenId
    ) external isAuthorizedForToken(tokenId) {
        LpNftStakeInfo memory stakeInfo = lpNftStakes[tokenId];
        if (stakeInfo.requestedUnstakeAt == 0) {
            lpNftStakes[tokenId].requestedUnstakeAt = block.timestamp;
        } else {
            revert UnstakeAlreadyRequested();
        }
    }

    /**
     * @notice 取消质押 LP NFT（所有者或授权操作者都可以调用）
     * @param tokenId NFT 代币 ID
     */
    function unstakeLP(
        uint256 tokenId
    ) external nonReentrant isAuthorizedForToken(tokenId) {
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

        // 将 NFT 返还给原始所有者
        positionManager.safeTransferFrom(address(this), nftOwner, tokenId);

        emit LpUnstaked(nftOwner, tokenId, block.timestamp);
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
    function getPoolConfig() public view returns (LpPoolConfig memory) {
        return poolConfig;
    }
}
