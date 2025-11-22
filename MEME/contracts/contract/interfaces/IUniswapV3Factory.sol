// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IUniswapV3Factory
 * @notice Uniswap V3 工厂合约接口
 * @dev 用于创建和管理 Uniswap V3 流动性池
 */
interface IUniswapV3Factory {
    /**
     * @notice 创建新的流动性池
     * @param tokenA 第一个代币地址
     * @param tokenB 第二个代币地址
     * @param fee 手续费等级 (500 = 0.05%, 3000 = 0.3%, 10000 = 1%)
     * @return pool 创建的池子地址
     */
    function createPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external returns (address pool);

    /**
     * @notice 获取池子地址
     * @param tokenA 第一个代币地址
     * @param tokenB 第二个代币地址
     * @param fee 手续费等级
     * @return pool 池子地址
     */
    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external view returns (address pool);

    /**
     * @notice 启用费率等级
     * @param fee 手续费等级
     * @param tickSpacing tick间距
     */
    function enableFeeAmount(uint24 fee, int24 tickSpacing) external;

    /**
     * @notice 获取费率对应的tick间距
     * @param fee 手续费等级
     * @return tickSpacing tick间距
     */
    function feeAmountTickSpacing(
        uint24 fee
    ) external view returns (int24 tickSpacing);

    /**
     * @notice 设置池子的协议费用
     */
    function setOwner(address _owner) external;

    /**
     * @notice 获取工厂合约所有者
     */
    function owner() external view returns (address);
}
