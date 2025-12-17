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
        require(poolsIdByKey[poolKey] == 0, "Pool already exists");

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
