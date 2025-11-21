// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IUniswapV2Factory
 * @notice Uniswap V2 工厂合约接口
 * @dev 用于创建和管理交易对
 */
interface IUniswapV2Factory {
    /**
     * @notice 获取指定代币对的交易对地址
     * @param tokenA 代币 A 地址
     * @param tokenB 代币 B 地址
     * @return pair 交易对合约地址
     */
    function getPair(
        address tokenA,
        address tokenB
    ) external view returns (address pair);

    /**
     * @notice 创建新的交易对
     * @param tokenA 代币 A 地址
     * @param tokenB 代币 B 地址
     * @return pair 新创建的交易对地址
     */
    function createPair(
        address tokenA,
        address tokenB
    ) external returns (address pair);
}
