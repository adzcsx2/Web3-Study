import { ethers } from "hardhat";
import { DeployHelper } from "../scripts/utils/DeployHelper";
import {
  getNetworkConfig,
  stringToBytes32,
  NetworkTokenAddresses,
} from "../scripts/config/network-config";

import deployment_localhost from "../deployments/localhost-deployment.json";
import deployment_sepolia from "../deployments/sepolia-deployment.json";
import { expect } from "chai";
import { ERC20, WETH9 } from "../typechain-types";
import { NonfungiblePositionManager } from "../typechain-types/contracts/contract/swap/periphery/NonfungiblePositionManager";
import { NextswapV3Factory } from "../typechain-types/contracts/contract/swap/core/NextswapV3Factory";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  priceToSqrtRatioX96,
  sortTokens,
  getSpacingFromFee,
} from "../scripts/utils/Maths";
import {
  ADDRESS_ZERO,
  encodeRouteToPath,
  encodeSqrtRatioX96,
  nearestUsableTick,
  SwapRouter,
  TickMath,
} from "@uniswap/v3-sdk";
import { Percent, Token, TradeType } from "@uniswap/sdk-core";
import { encodeV3Path } from "../scripts/utils/Maths";

import { verifyContractCode } from "./utils/VerifyUtils";
import JSBI from "jsbi";
import { Decimals, PoolFee } from "../scripts/types/Enum";
describe("Swap 合约测试", function () {
  let deployment: any;
  this.timeout(600000); // 设置超时时间为 10 分钟
  let config: NetworkTokenAddresses;
  let signer: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress,
    user3: SignerWithAddress;
  let npmAddress: string;
  let npmContract: NonfungiblePositionManager;
  let nextswapFactroy: NextswapV3Factory;

  // 定义代币（以太坊主网）
  let DAI: Token;
  let USDC: Token;
  let WETH: Token;
  let USDT: Token;
  let WBTC: Token;
  let TBTC: Token;

  //一亿token
  const oneHundredMillionTokens = "100000";

  let wethAddress: string;
  let daiAddress: string;
  let usdcAddress: string;
  let usdtAddress: string;
  let tbtcAddress: string;
  let wbtcAddress: string;

  let chainId: number;
  let signerAddress: string;

  this.beforeEach(async function () {
    [signer, user1, user2, user3] = await ethers.getSigners();
    signerAddress = await signer.getAddress();
    const network = await ethers.provider.getNetwork();
    chainId = Number(network.chainId);

    // 对于 localhost，使用 31337 作为 chainId
    const effectiveChainId = chainId === 31337 ? 31337 : chainId;

    config = getNetworkConfig(effectiveChainId);
    deployment =
      effectiveChainId === 11155111 ? deployment_sepolia : deployment_localhost;
    npmAddress = deployment.contracts.NonfungiblePositionManager.proxyAddress;

    npmContract = (await ethers.getContractAt(
      "NonfungiblePositionManager",
      npmAddress
    )) as NonfungiblePositionManager;
    nextswapFactroy = (await ethers.getContractAt(
      "NextswapV3Factory",
      deployment.contracts.NextswapV3Factory.proxyAddress
    )) as NextswapV3Factory;

    wethAddress = config.WETH9;
    daiAddress = config.DAI;
    usdcAddress = config.USDC;
    usdtAddress = config.USDT;
    tbtcAddress = config.TBTC;
    wbtcAddress = config.WBTC;

    // 使用正确的 chainId 创建 Token 对象
    const tokenChainId = chainId === 31337 ? 31337 : chainId;
    WETH = new Token(tokenChainId, wethAddress, Decimals.WETH9);
    DAI = new Token(tokenChainId, daiAddress, Decimals.DAI);
    USDC = new Token(tokenChainId, usdcAddress, Decimals.USDC);
    USDT = new Token(tokenChainId, usdtAddress, Decimals.USDT);
    WBTC = new Token(tokenChainId, wbtcAddress, Decimals.WBTC);
    TBTC = new Token(tokenChainId, tbtcAddress, Decimals.TBTC);
  });
  afterEach(async function () {
    // 跳过 pending 或 skipped 测试（可选）
    if (this.currentTest?.state !== "passed") return;

    await new Promise((resolve) => setTimeout(resolve, 1)); // 暂停 1000ms = 1秒
  });

  it("应该正确计算 USDC(6位)-DAI(18位) 1:1 价格的 sqrtPriceX96", async function () {
    // USDC 作为 token0 (6位)，DAI 作为 token1 (18位)
    // 价格 1:1 表示 1 USDC = 1 DAI（美元价值相等）
    const sqrtPriceX96 = priceToSqrtRatioX96(6, 18, 1);
    const expectedSqrtPrice = JSBI.BigInt(
      "79228162514264337593543950336000000"
    );
    console.log("计算结果:", sqrtPriceX96.toString());
    console.log("预期结果:", expectedSqrtPrice.toString());
    expect(sqrtPriceX96.toString()).to.equal(expectedSqrtPrice.toString());
  });
  it("应该显示当前账户对应相关代币的余额", async function () {
    const balance = await ethers.provider.getBalance(signer.address);
    console.log("ETH 余额:", ethers.formatEther(balance));

    await showTokenBalance("WETH", wethAddress, 18, signer.address);
    await showTokenBalance("DAI", daiAddress, 18, signer.address);
    await showTokenBalance("USDC", usdcAddress, 6, signer.address);
    await showTokenBalance("USDT", usdtAddress, 6, signer.address);
    await showTokenBalance("TBTC", tbtcAddress, 18, signer.address);
    await showTokenBalance("WBTC", wbtcAddress, 8, signer.address);
  });

  it("应该能将ETH转化为WETH", async function () {
    const ethBalanceBefore = await ethers.provider.getBalance(signer.address);
    const wethContract = (await ethers.getContractAt(
      "WETH9",
      wethAddress
    )) as WETH9;
    const wethBalanceBefore = await wethContract.balanceOf(signer.address);
    console.log("ETH初始余额:", ethers.formatEther(ethBalanceBefore));
    console.log("WETH初始余额:", ethers.formatUnits(wethBalanceBefore, 18));

    const depositAmount = ethers.parseEther("1");

    const tx = await wethContract
      .connect(signer)
      .deposit({ value: depositAmount });

    const ethBalanceAfter = await ethers.provider.getBalance(signer.address);
    const wethBalanceAfter = await wethContract.balanceOf(signer.address);
    console.log("ETH转化后余额:", ethers.formatEther(ethBalanceAfter));
    console.log("WETH转化后余额:", ethers.formatUnits(wethBalanceAfter, 18));

    expect(ethBalanceAfter).to.closeTo(ethBalanceBefore - depositAmount, 1e15); // 考虑到gas费用，允许有一定误差
    expect(wethBalanceAfter).to.equal(wethBalanceBefore + depositAmount);
  });
  it("应该能将WETH转化为ETH", async function () {
    const wethContract = (await ethers.getContractAt(
      "WETH9",
      wethAddress
    )) as WETH9;
    const wethBalanceBefore = await wethContract.balanceOf(signer.address);
    const ethBalanceBefore = await ethers.provider.getBalance(signer.address);
    console.log("WETH初始余额:", ethers.formatUnits(wethBalanceBefore, 18));
    console.log("ETH初始余额:", ethers.formatEther(ethBalanceBefore));
    const withdrawAmount = ethers.parseEther("1");

    await wethContract.connect(signer).withdraw(withdrawAmount);
    const wethBalanceAfter = await wethContract.balanceOf(signer.address);
    const ethBalanceAfter = await ethers.provider.getBalance(signer.address);
    console.log("WETH转化后余额:", ethers.formatUnits(wethBalanceAfter, 18));
    console.log("ETH转化后余额:", ethers.formatEther(ethBalanceAfter));
    expect(wethBalanceAfter).to.equal(wethBalanceBefore - withdrawAmount);
    expect(ethBalanceAfter).to.closeTo(ethBalanceBefore + withdrawAmount, 1e15); // 考虑到gas费用，允许有一定误差
  });
  it("WETH转化为ETH错误数量应该失败", async function () {
    const wethContract = (await ethers.getContractAt(
      "WETH9",
      wethAddress
    )) as WETH9;
    const wethBalanceBefore = await wethContract.balanceOf(signer.address);
    const ethBalanceBefore = await ethers.provider.getBalance(signer.address);
    console.log("WETH初始余额:", ethers.formatUnits(wethBalanceBefore, 18));
    console.log("ETH初始余额:", ethers.formatEther(ethBalanceBefore));
    const withdrawAmount = ethers.parseEther("100"); // 故意设置一个过大的数量

    //合约地址剩余的ETH余额
    const remain = await ethers.provider.getBalance(wethAddress);
    console.log("WETH合约地址剩余ETH余额:", ethers.formatEther(remain));

    console.log(
      "提取后合约ETH余额:",
      ethers.formatUnits(remain - withdrawAmount)
    );
    // 应该失败
    await expect(wethContract.connect(signer).withdraw(withdrawAmount)).to.be
      .reverted;
  });

  it("应该可以swap USDC-DAI", async function () {
    console.log("USDC地址:", usdcAddress);
    console.log("DAI地址:", daiAddress);
    //获取USDC-DAI池子地址
    const poolAddress = await nextswapFactroy.getPool(
      usdcAddress,
      daiAddress,
      PoolFee.LOW
    );
    console.log("USDC-DAI池子地址:", poolAddress);
    //获取swap路由合约
    const swapRouterAddress = deployment.contracts.SwapRouter.proxyAddress;
    console.log("Swap路由合约地址:", swapRouterAddress);

    // 单一ERC交换 交换数量 100 USDC
    // 初始余额
    const usdcBefore = await getTokenBalance(signer.address, usdcAddress, 6);
    const daiBefore = await getTokenBalance(signer.address, daiAddress, 18);

    const exchangeAmount = 1;

    const amountIn = ethers.parseUnits(exchangeAmount.toString(), 6); // 100 USDC
    //批准Swap路由合约花费USDC
    await approveERC20("USDC", usdcAddress, swapRouterAddress, amountIn);
    //执行swap
    const swapRouterContract = await ethers.getContractAt(
      "SwapRouter",
      swapRouterAddress
    );

    const params = {
      tokenIn: usdcAddress,
      tokenOut: daiAddress,
      fee: PoolFee.LOW,
      recipient: signer.address,
      deadline: Math.floor(Date.now() / 1000) + 60 * 10, // 10分钟后过期
      amountIn: amountIn,
      amountOutMinimum: 0, // 最小接受数量设为0以简化测试（实际使用中应设置合理值以防滑点）
      sqrtPriceLimitX96: 0, // 不设置价格限制
    };
    const tx = await swapRouterContract
      .connect(signer)
      .exactInputSingle(params);
    await tx.wait();
    console.log("Swap交易已提交，交易哈希:", tx.hash);
    // 交换后余额
    const usdcAfter = await getTokenBalance(signer.address, usdcAddress, 6);
    const daiAfter = await getTokenBalance(signer.address, daiAddress, 18);
    console.log("--------------------------------------------------");
    console.log("交换数量", exchangeAmount);
    console.log("USDC 交换前余额:", usdcBefore);
    console.log("USDC 交换后余额:", usdcAfter);
    console.log("DAI 交换前余额:", daiBefore);
    console.log("DAI 交换后余额:", daiAfter);

    expect(usdcAfter).to.closeTo(usdcBefore - exchangeAmount, 0.01); // 考虑到手续费，允许有一定误差
    expect(daiAfter).to.closeTo(daiBefore + exchangeAmount, 0.01); // 考虑到手续费，允许有一定误差
  });

  it("应该可以swap DAI-USDC", async function () {
    console.log("USDC地址:", usdcAddress);
    console.log("DAI地址:", daiAddress);
    //获取USDC-DAI池子地址
    const poolAddress = await nextswapFactroy.getPool(
      usdcAddress,
      daiAddress,
      PoolFee.LOW
    );
    console.log("USDC-DAI池子地址:", poolAddress);
    //获取swap路由合约
    const swapRouterAddress = deployment.contracts.SwapRouter.proxyAddress;
    console.log("Swap路由合约地址:", swapRouterAddress);

    // 单一ERC交换 交换数量 100 USDC
    // 初始余额
    const usdcBefore = await getTokenBalance(signer.address, usdcAddress, 6);
    const daiBefore = await getTokenBalance(signer.address, daiAddress, 18);

    const exchangeAmount = 1;

    const amountIn = ethers.parseUnits(exchangeAmount.toString(), 18); // 1 DAI
    //批准Swap路由合约花费DAI
    await approveERC20("DAI", daiAddress, swapRouterAddress, amountIn);
    //执行swap
    const swapRouterContract = await ethers.getContractAt(
      "SwapRouter",
      swapRouterAddress
    );

    const params = {
      tokenIn: daiAddress,
      tokenOut: usdcAddress,
      fee: PoolFee.LOW,
      recipient: signer.address,
      deadline: Math.floor(Date.now() / 1000) + 60 * 10, // 10分钟后过期
      amountIn: amountIn,
      amountOutMinimum: 0, // 最小接受数量设为0以简化测试（实际使用中应设置合理值以防滑点）
      sqrtPriceLimitX96: 0, // 不设置价格限制
    };
    const tx = await swapRouterContract
      .connect(signer)
      .exactInputSingle(params);
    await tx.wait();
    console.log("Swap交易已提交，交易哈希:", tx.hash);
    // 交换后余额
    const usdcAfter = await getTokenBalance(signer.address, usdcAddress, 6);
    const daiAfter = await getTokenBalance(signer.address, daiAddress, 18);
    console.log("--------------------------------------------------");
    console.log("交换数量", exchangeAmount);
    console.log("USDC 交换前余额:", usdcBefore);
    console.log("USDC 交换后余额:", usdcAfter);
    console.log("DAI 交换前余额:", daiBefore);
    console.log("DAI 交换后余额:", daiAfter);

    expect(usdcAfter).to.closeTo(usdcBefore + exchangeAmount, 0.01); // 考虑到手续费，允许有一定误差
    expect(daiAfter).to.closeTo(daiBefore - exchangeAmount, 0.01); // 考虑到手续费，允许有一定误差
  });

  it.only("应该可以执行多跳交换 USDC-DAI-USDT", async function () {
    console.log("USDC地址:", usdcAddress);
    console.log("DAI地址:", daiAddress);
    console.log("USDT地址:", usdtAddress);

    // 获取swap路由合约
    const swapRouterAddress = deployment.contracts.SwapRouter.proxyAddress;
    console.log("Swap路由合约地址:", swapRouterAddress);

    // 记录初始余额
    const usdcBefore = await getTokenBalance(
      signer.address,
      usdcAddress,
      Decimals.USDC
    );
    const daiBefore = await getTokenBalance(
      signer.address,
      daiAddress,
      Decimals.DAI
    );
    const usdtBefore = await getTokenBalance(
      signer.address,
      usdtAddress,
      Decimals.USDT
    );

    // 设置交换数量：1 USDC（降低测试数量）
    const exchangeAmount = 1;
    const amountIn = ethers.parseUnits(
      exchangeAmount.toString(),
      Decimals.USDC
    ); // 1 USDC

    // 批准Swap路由合约花费USDC
    await approveERC20("USDC", usdcAddress, swapRouterAddress, amountIn);

    // 获取SwapRouter合约实例
    const swapRouterContract = await ethers.getContractAt(
      "SwapRouter",
      swapRouterAddress
    );

    console.log("开始执行多跳交换...");
    console.log("输入:", exchangeAmount, "USDC");
    console.log("期望路径: USDC -> DAI -> USDT");

    // 使用 encodeV3Path 编码多跳路径：USDC -> DAI -> USDT
    const path = encodeV3Path(
      [usdcAddress, daiAddress, usdtAddress],
      [PoolFee.LOW, PoolFee.LOW]
    );

    console.log("编码的路径:", path);

    const multiHopParams = {
      path: path,
      recipient: signer.address,
      deadline: Math.floor(Date.now() / 1000) + 60 * 10, // 10分钟后过期
      amountIn: amountIn,
      amountOutMinimum: 0, // 最小接受数量设为0以简化测试（实际使用中应设置合理值以防滑点）
    };

    // 执行多跳交换
    const tx = await swapRouterContract
      .connect(signer)
      .exactInput(multiHopParams);
    await tx.wait();
    console.log("多跳交换交易已提交，交易哈希:", tx.hash);

    // 记录交换后余额
    const usdcAfter = await getTokenBalance(
      signer.address,
      usdcAddress,
      Decimals.USDC
    );
    const daiAfter = await getTokenBalance(
      signer.address,
      daiAddress,
      Decimals.DAI
    );
    const usdtAfter = await getTokenBalance(
      signer.address,
      usdtAddress,
      Decimals.USDT
    );

    console.log("\n=== 交换结果 ===");
    console.log("USDC 交换前余额:", usdcBefore);
    console.log("USDC 交换后余额:", usdcAfter);
    console.log("USDC 消耗:", (usdcBefore - usdcAfter).toFixed(6));

    console.log("\nDAI 交换前余额:", daiBefore);
    console.log("DAI 交换后余额:", daiAfter);
    console.log("DAI 变化:", (daiAfter - daiBefore).toFixed(6));

    console.log("\nUSDT 交换前余额:", usdtBefore);
    console.log("USDT 交换后余额:", usdtAfter);
    console.log("USDT 获得:", (usdtAfter - usdtBefore).toFixed(6));

    // 验证交换结果
    expect(usdcAfter).to.be.lessThan(usdcBefore); // USDC应该减少
    expect(usdtAfter).to.be.greaterThan(usdtBefore); // USDT应该增加
    expect(usdcAfter).to.closeTo(usdcBefore - exchangeAmount, 1); // 允许1 USDC误差
    // DAI余额应该基本不变（只是中间代币）
    expect(daiAfter).to.closeTo(daiBefore, 1);
  });

  //------------------------------------------- functions -------------------------------------------------
  // 显示ERC20代币余额
  async function showTokenBalance(
    tokenName: string,
    tokenAddress: string,
    decimals: number,
    owner: string
  ) {
    const balance = await getTokenBalance(owner, tokenAddress, decimals);
    console.log(tokenName, "余额:", balance);
  }

  async function getTokenBalance(
    owner: string,
    tokenAddress: string,
    decimals: number
  ): Promise<number> {
    const erc20Contract = (await ethers.getContractAt(
      "ERC20",
      tokenAddress
    )) as ERC20;
    const balance = await erc20Contract.balanceOf(owner);
    return Number(ethers.formatUnits(balance, decimals));
  }

  //批准ERC20代币
  async function approveERC20(
    tokenName: string,
    tokenAddress: string,
    spender: string,
    amount: bigint
  ) {
    const erc20Contract = (await ethers.getContractAt(
      "ERC20",
      tokenAddress
    )) as ERC20;
    const tx = await erc20Contract.connect(signer).approve(spender, amount);
    await tx.wait();
    console.log(
      `${tokenName} 已批准 ${spender} 花费 ${ethers.formatUnits(amount)}`
    );
  }
  //构建简单的params
  function buildParams(
    tokenIn: string,
    tokenOut: string,
    fee: PoolFee,
    amountIn: bigint
  ) {
    return {
      tokenIn: tokenIn,
      tokenOut: tokenOut,
      fee: fee,
      recipient: signer.address,
      deadline: Math.floor(Date.now() / 1000) + 60 * 10, // 10分钟后过期
      amountIn: amountIn,
      amountOutMinimum: 0, // 最小接受数量设为0以简化测试（实际使用中应设置合理值以防滑点）
      sqrtPriceLimitX96: 0, // 不设置价格限制
    };
  }
});
