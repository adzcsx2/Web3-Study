// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.12 <0.9.0;

import {
    INextswapV3PoolDeployer
} from "./interfaces/INextswapV3PoolDeployer.sol";

import {NextswapV3Pool} from "./NextswapV3Pool.sol";

contract NextswapV3PoolDeployer is INextswapV3PoolDeployer {
    struct Parameters {
        address factory;
        address token0;
        address token1;
        uint24 fee;
        int24 tickSpacing;
    }

    /// @inheritdoc INextswapV3PoolDeployer
    Parameters public override parameters;

    /// @dev Deploys a pool with the given parameters by transiently setting the parameters storage slot and then
    /// clearing it after deploying the pool.
    /// @param factory The contract address of the Nextswap V3 factory
    /// @param token0 The first token of the pool by address sort order
    /// @param token1 The second token of the pool by address sort order
    /// @param fee The fee collected upon every swap in the pool, denominated in hundredths of a bip
    /// @param tickSpacing The spacing between usable ticks
    function deploy(
        address factory,
        address token0,
        address token1,
        uint24 fee,
        int24 tickSpacing
    ) internal returns (address pool) {
        parameters = Parameters({
            factory: factory,
            token0: token0,
            token1: token1,
            fee: fee,
            tickSpacing: tickSpacing
        });
        pool = address(
            new NextswapV3Pool{
                salt: keccak256(abi.encode(token0, token1, fee))
            }()
        );
        delete parameters;
    }
}
