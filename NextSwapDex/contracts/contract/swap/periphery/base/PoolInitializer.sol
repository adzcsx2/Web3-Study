// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.20;

import "../../core/interfaces/INextswapV3Factory.sol";
import "../../core/interfaces/INextswapV3Pool.sol";

import "./PeripheryImmutableState.sol";
import "../interfaces/IPoolInitializer.sol";

/// @title Creates and initializes V3 Pools
abstract contract PoolInitializer is IPoolInitializer, PeripheryImmutableState {
    /// @inheritdoc IPoolInitializer
    function createAndInitializePoolIfNecessary(
        address token0,
        address token1,
        uint24 fee,
        uint160 sqrtPriceX96
    ) external payable override returns (address pool) {
        require(token0 < token1);
        pool = INextswapV3Factory(factory).getPool(token0, token1, fee);

        if (pool == address(0)) {
            pool = INextswapV3Factory(factory).createPool(token0, token1, fee);
            INextswapV3Pool(pool).initialize(sqrtPriceX96);
        } else {
            (uint160 sqrtPriceX96Existing, , , , , , ) = INextswapV3Pool(pool)
                .slot0();
            if (sqrtPriceX96Existing == 0) {
                INextswapV3Pool(pool).initialize(sqrtPriceX96);
            }
        }
    }
}
