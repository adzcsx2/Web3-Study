// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IUniswapV3Pool
 * @notice Uniswap V3 池子接口
 */
interface IUniswapV3Pool {
    /**
     * @notice 获取池子的第一个代币
     */
    function token0() external view returns (address);

    /**
     * @notice 获取池子的第二个代币
     */
    function token1() external view returns (address);

    /**
     * @notice 获取池子的手续费
     */
    function fee() external view returns (uint24);

    /**
     * @notice 获取池子的tick间距
     */
    function tickSpacing() external view returns (int24);

    /**
     * @notice 获取流动性
     */
    function liquidity() external view returns (uint128);

    /**
     * @notice 获取槽位0的数据
     */
    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        );
}
