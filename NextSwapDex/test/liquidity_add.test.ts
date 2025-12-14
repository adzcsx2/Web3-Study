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
import { sign, verify } from "crypto";
import {
  priceToSqrtRatioX96,
  sortTokens,
  getSpacingFromFee,
} from "../scripts/utils/Maths";
import {
  ADDRESS_ZERO,
  encodeSqrtRatioX96,
  nearestUsableTick,
  TickMath,
} from "@uniswap/v3-sdk";
import { verifyContractCode } from "./utils/VerifyUtils";
import { get } from "http";
import JSBI from "jsbi";
import { Decimals } from "../scripts/types/Enum";

describe("Liquidity Add Test", function () {
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

  //一亿token
  const oneHundredMillionTokens = "100000";

  enum PoolFee {
    LOW = 500, // 0.05%
    MEDIUM = 3000, // 0.3%
    HIGH = 10000, // 1%
  }

  this.beforeEach(async function () {
    [signer, user1, user2, user3] = await ethers.getSigners();

    const chainId = (await ethers.provider.getNetwork()).chainId;
    config = getNetworkConfig(Number(chainId));
    deployment =
      Number(chainId) === 11155111 ? deployment_sepolia : deployment_localhost;
    npmAddress = deployment.contracts.NonfungiblePositionManager.proxyAddress;

    npmContract = (await ethers.getContractAt(
      "NonfungiblePositionManager",
      npmAddress
    )) as NonfungiblePositionManager;
    nextswapFactroy = (await ethers.getContractAt(
      "NextswapV3Factory",
      deployment.contracts.NextswapV3Factory.proxyAddress
    )) as NextswapV3Factory;
  });
  afterEach(async function () {
    // 跳过 pending 或 skipped 测试（可选）
    if (this.currentTest?.state !== "passed") return;

    await new Promise((resolve) => setTimeout(resolve, 1)); // 暂停 1000ms = 1秒
  });
  it("能获取所有代币合约吗?", async function () {
    console.log("USDC地址:", config.USDC);
    console.log("0地址:", ethers.ZeroAddress);
    expect(config.USDC).not.to.equal(ethers.ZeroAddress);
    expect(config.DAI).not.to.equal(ethers.ZeroAddress);
    expect(config.WETH9).not.to.equal(ethers.ZeroAddress);
    expect(config.USDT).not.to.equal(ethers.ZeroAddress);
    expect(config.TBTC).not.to.equal(ethers.ZeroAddress);
    expect(config.WBTC).not.to.equal(ethers.ZeroAddress);
    console.log("✅ 获取所有代币合约成功！");
  });

  it("能创建USDC-DAI池子吗？", async function () {
    await createPool(config.USDC, config.DAI, PoolFee.LOW);
  });
  it("初始化池子价格为1:1,需对齐decimal", async function () {
    await initializePool(config.USDC, config.DAI, 6, 18, PoolFee.LOW, 1);
  });
  it("能添加USDC-DAI流动性吗？", async function () {
    await addLiquidity(
      config.USDC,
      config.DAI,
      6,
      18,
      PoolFee.LOW,
      1,
      oneHundredMillionTokens,
      oneHundredMillionTokens,
      0.99,
      1.01
    );
  });
  it("能添加USDC-DAI 0.3%费率的流动性吗", async function () {
    await createPool(config.USDC, config.DAI, PoolFee.MEDIUM);
    await initializePool(config.USDC, config.DAI, 6, 18, PoolFee.MEDIUM, 1);
    await addLiquidity(
      config.USDC,
      config.DAI,
      6,
      18,
      PoolFee.MEDIUM,
      1,
      oneHundredMillionTokens,
      oneHundredMillionTokens,
      0.99,
      1.01
    );
  });

  it("应该可以查看TokenId对应的流动性信息", async function () {
    const tokenId = 8; // 替换为你想查询的 Token ID
    try {
      const position = await npmContract.positions(tokenId);
      console.log(`Token ID: ${tokenId} 的流动性信息:`);
      console.log(`  流动性: ${position.liquidity.toString()}`);
      console.log(`  operator: ${position.operator}`);
      console.log(`  token0: ${position.token0}`);
      console.log(`  token1: ${position.token1}`);
      console.log(`  fee: ${position.fee}`);
      console.log(`  tickLower: ${position.tickLower}`);
      console.log(`  tickUpper: ${position.tickUpper}`);
      console.log(`  liquidity: ${position.liquidity}`);
      console.log(
        `  feeGrowthInside0LastX128: ${position.feeGrowthInside0LastX128}`
      );
      console.log(
        `  feeGrowthInside1LastX128: ${position.feeGrowthInside1LastX128}`
      );
      console.log(`  tokensOwed0: ${position.tokensOwed0}`);
      console.log(`  tokensOwed1: ${position.tokensOwed1}`);
    } catch (error: any) {
      console.error("❌ 查询流动性信息失败:", error.message);
      throw error;
    }
  });

  it("应该能创建USDC-USDT", async function () {
    await createAndAddLiquidity(
      config.USDC,
      config.USDT,
      6,
      6,
      oneHundredMillionTokens,
      oneHundredMillionTokens,
      PoolFee.LOW,
      1, //TokenA/TokenB
      0.99,
      1.01
    );
  });
  it("应该能创建USDC-TBTC", async function () {
    await createAndAddLiquidity(
      config.USDC,
      config.TBTC,
      6,
      18,
      oneHundredMillionTokens,
      oneHundredMillionTokens,
      PoolFee.LOW,
      1, //TokenA/TokenB
      0.99,
      1.01
    );
  });
  it("应该能创建USDC-WBTC", async function () {
    await createAndAddLiquidity(
      config.USDC,
      config.WBTC,
      6,
      8,
      oneHundredMillionTokens,
      oneHundredMillionTokens,
      PoolFee.LOW,
      1, //TokenA/TokenB
      0.99,
      1.01
    );
  });
  it("应该能创建USDC-WETH", async function () {
    await createAndAddLiquidity(
      config.USDC,
      config.WETH9,
      6,
      18,
      "100000000", // 一亿USDC
      "100000000", // 一亿ETH 实际应该只有 33000 ETH
      PoolFee.MEDIUM,
      3000, //TokenA/TokenB
      2500,
      3500
    );
  });
  it.only("应该能创建DAI-USDT", async function () {
    await createAndAddLiquidity(
      config.DAI,
      config.USDT,
      Decimals.DAI,
      Decimals.USDT,
      "100000", // 一亿USDC
      "100000", // 一亿ETH 实际应该只有 33000 ETH
      PoolFee.LOW,
      1, //TokenA/TokenB
      0.99,
      1.01
    );
  });

  //-----------------------------------functions---------------------------------------

  async function createAndAddLiquidity(
    TokenA: string,
    TokenB: string,
    decimalsA: number,
    decimalsB: number,
    TokenAYouProvide: string,
    TokenBYouProvide: string,
    fee: PoolFee,
    price: number, //TokenA/TokenB
    liquidityRangePriceLow: number,
    liquidityRangePriceHigh: number
  ) {
    await createPool(TokenA, TokenB, fee);
    await initializePool(TokenA, TokenB, decimalsA, decimalsB, fee, price);
    await addLiquidity(
      TokenA,
      TokenB,
      decimalsA,
      decimalsB,
      fee,
      price,
      TokenAYouProvide,
      TokenBYouProvide,
      liquidityRangePriceLow,
      liquidityRangePriceHigh
    );
  }

  async function createPool(tokenA: string, tokenB: string, pool_fee: number) {
    const nextswapFactroyAddress =
      deployment.contracts.NextswapV3Factory.proxyAddress;
    const [token0, token1] = sortTokens(tokenA, tokenB);
    console.log("Token0:", token0);
    console.log("Token1:", token1);
    console.log("Fee: pool_fee " + pool_fee);
    console.log("Factory地址:", nextswapFactroyAddress);

    // 验证 factory 合约是否有代码
    const factoryCode = await ethers.provider.getCode(nextswapFactroyAddress);
    if (factoryCode === "0x") {
      console.log("❌ Factory 合约未部署，跳过测试");
      return;
    }

    try {
      console.log("正在检查池子是否已存在...");
      const existingPool = await nextswapFactroy.getPool(
        token0,
        token1,
        pool_fee
      );

      if (existingPool !== ethers.ZeroAddress) {
        console.log("✅ 池子已存在，地址:", existingPool);
        return;
      }

      console.log("池子不存在，开始创建...");

      // 先用 staticCall 模拟获取返回的池子地址
      const poolAddress = await nextswapFactroy.createPool.staticCall(
        token0,
        token1,
        pool_fee
      );
      console.log("✅ 模拟创建池子成功！ 池子ID:", poolAddress);
      expect(poolAddress).to.be.a("string").that.is.not.empty;

      const tx = await nextswapFactroy.createPool(token0, token1, pool_fee);
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // 验证实际创建的池子地址是否与模拟的一致
      const actualPoolAddress = await nextswapFactroy.getPool(
        token0,
        token1,
        pool_fee
      );
      expect(actualPoolAddress).to.equal(poolAddress);

      console.log("✅ 池子创建成功！");
      console.log("模拟地址:", poolAddress);
      console.log("实际地址:", actualPoolAddress);
      console.log("地址一致:", poolAddress === actualPoolAddress);
      console.log("Gas used:", receipt?.gasUsed.toString());

      console.log("✅ 池子初始化成功！");
      return;
    } catch (error: any) {
      console.error("❌ 创建池子失败:", error.message);
      if (error.data) {
        console.error("错误数据:", error.data);
      }
      throw error;
    }
  }

  /**
   * 添加流动性到交易池
   * @param tokenA 代币A地址
   * @param tokenB 代币B地址
   * @param decimalsA 代币A的小数位数
   * @param decimalsB 代币B的小数位数
   * @param pool_fee 池子费率
   * @param price 初始价格 (TokenA/TokenB)
   * @param amountA 代币A的数量（字符串格式，不含小数位）
   * @param amountB 代币B的数量（字符串格式，不含小数位）
   * @param liquidityRangePriceLow 流动性价格下限 (TokenA/TokenB)，例如 2970
   * @param liquidityRangePriceHigh 流动性价格上限 (TokenA/TokenB)，例如 3030
   * @returns Promise<void>
   */
  async function addLiquidity(
    tokenA: string,
    tokenB: string,
    decimalsA: number,
    decimalsB: number,
    pool_fee: number,
    price: number, //TokenA/TokenB
    amountA: string,
    amountB: string,
    liquidityRangePriceLow: number,
    liquidityRangePriceHigh: number
  ) {
    console.log("\n=== 开始添加流动性 ===");

    // 获取代币合约
    const tokenAContract = await ethers.getContractAt("ERC20", tokenA);
    const tokenBContract = await ethers.getContractAt("ERC20", tokenB);

    // 检查余额
    const balanceA = await tokenAContract.balanceOf(signer.address);
    const balanceB = await tokenBContract.balanceOf(signer.address);
    console.log(`TokenA余额: ${ethers.formatUnits(balanceA, decimalsA)}`);
    console.log(`TokenB余额: ${ethers.formatUnits(balanceB, decimalsB)}`);

    if (balanceA === 0n || balanceB === 0n) {
      console.log("❌ 余额不足，跳过测试");
      return;
    }

    // 检查池子状态
    const [token0, token1] = sortTokens(tokenA, tokenB);
    const poolAddress = await nextswapFactroy.getPool(token0, token1, pool_fee);

    if (poolAddress === ethers.ZeroAddress) {
      console.log("❌ 池子不存在，请先创建池子");
      return;
    }

    const pool = await ethers.getContractAt("INextswapV3Pool", poolAddress);
    const slot0 = await pool.slot0();
    console.log("当前池子价格 sqrtPriceX96:", slot0.sqrtPriceX96.toString());
    console.log("当前 tick:", slot0.tick.toString());

    if (slot0.sqrtPriceX96 === 0n) {
      console.log("❌ 池子未初始化，请先初始化池子");
      return;
    }

    // 解析金额
    const testAmountA = ethers.parseUnits(amountA, decimalsA);
    const testAmountB = ethers.parseUnits(amountB, decimalsB);

    console.log(
      `添加金额 - TokenA: ${ethers.formatUnits(testAmountA, decimalsA)}`
    );
    console.log(
      `添加金额 - TokenB: ${ethers.formatUnits(testAmountB, decimalsB)}`
    );

    // 授权代币
    const allowanceA = await tokenAContract.allowance(
      signer.address,
      npmAddress
    );
    const allowanceB = await tokenBContract.allowance(
      signer.address,
      npmAddress
    );

    if (allowanceA < testAmountA) {
      const approveTxA = await tokenAContract.approve(
        npmAddress,
        ethers.MaxUint256
      );
      await approveTxA.wait();
      console.log("✅ TokenA 授权成功");
    }

    if (allowanceB < testAmountB) {
      const approveTxB = await tokenBContract.approve(
        npmAddress,
        ethers.MaxUint256
      );
      await approveTxB.wait();
      console.log("✅ TokenB 授权成功");
    }

    // 计算价格范围的 tick
    const isTokenAToken0 = token0 === tokenA;
    const decimals0 = isTokenAToken0 ? decimalsA : decimalsB;
    const decimals1 = isTokenAToken0 ? decimalsB : decimalsA;

    console.log(`初始价格 (TokenA/TokenB): ${price}`);
    console.log(`价格下限 (TokenA/TokenB): ${liquidityRangePriceLow}`);
    console.log(`价格上限 (TokenA/TokenB): ${liquidityRangePriceHigh}`);

    // 根据价格范围计算 sqrtPriceX96
    // 如果 tokenA 是 token0，需要转换为 token1/token0 的价格（取倒数）
    // 注意：取倒数后大小关系会颠倒！
    const sqrtPrice1 = isTokenAToken0
      ? priceToSqrtRatioX96(decimals0, decimals1, 1 / liquidityRangePriceHigh)
      : priceToSqrtRatioX96(decimals0, decimals1, liquidityRangePriceHigh);

    const sqrtPrice2 = isTokenAToken0
      ? priceToSqrtRatioX96(decimals0, decimals1, 1 / liquidityRangePriceLow)
      : priceToSqrtRatioX96(decimals0, decimals1, liquidityRangePriceLow);

    // 确保 sqrtPriceX96Lower < sqrtPriceX96Upper
    const sqrtPriceX96Lower = sqrtPrice1 < sqrtPrice2 ? sqrtPrice1 : sqrtPrice2;
    const sqrtPriceX96Upper = sqrtPrice1 < sqrtPrice2 ? sqrtPrice2 : sqrtPrice1;

    const tickLower = TickMath.getTickAtSqrtRatio(sqrtPriceX96Lower);
    const tickUpper = TickMath.getTickAtSqrtRatio(sqrtPriceX96Upper);

    const spacing = getSpacingFromFee(pool_fee);
    const nearestTickLower = nearestUsableTick(tickLower, spacing);
    const nearestTickUpper = nearestUsableTick(tickUpper, spacing);

    console.log("Token0:", token0, `(${isTokenAToken0 ? "TokenA" : "TokenB"})`);
    console.log("Token1:", token1, `(${isTokenAToken0 ? "TokenB" : "TokenA"})`);
    console.log("TickLower:", nearestTickLower);
    console.log("TickUpper:", nearestTickUpper);
    console.log("当前 Tick:", slot0.tick.toString());

    // 根据 token0/token1 顺序设置数量
    let amount0Desired, amount1Desired;
    if (isTokenAToken0) {
      amount0Desired = testAmountA;
      amount1Desired = testAmountB;
    } else {
      amount0Desired = testAmountB;
      amount1Desired = testAmountA;
    }

    console.log("Amount0Desired:", amount0Desired.toString());
    console.log("Amount1Desired:", amount1Desired.toString());

    // 构建 mint 参数
    const mintParams = {
      token0: token0,
      token1: token1,
      fee: pool_fee,
      tickLower: nearestTickLower,
      tickUpper: nearestTickUpper,
      amount0Desired: amount0Desired,
      amount1Desired: amount1Desired,
      amount0Min: 0n, // 测试环境放宽下限
      amount1Min: 0n,
      recipient: await signer.getAddress(),
      deadline: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 180, // 180天后过期
    };

    try {
      // 模拟调用
      const { tokenId, liquidity, amount0, amount1 } =
        await npmContract.mint.staticCall(mintParams);

      console.log(
        `✅ 模拟添加流动性成功！\n` +
          `   Token ID: ${tokenId}\n` +
          `   流动性: ${liquidity.toString()}\n` +
          `   实际 amount0: ${amount0.toString()}\n` +
          `   实际 amount1: ${amount1.toString()}`
      );

      // 实际执行
      const tx = await npmContract.mint(mintParams);
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // 查询池子流动性
      const poolLiquidity = await pool.liquidity();
      console.log("当前池子总流动性:", poolLiquidity.toString());
      console.log("✅ 添加流动性成功！Gas used:", receipt?.gasUsed.toString());

      return;
    } catch (error: any) {
      console.error("❌ 添加流动性失败:");
      console.error("错误信息:", error.message);

      if (error.error) {
        console.error("详细错误:", error.error);
      }
      if (error.reason) {
        console.error("失败原因:", error.reason);
      }
      if (error.code) {
        console.error("错误代码:", error.code);
      }

      throw error;
    }
  }

  /**
   * 初始化交易池价格
   * @param tokenA 代币A地址
   * @param tokenB 代币B地址
   * @param decimalsA 代币A的小数位数
   * @param decimalsB 代币B的小数位数
   * @param pool_fee 池子费率
   * @param initialPrice 初始兑换比例 (TokenA/TokenB)，默认 1:1
   * @returns Promise<boolean> - true 表示跳过测试，false 表示成功初始化
   */
  async function initializePool(
    tokenA: string,
    tokenB: string,
    decimalsA: number,
    decimalsB: number,
    pool_fee: number,
    initialPrice: number = 1
  ) {
    const [token0, token1] = sortTokens(tokenA, tokenB);
    console.log("正在初始化池子价格...");

    const actualPoolAddress = await nextswapFactroy.getPool(
      token0,
      token1,
      pool_fee
    );

    if (!verifyContractCode(actualPoolAddress)) {
      console.log("❌ 池子合约未部署，跳过测试");
      return;
    }

    const pool = await ethers.getContractAt(
      "INextswapV3Pool",
      actualPoolAddress
    );

    // 检查池子是否已初始化
    const slot0 = await pool.slot0();
    if (slot0.sqrtPriceX96 !== 0n) {
      console.log("✅ 池子已初始化，跳过初始化步骤");
      return;
    }

    // 根据排序后的 token0/token1 确定对应的小数位数
    const isTokenAToken0 = token0 === tokenA;
    const decimals0 = isTokenAToken0 ? decimalsA : decimalsB;
    const decimals1 = isTokenAToken0 ? decimalsB : decimalsA;

    // 计算 token1/token0 的价格比例
    // 如果 tokenA 是 token0: price = token1/token0 = tokenB/tokenA = 1/initialPrice
    // 如果 tokenB 是 token0: price = token1/token0 = tokenA/tokenB = initialPrice
    const priceToken1OverToken0 = isTokenAToken0
      ? 1 / initialPrice
      : initialPrice;

    // 根据价格和小数位数计算 sqrtPriceX96
    const sqrtPriceX96 = priceToSqrtRatioX96(
      decimals0,
      decimals1,
      priceToken1OverToken0
    );

    console.log(
      "Token0:",
      token0,
      `(${isTokenAToken0 ? "TokenA" : "TokenB"}, decimals: ${decimals0})`
    );
    console.log(
      "Token1:",
      token1,
      `(${isTokenAToken0 ? "TokenB" : "TokenA"}, decimals: ${decimals1})`
    );
    console.log("初始兑换比例 (TokenA/TokenB):", initialPrice);
    console.log("实际价格 (Token1/Token0):", priceToken1OverToken0);
    console.log("初始化价格 sqrtPriceX96:", sqrtPriceX96.toString());

    const initTx = await pool.initialize(BigInt(sqrtPriceX96.toString()));
    const receipt = await initTx.wait();
    expect(receipt?.status).to.equal(1);

    console.log(
      "✅ 池子价格初始化成功！ Gas used:",
      receipt?.gasUsed.toString()
    );
    return;
  }
});
