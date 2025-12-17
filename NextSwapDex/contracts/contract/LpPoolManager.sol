// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../types/NextswapStructs.sol";
import "../errors/NextswapErrors.sol";
import "./LpPoolContract.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "../modifiers/NextswapModifiers.sol";
import "../events/NextswapEvents.sol";
import "../contract/token_distribution/LiquidityMiningReward.sol";

contract LpPoolManager is AccessControl, NextswapModifiers {
    // 池子信息列表
    LpPool[] public lpPools;
    // 所有活跃池子的总分配点数
    uint256 public totalAllocPoint;

    // LP NFT 头寸管理器合约地址
    address public immutable positionManager;

    // 流动性挖矿奖励合约地址
    LiquidityMiningReward public immutable liquidityMiningRewardContract;

    // 通过池键快速查找池: keccak256(tokenA, tokenB, fee) => pool address
    mapping(bytes32 => uint256) private poolsIdByKey;

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

    constructor(
        address _liquidityMiningRewardContract, //
        address _positionManager
    ) nonZeroAddress(_positionManager) {
        liquidityMiningRewardContract = LiquidityMiningReward(
            _liquidityMiningRewardContract
        );
        positionManager = _positionManager;
    }

    /**
     * @notice 创建新的 LP 质押池
     * @param _pool 池配置参数
     * @return poolAddress 新创建的池合约地址
     */
    function addLpPool(LpPool memory _pool) public returns (LpPool memory) {
        // 规范化配置并检查是否已存在
        bytes32 poolKey = getPoolKey(_pool.tokenA, _pool.tokenB, _pool.fee);
        if (poolsIdByKey[poolKey] != 0) {
            revert PoolAlreadyExists();
        }

        LpPool memory lpPool = _initPool(_pool);

        // 部署新池
        LpPoolContract newPool = new LpPoolContract(
            address(this),
            positionManager,
            address(liquidityMiningRewardContract.nextSwapToken()),
            lpPool
        );

        // 保存到映射
        poolsIdByKey[poolKey] = lpPool.poolId;

        lpPool.poolAddress = address(newPool);
        lpPools.push(lpPool);
        //总分配点数
        totalAllocPoint += lpPool.allocPoint;

        emit LpPoolCreated(
            lpPool.poolId,
            address(newPool),
            lpPool.tokenA,
            lpPool.tokenB,
            lpPool.fee,
            lpPool.allocPoint
        );

        return lpPool;
    }

    /**
     * @notice 获取池的数量
     */
    function getPoolCount() public view returns (uint256) {
        return lpPools.length;
    }

    function getLpPools() public view returns (LpPool[] memory) {
        return lpPools;
    }

    /**
     * @notice 更新池子的分配权重
     * @dev 只有管理员或时间锁可以调用
     * @param poolId 池子ID
     * @param newAllocPoint 新的分配权重
     */
    function updatePoolAllocPoint(
        uint256 poolId,
        uint256 newAllocPoint
    ) external onlyAdminOrTimelock {
        if (poolId >= lpPools.length) {
            revert PoolDoesNotExist();
        }

        LpPool storage pool = lpPools[poolId];
        uint256 oldAllocPoint = pool.allocPoint;

        // 更新总分配点数
        totalAllocPoint = totalAllocPoint - oldAllocPoint + newAllocPoint;

        // 更新池子的分配点数
        pool.allocPoint = newAllocPoint;

        emit PoolAllocPointUpdated(poolId, oldAllocPoint, newAllocPoint);
    }

    /**
     * @notice 通过代币对和费率查找池（O(1) 时间复杂度）
     * @param tokenA 代币 A 地址
     * @param tokenB 代币 B 地址
     * @param fee 费率
     * @return poolId 池id，不存在则返回 0
     */
    function findPoolId(
        address tokenA,
        address tokenB,
        uint24 fee
    ) public view returns (uint256 poolId) {
        bytes32 poolKey = getPoolKey(tokenA, tokenB, fee);
        return poolsIdByKey[poolKey];
    }

    /**
     * @notice 获取指定池子的每秒奖励
     * @dev 根据池子权重和总释放速率计算
     * @param poolId 池子ID
     * @return rewardPerSecond 该池子每秒获得的奖励代币数量
     */
    function getPoolRewardPerSecond(
        uint256 poolId
    ) public view returns (uint256 rewardPerSecond) {
        if (poolId >= lpPools.length) {
            return 0;
        }

        // 如果没有任何池子有权重，返回0避免除零错误
        if (totalAllocPoint == 0) {
            return 0;
        }

        // 获取当前总的每秒释放量
        uint256 totalRewardPerSecond = liquidityMiningRewardContract
            .getRewardPerSecond();

        // 根据权重计算该池子应得的奖励
        LpPool memory pool = lpPools[poolId];
        rewardPerSecond =
            (totalRewardPerSecond * pool.allocPoint) /
            totalAllocPoint;

        return rewardPerSecond;
    }

    /**
     * @notice 生成池的唯一标识键
     * @dev 自动处理代币地址顺序，确保 tokenA < tokenB
     * @param tokenA 代币 A 地址
     * @param tokenB 代币 B 地址
     * @param fee 费率
     * @return 池的唯一 bytes32 键
     */
    function getPoolKey(
        address tokenA,
        address tokenB,
        uint24 fee
    ) public pure returns (bytes32) {
        // 确保地址顺序
        if (tokenA > tokenB) (tokenA, tokenB) = (tokenB, tokenA);
        return keccak256(abi.encodePacked(tokenA, tokenB, fee));
    }

    // 需处理tokenA和tokenB地址的前后顺序
    function _initPool(
        LpPool memory _newlpPool
    ) internal view returns (LpPool memory) {
        // 强制设置自增的 poolId
        _newlpPool.poolId = lpPools.length;
        // 设置新的池配置逻辑
        if (_newlpPool.tokenA > _newlpPool.tokenB) {
            // 交换地址顺序
            (address temp, ) = (_newlpPool.tokenA, _newlpPool.tokenB);
            _newlpPool.tokenA = _newlpPool.tokenB;
            _newlpPool.tokenB = temp;
        }
        return _newlpPool;
    }
}
