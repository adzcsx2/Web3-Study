// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IUniswapV2Router} from "../interfaces/IUniswapV2Router.sol";
import {LibDiamond} from "../libraries/LibDiamond.sol";
import {IUniswapV2Factory} from "../interfaces/IUniswapV2Factory.sol";

contract LiquidityManager {
    event PairCreated(
        address indexed pair,
        address indexed token0,
        address indexed token1
    );

    /**
     * @notice 重入保护修饰符
     * @dev 使用 Diamond Storage 中的重入锁状态
     */
    modifier nonReentrant() {
        LibDiamond.lockReentrancy();
        _;
        LibDiamond.unlockReentrancy();
    }

    function initializeLiquidity(address _uniswapV2Router) external {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        require(ds.uniswapV2Router == address(0), "Already initialized");
        ds.uniswapV2Router = _uniswapV2Router;
    }

    function getFactory() external view returns (address) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return IUniswapV2Router(ds.uniswapV2Router).factory();
    }

    function getWETH() external view returns (address) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return IUniswapV2Router(ds.uniswapV2Router).WETH();
    }

    function getUniswapV2Pair() external view returns (address) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return ds.uniswapV2Pair;
    }

    function createPair() external {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        require(ds.uniswapV2Pair == address(0), "Pair already created");
        address factoryAddress = IUniswapV2Router(ds.uniswapV2Router).factory();
        IUniswapV2Factory uniswapFactory = IUniswapV2Factory(factoryAddress);
        address weth = IUniswapV2Router(ds.uniswapV2Router).WETH();
        ds.uniswapV2Pair = uniswapFactory.createPair(address(this), weth);

        // 将 Pair 地址加入白名单
        ds.isExcludedFromFee[ds.uniswapV2Pair] = true;
        ds.isExcludedFromMaxTx[ds.uniswapV2Pair] = true;

        emit PairCreated(ds.uniswapV2Pair, address(this), weth);
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return
            IUniswapV2Router(ds.uniswapV2Router).addLiquidity(
                tokenA,
                tokenB,
                amountADesired,
                amountBDesired,
                amountAMin,
                amountBMin,
                to,
                deadline
            );
    }

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
        nonReentrant
        returns (uint amountToken, uint amountETH, uint liquidity)
    {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return
            IUniswapV2Router(ds.uniswapV2Router).addLiquidityETH{
                value: msg.value
            }(
                token,
                amountTokenDesired,
                amountTokenMin,
                amountETHMin,
                to,
                deadline
            );
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return
            IUniswapV2Router(ds.uniswapV2Router).removeLiquidity(
                tokenA,
                tokenB,
                liquidity,
                amountAMin,
                amountBMin,
                to,
                deadline
            );
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return
            IUniswapV2Router(ds.uniswapV2Router).swapExactTokensForTokens(
                amountIn,
                amountOutMin,
                path,
                to,
                deadline
            );
    }

    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable nonReentrant returns (uint[] memory amounts) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return
            IUniswapV2Router(ds.uniswapV2Router).swapExactETHForTokens{
                value: msg.value
            }(amountOutMin, path, to, deadline);
    }

    function swapTokensForExactETH(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return
            IUniswapV2Router(ds.uniswapV2Router).swapTokensForExactETH(
                amountOut,
                amountInMax,
                path,
                to,
                deadline
            );
    }

    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return
            IUniswapV2Router(ds.uniswapV2Router).swapExactTokensForETH(
                amountIn,
                amountOutMin,
                path,
                to,
                deadline
            );
    }

    function swapETHForExactTokens(
        uint amountOut,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable nonReentrant returns (uint[] memory amounts) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return
            IUniswapV2Router(ds.uniswapV2Router).swapETHForExactTokens{
                value: msg.value
            }(amountOut, path, to, deadline);
    }

    function getAmountOut(
        uint amountIn,
        uint reserveIn,
        uint reserveOut
    ) external pure returns (uint amountOut) {
        require(amountIn > 0, "Insufficient input amount");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");
        uint amountInWithFee = amountIn * 997;
        uint numerator = amountInWithFee * reserveOut;
        uint denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    function getAmountIn(
        uint amountOut,
        uint reserveIn,
        uint reserveOut
    ) external pure returns (uint amountIn) {
        require(amountOut > 0, "Insufficient output amount");
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");
        uint numerator = reserveIn * amountOut * 1000;
        uint denominator = (reserveOut - amountOut) * 997;
        amountIn = (numerator / denominator) + 1;
    }

    function getAmountsOut(
        uint amountIn,
        address[] calldata path
    ) external view returns (uint[] memory amounts) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return
            IUniswapV2Router(ds.uniswapV2Router).getAmountsOut(amountIn, path);
    }

    function getAmountsIn(
        uint amountOut,
        address[] calldata path
    ) external view returns (uint[] memory amounts) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return
            IUniswapV2Router(ds.uniswapV2Router).getAmountsIn(amountOut, path);
    }
}
