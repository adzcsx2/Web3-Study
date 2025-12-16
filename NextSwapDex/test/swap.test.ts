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
import { encodeV3Path } from "../scripts/utils/SwapUtils";

import { verifyContractCode } from "./utils/VerifyUtils";
import JSBI from "jsbi";
import { Decimals, PoolFee } from "../scripts/types/Enum";
import { SwapUtils } from "../scripts/utils/SwapUtils";
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

  let factoryAddress: string;
  let quoterAddress: string;
  let swapRouterAddress: string;

  let chainId: number;
  let signerAddress: string;

  const keepDecimals = 6;

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

    factoryAddress = deployment.contracts.NextswapV3Factory.proxyAddress;
    quoterAddress = deployment.contracts.QuoterV2.proxyAddress;
    swapRouterAddress = deployment.contracts.SwapRouter.proxyAddress;

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

  it("应该可以执行多跳交换 USDC-DAI-USDT", async function () {
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
    console.log("USDC 消耗:", (usdcBefore - usdcAfter).toFixed(keepDecimals));

    console.log("\nDAI 交换前余额:", daiBefore);
    console.log("DAI 交换后余额:", daiAfter);
    console.log("DAI 变化:", (daiAfter - daiBefore).toFixed(keepDecimals));

    console.log("\nUSDT 交换前余额:", usdtBefore);
    console.log("USDT 交换后余额:", usdtAfter);
    console.log("USDT 获得:", (usdtAfter - usdtBefore).toFixed(keepDecimals));

    // 验证交换结果
    expect(usdcAfter).to.be.lessThan(usdcBefore); // USDC应该减少
    expect(usdtAfter).to.be.greaterThan(usdtBefore); // USDT应该增加
    expect(usdcAfter).to.closeTo(usdcBefore - exchangeAmount, 1); // 允许1 USDC误差
    // DAI余额应该基本不变（只是中间代币）
    expect(daiAfter).to.closeTo(daiBefore, 1);
  });
  it("应该可以用SwapRouter执行多跳交换 USDC-USDT", async function () {
    // 使用简化版本的路径查找器（推荐，不依赖外部库，避免兼容性问题）
    const { SwapUtils: SwapUtils } = await import("../scripts/utils/SwapUtils");

    console.log("\n=== 使用智能路径查找器 ===");
    console.log("输入代币: USDC -", usdcAddress);
    console.log("输出代币: USDT -", usdtAddress);

    // 创建路径查找器实例
    const pathFinder = new SwapUtils(
      deployment.contracts.NextswapV3Factory.proxyAddress,
      deployment.contracts.QuoterV2.proxyAddress, // 使用 QuoterV2
      [wethAddress, daiAddress] // 中间代币
    );

    // 设置交换数量
    const exchangeAmount = 10;
    const amountIn = ethers.parseUnits(
      exchangeAmount.toString(),
      Decimals.USDC
    );

    console.log("\n输入数量:", exchangeAmount, "USDC");
    console.log("查找最优路径...\n");

    try {
      // 查找最优路径
      const pathInfo = await pathFinder.findBestPath(
        usdcAddress,
        usdtAddress,
        amountIn
      );

      console.log("\n=== 选定的最优路径 ===");
      console.log("完整路径:", pathFinder.formatPath(pathInfo));
      console.log("跳数:", pathInfo.hops);
      console.log(
        "预期输出:",
        ethers.formatUnits(pathInfo.expectedOutput, Decimals.USDT),
        "USDT"
      );

      // 记录初始余额
      const usdcBefore = await getTokenBalance(
        signer.address,
        usdcAddress,
        Decimals.USDC
      );
      const usdtBefore = await getTokenBalance(
        signer.address,
        usdtAddress,
        Decimals.USDT
      );

      console.log("\n=== 执行交换 ===");
      console.log("USDC 交换前余额:", usdcBefore);
      console.log("USDT 交换前余额:", usdtBefore);

      // 批准代币
      const swapRouterAddress = deployment.contracts.SwapRouter.proxyAddress;
      await approveERC20("USDC", usdcAddress, swapRouterAddress, amountIn);

      // 编码路径
      const encodedPath = encodeV3Path(pathInfo.tokensAddress, pathInfo.fees);
      console.log("编码路径:", encodedPath);

      // 执行交换
      const swapRouterContract = await ethers.getContractAt(
        "SwapRouter",
        swapRouterAddress
      );

      // 计算最小输出（考虑 0.5% 滑点）
      const minAmountOut = (pathInfo.expectedOutput * 995n) / 1000n;

      const params = {
        path: encodedPath,
        recipient: signer.address,
        deadline: Math.floor(Date.now() / 1000) + 60 * 20,
        amountIn: amountIn,
        amountOutMinimum: minAmountOut,
      };

      const tx = await swapRouterContract.connect(signer).exactInput(params);
      const receipt = await tx.wait();
      console.log("交易哈希:", tx.hash);
      console.log("Gas 使用:", receipt?.gasUsed.toString());

      // 记录交换后余额
      const usdcAfter = await getTokenBalance(
        signer.address,
        usdcAddress,
        Decimals.USDC
      );
      const usdtAfter = await getTokenBalance(
        signer.address,
        usdtAddress,
        Decimals.USDT
      );

      console.log("\n=== 交换结果 ===");
      console.log(
        "USDC 消耗:",
        (usdcBefore - usdcAfter).toFixed(keepDecimals),
        "USDC"
      );
      console.log(
        "USDT 获得:",
        (usdtAfter - usdtBefore).toFixed(keepDecimals),
        "USDT"
      );
      console.log(
        "预期输出:",
        ethers.formatUnits(pathInfo.expectedOutput, Decimals.USDT),
        "USDT"
      );

      // 验证结果
      expect(usdcAfter).to.be.lessThan(usdcBefore);
      expect(usdtAfter).to.be.greaterThan(usdtBefore);
      expect(usdcAfter).to.closeTo(usdcBefore - exchangeAmount, 0.1);

      // 验证实际输出接近预期（允许 2% 误差）
      const actualOutput = usdtAfter - usdtBefore;
      const expectedOutput = Number(
        ethers.formatUnits(pathInfo.expectedOutput, Decimals.USDT)
      );
      const deviation =
        Math.abs(actualOutput - expectedOutput) / expectedOutput;

      console.log("\n输出偏差:", (deviation * 100).toFixed(2), "%");
      expect(deviation).to.be.lessThan(0.02); // 偏差应小于 2%

      console.log("\n✅ 智能多跳交换成功!");
    } catch (error) {
      console.error("\n❌ 路由查找或交换失败:", error);
      throw error;
    }
  });

  it("应该可以用SwapUtils执行多跳交换 USDC-WBTC", async function () {
    // 使用 SwapUtils（推荐，避免 smart-order-router 的依赖冲突）
    const { SwapUtils: SwapUtils } = await import("../scripts/utils/SwapUtils");

    console.log("\n=== 使用 SwapUtils 查找最优路径 ===");
    console.log("输入代币: USDC -", usdcAddress);
    console.log("输出代币: WBTC -", wbtcAddress);

    // 创建路径查找器实例
    const pathFinder = new SwapUtils(
      deployment.contracts.NextswapV3Factory.proxyAddress,
      deployment.contracts.QuoterV2.proxyAddress, // 使用 QuoterV2 而不是 Quoter
      [wethAddress, daiAddress, usdtAddress] // 中间代币：WETH, DAI, USDT
    );

    // 设置交换数量
    const exchangeAmount = 100; // 100 USDC
    const amountIn = ethers.parseUnits(
      exchangeAmount.toString(),
      Decimals.TBTC
    );

    console.log("\n输入数量:", exchangeAmount, "USDC");
    console.log("查找最优路径...\n");

    try {
      // 查找最优路径
      const pathInfo = await pathFinder.findBestPath(
        usdcAddress,
        wbtcAddress,
        amountIn
      );

      console.log("\n=== 选定的最优路径 ===");
      console.log("完整路径:", pathFinder.formatPath(pathInfo));
      console.log("跳数:", pathInfo.hops);
      console.log(
        "预期输出:",
        ethers.formatUnits(pathInfo.expectedOutput, Decimals.WBTC),
        "WBTC"
      );

      console.log("\n=== 详细路径 ===");
      for (let i = 0; i < pathInfo.tokensAddress.length; i++) {
        console.log(`代币 ${i}:`, pathInfo.tokensAddress[i]);
        if (i < pathInfo.fees.length) {
          console.log(`  费率 ${i}:`, pathInfo.fees[i] / 10000, "%");
        }
      }

      // 记录初始余额
      const usdcBefore = await getTokenBalance(
        signer.address,
        usdcAddress,
        Decimals.USDC
      );
      const wbtcBefore = await getTokenBalance(
        signer.address,
        wbtcAddress,
        Decimals.WBTC
      );

      console.log("\n=== 执行交换 ===");
      console.log("USDC 交换前余额:", usdcBefore);
      console.log("WBTC 交换前余额:", wbtcBefore);

      // 批准代币
      const swapRouterAddress = deployment.contracts.SwapRouter.proxyAddress;
      await approveERC20("USDC", usdcAddress, swapRouterAddress, amountIn);

      // 编码路径
      const encodedPath = encodeV3Path(pathInfo.tokensAddress, pathInfo.fees);
      console.log("编码路径:", encodedPath);

      // 执行交换
      const swapRouterContract = await ethers.getContractAt(
        "SwapRouter",
        swapRouterAddress
      );

      // 计算最小输出（考虑 0.5% 滑点）
      const minAmountOut = (pathInfo.expectedOutput * 995n) / 1000n;

      const params = {
        path: encodedPath,
        recipient: signer.address,
        deadline: Math.floor(Date.now() / 1000) + 60 * 20,
        amountIn: amountIn,
        amountOutMinimum: minAmountOut,
      };

      const tx = await swapRouterContract.connect(signer).exactInput(params);
      const receipt = await tx.wait();
      console.log("交易哈希:", tx.hash);
      console.log("Gas 使用:", receipt?.gasUsed.toString());

      // 记录交换后余额
      const usdcAfter = await getTokenBalance(
        signer.address,
        usdcAddress,
        Decimals.USDC
      );
      const wbtcAfter = await getTokenBalance(
        signer.address,
        wbtcAddress,
        Decimals.WBTC
      );

      console.log("\n=== 交换结果 ===");
      console.log(
        "USDC 消耗:",
        (usdcBefore - usdcAfter).toFixed(keepDecimals),
        "USDC"
      );
      console.log(
        "WBTC 获得:",
        (wbtcAfter - wbtcBefore).toFixed(keepDecimals),
        "WBTC"
      );
      console.log(
        "预期输出:",
        ethers.formatUnits(pathInfo.expectedOutput, Decimals.WBTC),
        "WBTC"
      );

      // 验证结果
      expect(usdcAfter).to.be.lessThan(usdcBefore);
      expect(wbtcAfter).to.be.greaterThan(wbtcBefore);
      expect(usdcAfter).to.closeTo(usdcBefore - exchangeAmount, 1);

      // 验证实际输出接近预期（允许 5% 误差，因为价格可能波动）
      const actualOutput = wbtcAfter - wbtcBefore;
      const expectedOutput = Number(
        ethers.formatUnits(pathInfo.expectedOutput, Decimals.WBTC)
      );
      const deviation =
        Math.abs(actualOutput - expectedOutput) / expectedOutput;

      console.log("\n输出偏差:", (deviation * 100).toFixed(2), "%");
      expect(deviation).to.be.lessThan(0.05); // 偏差应小于 5%

      console.log("\n✅ SwapUtils 智能多跳交换成功!");
    } catch (error) {
      console.error("\n❌ SwapUtils 路由查找或交换失败:", error);
      throw error;
    }
  });
  it("应该可以用SwapUtils执行多跳交换 TBTC-WBTC", async function () {
    // 使用 SwapUtils（推荐，避免 smart-order-router 的依赖冲突）
    const { SwapUtils: SwapUtils } = await import("../scripts/utils/SwapUtils");

    console.log("\n=== 使用 SwapUtils 查找最优路径 ===");
    console.log("输入代币: TBTC -", usdcAddress);
    console.log("输出代币: WBTC -", wbtcAddress);

    // 创建路径查找器实例
    const pathFinder = new SwapUtils(
      deployment.contracts.NextswapV3Factory.proxyAddress,
      deployment.contracts.QuoterV2.proxyAddress, // 使用 QuoterV2 而不是 Quoter
      [wethAddress, daiAddress, usdtAddress, usdcAddress] // 中间代币：WETH, DAI, USDT
    );

    // 设置交换数量
    const exchangeAmount = 100; // 100 TBTC
    const amountIn = ethers.parseUnits(
      exchangeAmount.toString(),
      Decimals.TBTC
    );

    console.log("\n输入数量:", exchangeAmount, "TBTC");
    console.log("查找最优路径...\n");

    try {
      // 查找最优路径
      const pathInfo = await pathFinder.findBestPath(
        tbtcAddress,
        wbtcAddress,
        amountIn
      );

      console.log("\n=== 详细路径 ===");
      for (let i = 0; i < pathInfo.tokensAddress.length; i++) {
        console.log(`代币 ${i}:`, pathInfo.tokensAddress[i]);
        if (i < pathInfo.fees.length) {
          console.log(`  费率 ${i}:`, pathInfo.fees[i] / 10000, "%");
        }
      }

      // 记录初始余额
      const tbtcBefore = await getTokenBalance(
        signer.address,
        tbtcAddress,
        Decimals.TBTC
      );
      const wbtcBefore = await getTokenBalance(
        signer.address,
        wbtcAddress,
        Decimals.WBTC
      );

      console.log("\n=== 执行交换 ===");
      console.log("TBTC 交换前余额:", tbtcBefore);
      console.log("WBTC 交换前余额:", wbtcBefore);

      // 批准代币
      const swapRouterAddress = deployment.contracts.SwapRouter.proxyAddress;
      await approveERC20("TBTC", tbtcAddress, swapRouterAddress, amountIn);

      // 编码路径
      const encodedPath = encodeV3Path(pathInfo.tokensAddress, pathInfo.fees);
      console.log("编码路径:", encodedPath);

      // 执行交换
      const swapRouterContract = await ethers.getContractAt(
        "SwapRouter",
        swapRouterAddress
      );

      // 计算最小输出（考虑 0.5% 滑点）
      const minAmountOut = (pathInfo.expectedOutput * 995n) / 1000n;

      const params = {
        path: encodedPath,
        recipient: signer.address,
        deadline: Math.floor(Date.now() / 1000) + 60 * 20,
        amountIn: amountIn,
        amountOutMinimum: minAmountOut,
      };

      const tx = await swapRouterContract.connect(signer).exactInput(params);
      const receipt = await tx.wait();
      console.log("交易哈希:", tx.hash);
      console.log("Gas 使用:", receipt?.gasUsed.toString());

      // 记录交换后余额
      const tbtcAfter = await getTokenBalance(
        signer.address,
        tbtcAddress,
        Decimals.TBTC
      );
      const wbtcAfter = await getTokenBalance(
        signer.address,
        wbtcAddress,
        Decimals.WBTC
      );

      console.log("\n=== 交换结果 ===");
      console.log(
        "TBTC 消耗:",
        (tbtcBefore - tbtcAfter).toFixed(keepDecimals),
        "TBTC"
      );
      console.log(
        "WBTC 获得:",
        (wbtcAfter - wbtcBefore).toFixed(keepDecimals),
        "WBTC"
      );
      console.log(
        "预期输出:",
        ethers.formatUnits(pathInfo.expectedOutput, Decimals.WBTC),
        "WBTC"
      );

      // 验证结果
      expect(tbtcAfter).to.be.lessThan(tbtcBefore);
      expect(wbtcAfter).to.be.greaterThan(wbtcBefore);
      expect(tbtcAfter).to.closeTo(tbtcBefore - exchangeAmount, 1);

      // 验证实际输出接近预期（允许 5% 误差，因为价格可能波动）
      const actualOutput = wbtcAfter - wbtcBefore;
      const expectedOutput = Number(
        ethers.formatUnits(pathInfo.expectedOutput, Decimals.WBTC)
      );
      const deviation =
        Math.abs(actualOutput - expectedOutput) / expectedOutput;

      console.log("\n输出偏差:", (deviation * 100).toFixed(2), "%");
      expect(deviation).to.be.lessThan(0.05); // 偏差应小于 5%

      console.log("\n✅ SwapUtils 智能多跳交换成功!");
    } catch (error) {
      console.error("\n❌ SwapUtils 路由查找或交换失败:", error);
      throw error;
    }
  });
  it("应该可以使用SwapUtils进行多跳交换 WTBC-TBTC", async function () {
    const swapUtils = new SwapUtils(factoryAddress, quoterAddress, [
      wethAddress,
      daiAddress,
      usdtAddress,
      usdcAddress,
    ]);
    const amountInCount = 50;
    console.log("输入代币: WBTC -", amountInCount);
    const amountIn = ethers.parseUnits("50", Decimals.WBTC); // 50 WBTC
    const pathInfo = await swapUtils.findBestPath(
      wbtcAddress,
      tbtcAddress,
      amountIn
    );
    console.log("最佳路径:", swapUtils.formatPath(pathInfo));

    await approveERC20("WBTC", wbtcAddress, swapRouterAddress, amountIn);
    const swapRouterContract = await ethers.getContractAt(
      "SwapRouter",
      swapRouterAddress
    );
    const encodedPath = encodeV3Path(pathInfo.tokensAddress, pathInfo.fees);

    const params: SwapInputParams = {
      path: encodedPath,
      recipient: signer.address,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
      amountIn: amountIn,
      amountOutMinimum: 0n,
    };

    const amountOut = await swapRouterContract
      .connect(signer)
      .exactInput.staticCall(params);
    console.log("预期输出 TBTC:", ethers.formatUnits(amountOut, Decimals.TBTC));

    const tx = await swapRouterContract.connect(signer).exactInput(params);

    const receipt = await tx.wait();
    console.log("交易哈希:", tx.hash);
    console.log("Gas 使用:", receipt?.gasUsed.toString());
  });
  it.only("应该可以直接使用ETH进行交换,ETH-USDC 直接兑换", async function () {
    //获取SwapUtils
    const swapUtils = new SwapUtils(factoryAddress, quoterAddress, [
      wethAddress,
      daiAddress,
      usdtAddress,
      usdcAddress,
    ]);

    // 获取Swap路由合约
    const swapRouterContract = await ethers.getContractAt(
      "SwapRouter",
      swapRouterAddress
    );

    // 初始余额
    const ethBefore = await ethers.provider.getBalance(signer.address);
    const usdcBefore = await getTokenBalance(
      signer.address,
      usdcAddress,
      Decimals.USDC
    );

    const amountETH = 1;

    const exchangeAmount = ethers.parseEther(amountETH.toString()); // 1 ETH

    console.log("准备交换", amountETH, "ETH为usdc");

    // 先将ETH转为WETH并批准SwapRouter合约花费WETH
    const wethContract = (await ethers.getContractAt(
      "WETH9",
      wethAddress
    )) as WETH9;
    let tx = await wethContract
      .connect(signer)
      .deposit({ value: exchangeAmount });
    let receipt = await tx.wait();

    if (receipt?.status !== 1) {
      throw new Error("WETH存入失败");
    }

    console.log("WETH存入成功，交易哈希:", tx.hash);

    receipt = await approveERC20(
      "WETH",
      wethAddress,
      swapRouterAddress,
      exchangeAmount
    );
    if (receipt?.status !== 1) {
      throw new Error("WETH授权失败");
    }
    console.log("ETH 交换前余额:", ethers.formatEther(ethBefore));
    console.log("usdc 交换前余额:", usdcBefore);

    const params = await swapUtils.toSwapInputParams(
      wethAddress,
      usdcAddress,
      signer.address,
      Math.floor(Date.now() / 1000) + 60 * 10,
      exchangeAmount,
      0n
    );
    const usdcNum = await swapRouterContract
      .connect(signer)
      .exactInput.staticCall(params);
    console.log("预期得到 usdc:", ethers.formatUnits(usdcNum, Decimals.USDC));

    tx = await swapRouterContract.connect(signer).exactInput(params);
    receipt = await tx.wait();
    console.log("Swap交易已提交，交易哈希:", tx.hash);
    if (receipt?.status !== 1) {
      throw new Error("Swap交易失败");
    } else {
      console.log("Swap交易成功");
    }

    const ethAfter = await ethers.provider.getBalance(signer.address);
    const usdcAfter = await getTokenBalance(
      signer.address,
      usdcAddress,
      Decimals.USDC
    );
    console.log("ETH 交换后余额:", ethers.formatEther(ethAfter));
    console.log("usdc 交换后余额:", usdcAfter);

    expect(ethAfter).to.closeTo(ethBefore - exchangeAmount, 1e15); // 考虑到gas费用，允许有一定误差
    expect(usdcAfter).to.be.greaterThan(usdcBefore);
  });
  it("应该可以直接使用ETH进行交换 ETH-DAI 中间1跳", async function () {
    //获取SwapUtils
    const swapUtils = new SwapUtils(factoryAddress, quoterAddress, [
      wethAddress,
      daiAddress,
      usdtAddress,
      usdcAddress,
    ]);

    // 获取Swap路由合约
    const swapRouterContract = await ethers.getContractAt(
      "SwapRouter",
      swapRouterAddress
    );

    // 初始余额
    const ethBefore = await ethers.provider.getBalance(signer.address);
    const daiBefore = await getTokenBalance(signer.address, daiAddress, 18);

    const amountETH = 1;

    const exchangeAmount = ethers.parseEther(amountETH.toString()); // 1 ETH

    console.log("准备交换", amountETH, "ETH为DAI");

    // 先将ETH转为WETH并批准SwapRouter合约花费WETH
    const wethContract = (await ethers.getContractAt(
      "WETH9",
      wethAddress
    )) as WETH9;
    let tx = await wethContract
      .connect(signer)
      .deposit({ value: exchangeAmount });
    let receipt = await tx.wait();

    if (receipt?.status !== 1) {
      throw new Error("WETH存入失败");
    }

    console.log("WETH存入成功，交易哈希:", tx.hash);

    receipt = await approveERC20(
      "WETH",
      wethAddress,
      swapRouterAddress,
      exchangeAmount
    );
    if (receipt?.status !== 1) {
      throw new Error("WETH授权失败");
    }
    console.log("ETH 交换前余额:", ethers.formatEther(ethBefore));
    console.log("DAI 交换前余额:", daiBefore);

    const params = await swapUtils.toSwapInputParams(
      wethAddress,
      daiAddress,
      signer.address,
      Math.floor(Date.now() / 1000) + 60 * 10,
      exchangeAmount,
      (exchangeAmount * 995n) / 1000n
    );
    tx = await swapRouterContract.connect(signer).exactInput(params);
    receipt = await tx.wait();
    console.log("Swap交易已提交，交易哈希:", tx.hash);
    if (receipt?.status !== 1) {
      throw new Error("Swap交易失败");
    } else {
      console.log("Swap交易成功");
    }

    const ethAfter = await ethers.provider.getBalance(signer.address);
    const daiAfter = await getTokenBalance(signer.address, daiAddress, 18);
    console.log("ETH 交换后余额:", ethers.formatEther(ethAfter));
    console.log("DAI 交换后余额:", daiAfter);

    expect(ethAfter).to.closeTo(ethBefore - exchangeAmount, 1e15); // 考虑到gas费用，允许有一定误差
    expect(daiAfter).to.be.greaterThan(daiBefore);
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
    console.log(
      `${tokenName} 已批准 ${spender} 花费 ${ethers.formatUnits(amount)}`
    );
    return await tx.wait();
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
