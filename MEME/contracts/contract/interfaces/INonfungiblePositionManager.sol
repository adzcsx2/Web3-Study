// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title INonfungiblePositionManager
 * @notice Uniswap V3 非同质化头寸管理器接口
 * @dev 用于管理 V3 流动性头寸（以 NFT 形式表示）
 */
interface INonfungiblePositionManager {
    /**
     * @notice 铸造新的流动性头寸参数
     */
    struct MintParams {
        address token0; // 第一个代币地址
        address token1; // 第二个代币地址
        uint24 fee; // 手续费等级
        int24 tickLower; // 价格范围下限
        int24 tickUpper; // 价格范围上限
        uint256 amount0Desired; // 期望添加的token0数量
        uint256 amount1Desired; // 期望添加的token1数量
        uint256 amount0Min; // 最小添加的token0数量
        uint256 amount1Min; // 最小添加的token1数量
        address recipient; // NFT接收者
        uint256 deadline; // 截止时间
    }

    /**
     * @notice 增加流动性参数
     */
    struct IncreaseLiquidityParams {
        uint256 tokenId; // NFT token ID
        uint256 amount0Desired; // 期望添加的token0数量
        uint256 amount1Desired; // 期望添加的token1数量
        uint256 amount0Min; // 最小添加的token0数量
        uint256 amount1Min; // 最小添加的token1数量
        uint256 deadline; // 截止时间
    }

    /**
     * @notice 减少流动性参数
     */
    struct DecreaseLiquidityParams {
        uint256 tokenId; // NFT token ID
        uint128 liquidity; // 要移除的流动性数量
        uint256 amount0Min; // 最小获得的token0数量
        uint256 amount1Min; // 最小获得的token1数量
        uint256 deadline; // 截止时间
    }

    /**
     * @notice 收取手续费参数
     */
    struct CollectParams {
        uint256 tokenId; // NFT token ID
        address recipient; // 接收者
        uint128 amount0Max; // 最大收取的token0数量
        uint128 amount1Max; // 最大收取的token1数量
    }

    /**
     * @notice 创建新的流动性头寸
     * @param params 铸造参数
     * @return tokenId NFT token ID
     * @return liquidity 添加的流动性数量
     * @return amount0 实际添加的token0数量
     * @return amount1 实际添加的token1数量
     */
    function mint(
        MintParams calldata params
    )
        external
        payable
        returns (
            uint256 tokenId,
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        );

    /**
     * @notice 增加现有头寸的流动性
     * @param params 增加流动性参数
     * @return liquidity 增加的流动性数量
     * @return amount0 实际添加的token0数量
     * @return amount1 实际添加的token1数量
     */
    function increaseLiquidity(
        IncreaseLiquidityParams calldata params
    )
        external
        payable
        returns (uint128 liquidity, uint256 amount0, uint256 amount1);

    /**
     * @notice 减少现有头寸的流动性
     * @param params 减少流动性参数
     * @return amount0 可收取的token0数量
     * @return amount1 可收取的token1数量
     */
    function decreaseLiquidity(
        DecreaseLiquidityParams calldata params
    ) external payable returns (uint256 amount0, uint256 amount1);

    /**
     * @notice 收取手续费
     * @param params 收取参数
     * @return amount0 实际收取的token0数量
     * @return amount1 实际收取的token1数量
     */
    function collect(
        CollectParams calldata params
    ) external payable returns (uint256 amount0, uint256 amount1);

    /**
     * @notice 销毁NFT
     * @param tokenId NFT token ID
     */
    function burn(uint256 tokenId) external payable;

    /**
     * @notice 获取头寸信息
     * @param tokenId NFT token ID
     */
    function positions(
        uint256 tokenId
    )
        external
        view
        returns (
            uint96 nonce,
            address operator,
            address token0,
            address token1,
            uint24 fee,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        );

    /**
     * @notice 获取工厂合约地址
     */
    function factory() external view returns (address);

    /**
     * @notice 获取 WETH9 地址
     */
    function WETH9() external view returns (address);
}
