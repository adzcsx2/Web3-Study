// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.12 <0.9.0;

import {TickMath} from "../libraries/TickMath.sol";

import {
    INextswapV3SwapCallback
} from "../interfaces/callback/INextswapV3SwapCallback.sol";

import {INextswapV3Pool} from "../interfaces/INextswapV3Pool.sol";

contract TestNextswapV3ReentrantCallee is INextswapV3SwapCallback {
    string private constant expectedError = "LOK()";

    function swapToReenter(address pool) external {
        INextswapV3Pool(pool).swap(
            address(0),
            false,
            1,
            TickMath.MAX_SQRT_RATIO - 1,
            new bytes(0)
        );
    }

    function nextswapV3SwapCallback(
        int256,
        int256,
        bytes calldata
    ) external override {
        // try to reenter swap
        try
            INextswapV3Pool(msg.sender).swap(
                address(0),
                false,
                1,
                0,
                new bytes(0)
            )
        {} catch (bytes memory error) {
            require(
                keccak256(error) ==
                    keccak256(abi.encodeWithSignature(expectedError))
            );
        }
        // try to reenter mint
        try
            INextswapV3Pool(msg.sender).mint(address(0), 0, 0, 0, new bytes(0))
        {} catch (bytes memory error) {
            require(
                keccak256(error) ==
                    keccak256(abi.encodeWithSignature(expectedError))
            );
        }
        // try to reenter collect
        try
            INextswapV3Pool(msg.sender).collect(address(0), 0, 0, 0, 0)
        {} catch (bytes memory error) {
            require(
                keccak256(error) ==
                    keccak256(abi.encodeWithSignature(expectedError))
            );
        }
        // try to reenter burn
        try INextswapV3Pool(msg.sender).burn(0, 0, 0) {} catch (
            bytes memory error
        ) {
            require(
                keccak256(error) ==
                    keccak256(abi.encodeWithSignature(expectedError))
            );
        }
        // try to reenter flash
        try
            INextswapV3Pool(msg.sender).flash(address(0), 0, 0, new bytes(0))
        {} catch (bytes memory error) {
            require(
                keccak256(error) ==
                    keccak256(abi.encodeWithSignature(expectedError))
            );
        }
        // try to reenter collectProtocol
        try
            INextswapV3Pool(msg.sender).collectProtocol(address(0), 0, 0)
        {} catch (bytes memory error) {
            require(
                keccak256(error) ==
                    keccak256(abi.encodeWithSignature(expectedError))
            );
        }
        require(false, "Unable to reenter");
    }
}
