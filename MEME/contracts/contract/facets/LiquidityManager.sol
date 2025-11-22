// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ISwapRouter} from "../interfaces/ISwapRouter.sol";
import {
    INonfungiblePositionManager
} from "../interfaces/INonfungiblePositionManager.sol";
import {IUniswapV3Factory} from "../interfaces/IUniswapV3Factory.sol";
import {IUniswapV3Pool} from "../interfaces/IUniswapV3Pool.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title LiquidityManager
 * @notice Uniswap V3 流动性管理合约
 * @dev 提供 V3 流动性添加、移除和交换功能
 */
contract LiquidityManager {
    // 事件定义
    event PoolCreated(
        address indexed pool,
        address indexed token0,
        address indexed token1,
        uint24 fee
    );

    event LiquidityAdded(
        uint256 indexed tokenId,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );

    event LiquidityRemoved(
        uint256 indexed tokenId,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );

    event FeesCollected(
        uint256 indexed tokenId,
        uint256 amount0,
        uint256 amount1
    );

    /**
     * @notice 重入保护修饰符
     */
    modifier nonReentrant() {
        LibDiamond.lockReentrancy();
        _;
        LibDiamond.unlockReentrancy();
    }

    /**
     * @notice 初始化 Uniswap V3 组件
     * @param _swapRouter SwapRouter 地址
     * @param _nonfungiblePositionManager NFT Position Manager 地址
     * @param _factory V3 Factory 地址
     * @param _poolFee 默认池子手续费等级 (建议 3000 = 0.3%)
     */
    function initializeLiquidity(
        address _swapRouter,
        address _nonfungiblePositionManager,
        address _factory,
        uint24 _poolFee
    ) external {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        require(ds.swapRouter == address(0), "Already initialized");
        require(_swapRouter != address(0), "Invalid swap router");
        require(
            _nonfungiblePositionManager != address(0),
            "Invalid position manager"
        );
        require(_factory != address(0), "Invalid factory");

        ds.swapRouter = _swapRouter;
        ds.nonfungiblePositionManager = _nonfungiblePositionManager;
        ds.uniswapV3Factory = _factory;
        ds.poolFee = _poolFee;
    }

    /**
     * @notice 获取 Factory 地址
     */
    function getFactory() external view returns (address) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return ds.uniswapV3Factory;
    }

    /**
     * @notice 获取 WETH9 地址
     */
    function getWETH() external view returns (address) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return
            INonfungiblePositionManager(ds.nonfungiblePositionManager).WETH9();
    }

    /**
     * @notice 获取 V3 Pool 地址
     */
    function getUniswapV3Pool() external view returns (address) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return ds.uniswapV3Pool;
    }

    /**
     * @notice 获取池子手续费等级
     */
    function getPoolFee() external view returns (uint24) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return ds.poolFee;
    }

    /**
     * @notice 设置池子手续费等级
     * @param _poolFee 新的手续费等级 (500, 3000, 10000)
     */
    function setPoolFee(uint24 _poolFee) external {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        require(
            _poolFee == 500 || _poolFee == 3000 || _poolFee == 10000,
            "Invalid fee tier"
        );
        ds.poolFee = _poolFee;
    }

    /**
     * @notice 创建或获取 V3 Pool
     * @dev 如果池子不存在则创建，否则返回现有池子地址
     */
    function createPool() external returns (address pool) {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        address weth = INonfungiblePositionManager(
            ds.nonfungiblePositionManager
        ).WETH9();

        // 检查池子是否已存在
        pool = IUniswapV3Factory(ds.uniswapV3Factory).getPool(
            address(this),
            weth,
            ds.poolFee
        );

        if (pool == address(0)) {
            // 创建新池子
            pool = IUniswapV3Factory(ds.uniswapV3Factory).createPool(
                address(this),
                weth,
                ds.poolFee
            );
        }

        ds.uniswapV3Pool = pool;

        // 将 Pool 地址加入白名单
        ds.isExcludedFromFee[pool] = true;
        ds.isExcludedFromMaxTx[pool] = true;

        emit PoolCreated(pool, address(this), weth, ds.poolFee);
        return pool;
    }

    /**
     * @notice 添加流动性（创建新的 NFT 头寸）
     * @param token0 第一个代币地址
     * @param token1 第二个代币地址
     * @param fee 手续费等级
     * @param tickLower 价格范围下限
     * @param tickUpper 价格范围上限
     * @param amount0Desired 期望的 token0 数量
     * @param amount1Desired 期望的 token1 数量
     * @param amount0Min 最小 token0 数量
     * @param amount1Min 最小 token1 数量
     * @param recipient NFT 接收者
     * @param deadline 截止时间
     */
    function mintNewPosition(
        address token0,
        address token1,
        uint24 fee,
        int24 tickLower,
        int24 tickUpper,
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        address recipient,
        uint256 deadline
    )
        external
        payable
        nonReentrant
        returns (
            uint256 tokenId,
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        )
    {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // 获取 WETH 地址
        address weth = INonfungiblePositionManager(
            ds.nonfungiblePositionManager
        ).WETH9();

        // 处理 WETH：如果其中一个 token 是 WETH 且发送了 ETH
        if (msg.value > 0) {
            require(
                token0 == weth || token1 == weth,
                "ETH sent but neither token is WETH"
            );

            // 将 ETH 转换为 WETH
            (bool success, ) = weth.call{value: msg.value}(
                abi.encodeWithSignature("deposit()")
            );
            require(success, "WETH deposit failed");
        }

        // 如果需要从调用者转入代币
        if (token0 != weth && amount0Desired > 0) {
            require(
                IERC20(token0).transferFrom(
                    msg.sender,
                    address(this),
                    amount0Desired
                ),
                "Token0 transfer failed"
            );
        }

        if (token1 != weth && amount1Desired > 0) {
            require(
                IERC20(token1).transferFrom(
                    msg.sender,
                    address(this),
                    amount1Desired
                ),
                "Token1 transfer failed"
            );
        }

        // 授权 Position Manager
        IERC20(token0).approve(ds.nonfungiblePositionManager, amount0Desired);
        IERC20(token1).approve(ds.nonfungiblePositionManager, amount1Desired);

        INonfungiblePositionManager.MintParams
            memory params = INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: fee,
                tickLower: tickLower,
                tickUpper: tickUpper,
                amount0Desired: amount0Desired,
                amount1Desired: amount1Desired,
                amount0Min: amount0Min,
                amount1Min: amount1Min,
                recipient: recipient,
                deadline: deadline
            });

        (tokenId, liquidity, amount0, amount1) = INonfungiblePositionManager(
            ds.nonfungiblePositionManager
        ).mint(params);

        // 存储 token ID
        ds.liquidityTokenIds.push(tokenId);

        // 退还多余的代币
        if (token0 != weth && amount0Desired > amount0) {
            IERC20(token0).transfer(msg.sender, amount0Desired - amount0);
        }
        if (token1 != weth && amount1Desired > amount1) {
            IERC20(token1).transfer(msg.sender, amount1Desired - amount1);
        }

        // 退还多余的 ETH/WETH
        if (msg.value > 0) {
            uint256 wethUsed = (token0 == weth) ? amount0 : amount1;
            if (msg.value > wethUsed) {
                // 将多余的 WETH 转回 ETH 并退还
                (bool success, ) = weth.call(
                    abi.encodeWithSignature(
                        "withdraw(uint256)",
                        msg.value - wethUsed
                    )
                );
                require(success, "WETH withdraw failed");

                (success, ) = msg.sender.call{value: msg.value - wethUsed}("");
                require(success, "ETH refund failed");
            }
        }

        emit LiquidityAdded(tokenId, liquidity, amount0, amount1);
    }

    /**
     * @notice 增加现有头寸的流动性
     * @param tokenId NFT token ID
     * @param amount0Desired 期望的 token0 数量
     * @param amount1Desired 期望的 token1 数量
     * @param amount0Min 最小 token0 数量
     * @param amount1Min 最小 token1 数量
     * @param deadline 截止时间
     */
    function increaseLiquidity(
        uint256 tokenId,
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        uint256 deadline
    )
        external
        nonReentrant
        returns (uint128 liquidity, uint256 amount0, uint256 amount1)
    {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // 获取头寸信息以确定代币地址
        (
            ,
            ,
            address token0,
            address token1,
            ,
            ,
            ,
            ,
            ,
            ,
            ,

        ) = INonfungiblePositionManager(ds.nonfungiblePositionManager)
                .positions(tokenId);

        // 授权
        IERC20(token0).approve(ds.nonfungiblePositionManager, amount0Desired);
        IERC20(token1).approve(ds.nonfungiblePositionManager, amount1Desired);

        INonfungiblePositionManager.IncreaseLiquidityParams
            memory params = INonfungiblePositionManager
                .IncreaseLiquidityParams({
                    tokenId: tokenId,
                    amount0Desired: amount0Desired,
                    amount1Desired: amount1Desired,
                    amount0Min: amount0Min,
                    amount1Min: amount1Min,
                    deadline: deadline
                });

        (liquidity, amount0, amount1) = INonfungiblePositionManager(
            ds.nonfungiblePositionManager
        ).increaseLiquidity(params);

        emit LiquidityAdded(tokenId, liquidity, amount0, amount1);
    }

    /**
     * @notice 减少流动性
     * @param tokenId NFT token ID
     * @param liquidity 要移除的流动性数量
     * @param amount0Min 最小 token0 数量
     * @param amount1Min 最小 token1 数量
     * @param deadline 截止时间
     */
    function decreaseLiquidity(
        uint256 tokenId,
        uint128 liquidity,
        uint256 amount0Min,
        uint256 amount1Min,
        uint256 deadline
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        INonfungiblePositionManager.DecreaseLiquidityParams
            memory params = INonfungiblePositionManager
                .DecreaseLiquidityParams({
                    tokenId: tokenId,
                    liquidity: liquidity,
                    amount0Min: amount0Min,
                    amount1Min: amount1Min,
                    deadline: deadline
                });

        (amount0, amount1) = INonfungiblePositionManager(
            ds.nonfungiblePositionManager
        ).decreaseLiquidity(params);

        emit LiquidityRemoved(tokenId, liquidity, amount0, amount1);
    }

    /**
     * @notice 收取手续费
     * @param tokenId NFT token ID
     * @param recipient 接收者
     */
    function collectFees(
        uint256 tokenId,
        address recipient
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        INonfungiblePositionManager.CollectParams
            memory params = INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: recipient,
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            });

        (amount0, amount1) = INonfungiblePositionManager(
            ds.nonfungiblePositionManager
        ).collect(params);

        emit FeesCollected(tokenId, amount0, amount1);
    }

    /**
     * @notice 精确输入单次交换
     * @param tokenIn 输入代币
     * @param tokenOut 输出代币
     * @param fee 手续费等级
     * @param amountIn 输入数量
     * @param amountOutMinimum 最小输出数量
     * @param recipient 接收者
     * @param deadline 截止时间
     */
    function swapExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address recipient,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // 授权
        IERC20(tokenIn).approve(ds.swapRouter, amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: recipient,
                deadline: deadline,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0 // 无价格限制
            });

        amountOut = ISwapRouter(ds.swapRouter).exactInputSingle(params);
    }

    /**
     * @notice 精确输入多跳交换
     * @param path 编码的路径
     * @param amountIn 输入数量
     * @param amountOutMinimum 最小输出数量
     * @param recipient 接收者
     * @param deadline 截止时间
     */
    function swapExactInput(
        bytes memory path,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address recipient,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // 需要从 path 中提取第一个 token 进行授权
        // path 格式: token0 (20 bytes) + fee (3 bytes) + token1 (20 bytes) + ...
        address tokenIn;
        assembly {
            tokenIn := div(mload(add(path, 32)), 0x1000000000000000000000000)
        }

        IERC20(tokenIn).approve(ds.swapRouter, amountIn);

        ISwapRouter.ExactInputParams memory params = ISwapRouter
            .ExactInputParams({
                path: path,
                recipient: recipient,
                deadline: deadline,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum
            });

        amountOut = ISwapRouter(ds.swapRouter).exactInput(params);
    }

    /**
     * @notice 精确输出单次交换
     * @param tokenIn 输入代币
     * @param tokenOut 输出代币
     * @param fee 手续费等级
     * @param amountOut 输出数量
     * @param amountInMaximum 最大输入数量
     * @param recipient 接收者
     * @param deadline 截止时间
     */
    function swapExactOutputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountOut,
        uint256 amountInMaximum,
        address recipient,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountIn) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // 授权最大数量
        IERC20(tokenIn).approve(ds.swapRouter, amountInMaximum);

        ISwapRouter.ExactOutputSingleParams memory params = ISwapRouter
            .ExactOutputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: recipient,
                deadline: deadline,
                amountOut: amountOut,
                amountInMaximum: amountInMaximum,
                sqrtPriceLimitX96: 0
            });

        amountIn = ISwapRouter(ds.swapRouter).exactOutputSingle(params);
    }

    /**
     * @notice 获取所有流动性 NFT token IDs
     */
    function getLiquidityTokenIds() external view returns (uint256[] memory) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return ds.liquidityTokenIds;
    }

    /**
     * @notice 获取特定 NFT 头寸信息
     * @param tokenId NFT token ID
     */
    function getPositionInfo(
        uint256 tokenId
    )
        external
        view
        returns (
            address token0,
            address token1,
            uint24 fee,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity
        )
    {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        (
            ,
            ,
            token0,
            token1,
            fee,
            tickLower,
            tickUpper,
            liquidity,
            ,
            ,
            ,

        ) = INonfungiblePositionManager(ds.nonfungiblePositionManager)
                .positions(tokenId);
    }

    /**
     * @notice 获取池子的当前价格和tick信息
     */
    function getPoolSlot0()
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
        )
    {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        require(ds.uniswapV3Pool != address(0), "Pool not initialized");

        return IUniswapV3Pool(ds.uniswapV3Pool).slot0();
    }

    /**
     * @notice 接收 ETH
     */
    receive() external payable {}
}
