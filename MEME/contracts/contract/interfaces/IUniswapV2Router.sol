// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title IUniswapV2Router
 * @notice Uniswap V2 路由合约接口
 * @dev 该接口定义了与 Uniswap V2 去中心化交易所交互的核心功能
 * 包括添加/移除流动性、代币交换以及价格计算等功能
 */
interface IUniswapV2Router {
    /**
     * @notice 获取 Uniswap V2 工厂合约地址
     * @return factory 工厂合约地址
     */
    function factory() external pure returns (address);

    /**
     * @notice 获取 WETH（Wrapped ETH）代币合约地址
     * @return WETH 代币地址
     */
    function WETH() external pure returns (address);

    /**
     * @notice 添加 ERC20 代币流动性
     * @param tokenA 代币 A 的地址
     * @param tokenB 代币 B 的地址
     * @param amountADesired 期望添加的代币 A 数量
     * @param amountBDesired 期望添加的代币 B 数量
     * @param amountAMin 最少添加的代币 A 数量（滑点保护）
     * @param amountBMin 最少添加的代币 B 数量（滑点保护）
     * @param to 接收流动性代币（LP Token）的地址
     * @param deadline 交易截止时间戳
     * @return amountA 实际添加的代币 A 数量
     * @return amountB 实际添加的代币 B 数量
     * @return liquidity 获得的流动性代币数量
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);

    /**
     * @notice 添加 ETH 和 ERC20 代币的流动性
     * @param token ERC20 代币地址
     * @param amountTokenDesired 期望添加的代币数量
     * @param amountTokenMin 最少添加的代币数量（滑点保护）
     * @param amountETHMin 最少添加的 ETH 数量（滑点保护）
     * @param to 接收流动性代币（LP Token）的地址
     * @param deadline 交易截止时间戳
     * @return amountToken 实际添加的代币数量
     * @return amountETH 实际添加的 ETH 数量
     * @return liquidity 获得的流动性代币数量
     */
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    )
        external
        payable
        returns (uint amountToken, uint amountETH, uint liquidity);

    /**
     * @notice 移除流动性
     * @param tokenA 代币 A 的地址
     * @param tokenB 代币 B 的地址
     * @param liquidity 要销毁的流动性代币数量
     * @param amountAMin 最少获得的代币 A 数量（滑点保护）
     * @param amountBMin 最少获得的代币 B 数量（滑点保护）
     * @param to 接收代币的地址
     * @param deadline 交易截止时间戳
     * @return amountA 获得的代币 A 数量
     * @return amountB 获得的代币 B 数量
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);

    /**
     * @notice 用精确数量的输入代币交换尽可能多的输出代币
     * @param amountIn 输入代币的精确数量
     * @param amountOutMin 最少获得的输出代币数量（滑点保护）
     * @param path 交易路径数组（代币地址）
     * @param to 接收输出代币的地址
     * @param deadline 交易截止时间戳
     * @return amounts 交易路径中每一步的代币数量数组
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    /**
     * @notice 用精确数量的 ETH 交换尽可能多的代币
     * @dev 输入为 ETH，输出为 ERC20 代币
     * @param amountOutMin 最少获得的输出代币数量（滑点保护）
     * @param path 交易路径数组（第一个应为 WETH 地址）
     * @param to 接收输出代币的地址
     * @param deadline 交易截止时间戳
     * @return amounts 交易路径中每一步的代币数量数组
     */
    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    /**
     * @notice 用尽可能少的输入代币交换精确数量的 ETH
     * @dev 输入为 ERC20 代币，输出为 ETH
     * @param amountOut 期望获得的 ETH 精确数量
     * @param amountInMax 最多支付的输入代币数量（滑点保护）
     * @param path 交易路径数组（最后一个应为 WETH 地址）
     * @param to 接收 ETH 的地址
     * @param deadline 交易截止时间戳
     * @return amounts 交易路径中每一步的代币数量数组
     */
    function swapTokensForExactETH(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    /**
     * @notice 用精确数量的输入代币交换尽可能多的 ETH
     * @dev 输入为 ERC20 代币，输出为 ETH
     * @param amountIn 输入代币的精确数量
     * @param amountOutMin 最少获得的 ETH 数量（滑点保护）
     * @param path 交易路径数组（最后一个应为 WETH 地址）
     * @param to 接收 ETH 的地址
     * @param deadline 交易截止时间戳
     * @return amounts 交易路径中每一步的代币数量数组
     */
    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    /**
     * @notice 用尽可能少的 ETH 交换精确数量的输出代币
     * @dev 输入为 ETH，输出为 ERC20 代币
     * @param amountOut 期望获得的输出代币精确数量
     * @param path 交易路径数组（第一个应为 WETH 地址）
     * @param to 接收输出代币的地址
     * @param deadline 交易截止时间戳
     * @return amounts 交易路径中每一步的代币数量数组
     */
    function swapETHForExactTokens(
        uint256 amountOut,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    /**
     * @notice 计算给定输入数量和储备量，能获得的输出数量
     * @dev 使用恒定乘积公式计算单次交换的输出
     * @param amountIn 输入代币数量
     * @param reserveIn 输入代币的储备量
     * @param reserveOut 输出代币的储备量
     * @return amountOut 计算得出的输出代币数量
     */
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) external pure returns (uint256 amountOut);

    /**
     * @notice 计算给定输出数量和储备量，需要的输入数量
     * @dev 使用恒定乘积公式计算单次交换的输入
     * @param amountOut 期望的输出代币数量
     * @param reserveIn 输入代币的储备量
     * @param reserveOut 输出代币的储备量
     * @return amountIn 计算得出的输入代币数量
     */
    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) external pure returns (uint256 amountIn);

    /**
     * @notice 根据交易路径计算给定输入数量能获得的所有输出数量
     * @dev 按照路径顺序计算每一步的输出，返回完整数组
     * @param amountIn 输入代币数量
     * @param path 交易路径数组（代币地址）
     * @return amounts 交易路径中每一步的代币数量数组（包括输入）
     */
    function getAmountsOut(
        uint256 amountIn,
        address[] calldata path
    ) external view returns (uint256[] memory amounts);

    /**
     * @notice 根据交易路径计算获得给定输出数量需要的所有输入数量
     * @dev 按照路径逆序计算每一步的输入，返回完整数组
     * @param amountOut 期望的输出代币数量
     * @param path 交易路径数组（代币地址）
     * @return amounts 交易路径中每一步的代币数量数组（包括最终输出）
     */
    function getAmountsIn(
        uint256 amountOut,
        address[] calldata path
    ) external view returns (uint256[] memory amounts);
}
