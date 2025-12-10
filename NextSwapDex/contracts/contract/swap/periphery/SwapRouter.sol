// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.20;
pragma abicoder v2;

import "../core/libraries/SafeCast.sol";
import "../core/libraries/TickMath.sol";
import "../core/interfaces/INextswapV3Pool.sol";

import "./interfaces/ISwapRouter.sol";
import "./base/PeripheryImmutableState.sol";
import "./base/PeripheryValidation.sol";
import "./base/PeripheryPaymentsWithFee.sol";
import "./base/Multicall.sol";
import "./base/SelfPermit.sol";
import "./libraries/Path.sol";
import "./libraries/PoolAddress.sol";
import "./libraries/CallbackValidation.sol";
import "./interfaces/external/IWETH9.sol";

/// @title Nextswap V3 交易路由
/// @notice 用于在Nextswap V3上无状态执行交换的路由合约
contract SwapRouter is
    ISwapRouter,
    PeripheryImmutableState,
    PeripheryValidation,
    PeripheryPaymentsWithFee,
    Multicall,
    SelfPermit
{
    using Path for bytes;
    using SafeCast for uint256;

    /// @dev 用作amountInCached的占位符值，因为精确输出交换的计算输入金额实际上永远不会是这个值
    uint256 private constant DEFAULT_AMOUNT_IN_CACHED = type(uint256).max;

    /// @dev 用于返回精确输出交换的计算输入金额的临时存储变量
    uint256 private amountInCached = DEFAULT_AMOUNT_IN_CACHED;

    constructor(
        address _factory,
        address _WETH9
    ) PeripheryImmutableState(_factory, _WETH9) {}

    /// @dev 返回给定代币对和手续费的池。池合约可能存在也可能不存在
    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) private view returns (INextswapV3Pool) {
        return
            INextswapV3Pool(
                PoolAddress.computeAddress(
                    factory,
                    PoolAddress.getPoolKey(tokenA, tokenB, fee)
                )
            );
    }

    struct SwapCallbackData {
        bytes path;
        address payer;
    }

    /// @inheritdoc INextswapV3SwapCallback
    /// @notice Nextswap V3交换回调函数，用于处理交换过程中的代币支付
    function nextswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata _data
    ) external override {
        require(amount0Delta > 0 || amount1Delta > 0); // 不完全支持在0流动性区域内的交换
        SwapCallbackData memory data = abi.decode(_data, (SwapCallbackData));
        (address tokenIn, address tokenOut, uint24 fee) = data
            .path
            .decodeFirstPool();
        CallbackValidation.verifyCallback(factory, tokenIn, tokenOut, fee);

        (bool isExactInput, uint256 amountToPay) = amount0Delta > 0
            ? (tokenIn < tokenOut, uint256(amount0Delta))
            : (tokenOut < tokenIn, uint256(amount1Delta));
        if (isExactInput) {
            // 精确输入交换，直接支付代币
            pay(tokenIn, data.payer, msg.sender, amountToPay);
        } else {
            // 精确输出交换，需要处理多跳情况
            if (data.path.hasMultiplePools()) {
                data.path = data.path.skipToken();
                exactOutputInternal(amountToPay, msg.sender, 0, data);
            } else {
                amountInCached = amountToPay;
                tokenIn = tokenOut; // 交换输入/输出，因为精确输出交换是反向的
                pay(tokenIn, data.payer, msg.sender, amountToPay);
            }
        }
    }

    /// @dev 执行单次精确输入交换
    /// @param amountIn 输入的代币数量
    /// @param recipient 接收者地址
    /// @param sqrtPriceLimitX96 价格限制（sqrtPriceX96格式）
    /// @param data 交换回调数据
    /// @return amountOut 输出的代币数量
    function exactInputInternal(
        uint256 amountIn,
        address recipient,
        uint160 sqrtPriceLimitX96,
        SwapCallbackData memory data
    ) private returns (uint256 amountOut) {
        // 允许交换到路由地址（地址0会被替换为this地址）
        if (recipient == address(0)) recipient = address(this);

        (address tokenIn, address tokenOut, uint24 fee) = data
            .path
            .decodeFirstPool();

        bool zeroForOne = tokenIn < tokenOut;

        (int256 amount0, int256 amount1) = getPool(tokenIn, tokenOut, fee).swap(
            recipient,
            zeroForOne,
            amountIn.toInt256(),
            sqrtPriceLimitX96 == 0
                ? (
                    zeroForOne
                        ? TickMath.MIN_SQRT_RATIO + 1
                        : TickMath.MAX_SQRT_RATIO - 1
                )
                : sqrtPriceLimitX96,
            abi.encode(data)
        );

        return uint256(-(zeroForOne ? amount1 : amount0));
    }

    /// @inheritdoc ISwapRouter
    /// @notice 执行精确输入的单一池交换
    /// @param params 交换参数，包含输入代币、输出代币、手续费、数量等
    /// @return amountOut 实际输出的代币数量
    function exactInputSingle(
        ExactInputSingleParams calldata params
    )
        external
        payable
        override
        checkDeadline(params.deadline)
        returns (uint256 amountOut)
    {
        amountOut = exactInputInternal(
            params.amountIn,
            params.recipient,
            params.sqrtPriceLimitX96,
            SwapCallbackData({
                path: abi.encodePacked(
                    params.tokenIn,
                    params.fee,
                    params.tokenOut
                ),
                payer: msg.sender
            })
        );
        require(amountOut >= params.amountOutMinimum, "Too little received");
    }

    /// @inheritdoc ISwapRouter
    /// @notice 执行精确输入的多池交换（可以跨越多个池）
    /// @param params 交换参数，包含路径、输入数量、接收者等
    /// @return amountOut 最终输出的代币数量
    function exactInput(
        ExactInputParams memory params
    )
        external
        payable
        override
        checkDeadline(params.deadline)
        returns (uint256 amountOut)
    {
        address payer = msg.sender; // msg.sender支付第一跳

        while (true) {
            bool hasMultiplePools = params.path.hasMultiplePools();

            // 前一次交换的输出成为后续交换的输入
            params.amountIn = exactInputInternal(
                params.amountIn,
                hasMultiplePools ? address(this) : params.recipient, // 对于中间交换，本合约保管资金
                0,
                SwapCallbackData({
                    path: params.path.getFirstPool(), // 只需要路径中的第一个池
                    payer: payer
                })
            );

            // 决定是继续还是终止
            if (hasMultiplePools) {
                payer = address(this); // 此时调用者已经支付
                params.path = params.path.skipToken();
            } else {
                amountOut = params.amountIn;
                break;
            }
        }

        require(amountOut >= params.amountOutMinimum, "Too little received");
    }

    /// @dev 执行单次精确输出交换
    /// @param amountOut 期望的输出代币数量
    /// @param recipient 接收者地址
    /// @param sqrtPriceLimitX96 价格限制（sqrtPriceX96格式）
    /// @param data 交换回调数据
    /// @return amountIn 实际需要的输入代币数量
    function exactOutputInternal(
        uint256 amountOut,
        address recipient,
        uint160 sqrtPriceLimitX96,
        SwapCallbackData memory data
    ) private returns (uint256 amountIn) {
        // 允许交换到路由地址（地址0会被替换为this地址）
        if (recipient == address(0)) recipient = address(this);

        (address tokenOut, address tokenIn, uint24 fee) = data
            .path
            .decodeFirstPool();

        bool zeroForOne = tokenIn < tokenOut;

        (int256 amount0Delta, int256 amount1Delta) = getPool(
            tokenIn,
            tokenOut,
            fee
        ).swap(
                recipient,
                zeroForOne,
                -amountOut.toInt256(),
                sqrtPriceLimitX96 == 0
                    ? (
                        zeroForOne
                            ? TickMath.MIN_SQRT_RATIO + 1
                            : TickMath.MAX_SQRT_RATIO - 1
                    )
                    : sqrtPriceLimitX96,
                abi.encode(data)
            );

        uint256 amountOutReceived;
        (amountIn, amountOutReceived) = zeroForOne
            ? (uint256(amount0Delta), uint256(-amount1Delta))
            : (uint256(amount1Delta), uint256(-amount0Delta));
        // 技术上可能不会收到完整的输出数量，
        // 所以如果没有指定价格限制，要求排除这种可能性
        if (sqrtPriceLimitX96 == 0) require(amountOutReceived == amountOut);
    }

    /// @inheritdoc ISwapRouter
    /// @notice 执行精确输出的单一池交换
    /// @param params 交换参数，包含输出代币、输入代币、手续费、数量等
    /// @return amountIn 实际需要的输入代币数量
    function exactOutputSingle(
        ExactOutputSingleParams calldata params
    )
        external
        payable
        override
        checkDeadline(params.deadline)
        returns (uint256 amountIn)
    {
        // 使用交换返回数据避免SLOAD
        amountIn = exactOutputInternal(
            params.amountOut,
            params.recipient,
            params.sqrtPriceLimitX96,
            SwapCallbackData({
                path: abi.encodePacked(
                    params.tokenOut,
                    params.fee,
                    params.tokenIn
                ),
                payer: msg.sender
            })
        );

        require(amountIn <= params.amountInMaximum, "Too much requested");
        // 即使在单跳情况下不使用，也必须重置
        amountInCached = DEFAULT_AMOUNT_IN_CACHED;
    }

    /// @inheritdoc ISwapRouter
    /// @notice 执行精确输出的多池交换（可以跨越多个池）
    /// @param params 交换参数，包含路径、输出数量、接收者等
    /// @return amountIn 最终需要的输入代币数量
    function exactOutput(
        ExactOutputParams calldata params
    )
        external
        payable
        override
        checkDeadline(params.deadline)
        returns (uint256 amountIn)
    {
        // 这里付款人固定为msg.sender是可以的，因为他们只为"最终"的精确输出交换付费，
        // 这个交换首先发生，后续交换在嵌套的回调框架内支付
        exactOutputInternal(
            params.amountOut,
            params.recipient,
            0,
            SwapCallbackData({path: params.path, payer: msg.sender})
        );

        amountIn = amountInCached;
        require(amountIn <= params.amountInMaximum, "Too much requested");
        amountInCached = DEFAULT_AMOUNT_IN_CACHED;
    }
}
