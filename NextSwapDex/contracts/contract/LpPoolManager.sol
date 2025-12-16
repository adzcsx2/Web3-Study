// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../types/NextswapStructs.sol";
import "./LpPools.sol";

import "../modifiers/NextswapModifiers.sol";
import "../events/NextswapEvents.sol";

contract LpPoolManager is NextswapModifiers {
    LpPool[] public lpPools;

    // LP NFT 头寸管理器合约地址
    address public immutable positionManager;

    // 通过池键快速查找池: keccak256(tokenA, tokenB, fee) => pool address
    mapping(bytes32 => address) private poolsByKey;

    constructor(address _positionManager) nonZeroAddress(_positionManager) {
        positionManager = _positionManager;
    }

    /**
     * @notice 创建新的 LP 质押池
     * @param _poolConfig 池配置参数
     * @return poolAddress 新创建的池合约地址
     */
    function addLpPool(
        LpPoolConfig memory _poolConfig
    ) public returns (address poolAddress) {
        // 规范化配置并检查是否已存在
        LpPoolConfig memory config = initPoolConfig(_poolConfig);
        bytes32 poolKey = getPoolKey(config.tokenA, config.tokenB, config.fee);

        require(poolsByKey[poolKey] == address(0), "Pool already exists");

        // 部署新池
        LpPool newPool = new LpPool(positionManager, config);
        lpPools.push(newPool);

        // 保存到映射
        poolsByKey[poolKey] = address(newPool);

        emit LpPoolCreated(
            address(newPool),
            config.tokenA,
            config.tokenB,
            config.fee,
            config.allocPoint
        );

        return address(newPool);
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
     * @return poolAddress 池地址，不存在则返回 address(0)
     */
    function findPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) public view returns (address poolAddress) {
        bytes32 poolKey = getPoolKey(tokenA, tokenB, fee);
        return poolsByKey[poolKey];
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
    function initPoolConfig(
        LpPoolConfig memory _newConfig
    ) internal pure returns (LpPoolConfig memory) {
        // 设置新的池配置逻辑
        if (_newConfig.tokenA > _newConfig.tokenB) {
            // 交换地址顺序
            (address temp, ) = (_newConfig.tokenA, _newConfig.tokenB);
            _newConfig.tokenA = _newConfig.tokenB;
            _newConfig.tokenB = temp;
        }
        return _newConfig;
    }
}
