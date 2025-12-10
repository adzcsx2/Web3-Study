// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.12 <0.9.0;

import {IERC20Minimal} from "../interfaces/IERC20Minimal.sol";

import {
    INextswapV3SwapCallback
} from "../interfaces/callback/INextswapV3SwapCallback.sol";
import {INextswapV3Pool} from "../interfaces/INextswapV3Pool.sol";

contract TestNextswapV3SwapPay is INextswapV3SwapCallback {
    function swap(
        address pool,
        address recipient,
        bool zeroForOne,
        uint160 sqrtPriceX96,
        int256 amountSpecified,
        uint256 pay0,
        uint256 pay1
    ) external {
        INextswapV3Pool(pool).swap(
            recipient,
            zeroForOne,
            amountSpecified,
            sqrtPriceX96,
            abi.encode(msg.sender, pay0, pay1)
        );
    }

    function nextswapV3SwapCallback(
        int256,
        int256,
        bytes calldata data
    ) external override {
        (address sender, uint256 pay0, uint256 pay1) = abi.decode(
            data,
            (address, uint256, uint256)
        );

        if (pay0 > 0) {
            IERC20Minimal(INextswapV3Pool(msg.sender).token0()).transferFrom(
                sender,
                msg.sender,
                uint256(pay0)
            );
        } else if (pay1 > 0) {
            IERC20Minimal(INextswapV3Pool(msg.sender).token1()).transferFrom(
                sender,
                msg.sender,
                uint256(pay1)
            );
        }
    }
}
