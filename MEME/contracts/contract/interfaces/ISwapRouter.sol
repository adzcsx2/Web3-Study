// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title ISwapRouter
 * @notice Uniswap V3 SwapRouter 接口
 * @dev 用于执行代币交换操作
 */
interface ISwapRouter {
    /**
     * @notice 精确输入单次交换参数
     */
    struct ExactInputSingleParams {
        address tokenIn; // 输入代币地址
        address tokenOut; // 输出代币地址
        uint24 fee; // 手续费等级
        address recipient; // 接收者
        uint256 deadline; // 截止时间
        uint256 amountIn; // 精确输入数量
        uint256 amountOutMinimum; // 最小输出数量
        uint160 sqrtPriceLimitX96; // 价格限制（0表示无限制）
    }

    /**
     * @notice 精确输出单次交换参数
     */
    struct ExactOutputSingleParams {
        address tokenIn; // 输入代币地址
        address tokenOut; // 输出代币地址
        uint24 fee; // 手续费等级
        address recipient; // 接收者
        uint256 deadline; // 截止时间
        uint256 amountOut; // 精确输出数量
        uint256 amountInMaximum; // 最大输入数量
        uint160 sqrtPriceLimitX96; // 价格限制
    }

    /**
     * @notice 精确输入多跳交换参数
     */
    struct ExactInputParams {
        bytes path; // 编码的路径（token-fee-token-fee-token...）
        address recipient; // 接收者
        uint256 deadline; // 截止时间
        uint256 amountIn; // 精确输入数量
        uint256 amountOutMinimum; // 最小输出数量
    }

    /**
     * @notice 精确输出多跳交换参数
     */
    struct ExactOutputParams {
        bytes path; // 编码的路径（逆序）
        address recipient; // 接收者
        uint256 deadline; // 截止时间
        uint256 amountOut; // 精确输出数量
        uint256 amountInMaximum; // 最大输入数量
    }

    /**
     * @notice 精确输入单次交换
     * @param params 交换参数
     * @return amountOut 实际输出数量
     */
    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut);

    /**
     * @notice 精确输入多跳交换
     * @param params 交换参数
     * @return amountOut 实际输出数量
     */
    function exactInput(
        ExactInputParams calldata params
    ) external payable returns (uint256 amountOut);

    /**
     * @notice 精确输出单次交换
     * @param params 交换参数
     * @return amountIn 实际输入数量
     */
    function exactOutputSingle(
        ExactOutputSingleParams calldata params
    ) external payable returns (uint256 amountIn);

    /**
     * @notice 精确输出多跳交换
     * @param params 交换参数
     * @return amountIn 实际输入数量
     */
    function exactOutput(
        ExactOutputParams calldata params
    ) external payable returns (uint256 amountIn);

    /**
     * @notice 将合约中的 ETH 转换为 WETH
     */
    function refundETH() external payable;

    /**
     * @notice 解包 WETH 并发送 ETH
     */
    function unwrapWETH9(
        uint256 amountMinimum,
        address recipient
    ) external payable;

    /**
     * @notice 多调用
     */
    function multicall(
        bytes[] calldata data
    ) external payable returns (bytes[] memory results);
}
