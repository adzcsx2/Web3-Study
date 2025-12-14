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
import { PoolFee } from "../scripts/types/Enum";

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

  //一亿token
  const oneHundredMillionTokens = "100000";

  let wethAddress: string;
  let daiAddress: string;
  let usdcAddress: string;
  let usdtAddress: string;
  let tbtcAddress: string;
  let wbtcAddress: string;

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

    wethAddress = config.WETH9;
    daiAddress = config.DAI;
    usdcAddress = config.USDC;
    usdtAddress = config.USDT;
    tbtcAddress = config.TBTC;
    wbtcAddress = config.WBTC;
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

  it.only("应该可以swap USDC-DAI", async function () {
    //获取USDC-DAI池子地址
    const poolAddress = await nextswapFactroy.getPool(
      usdcAddress,
      daiAddress,
      PoolFee.LOW
    );
    console.log("USDC-DAI池子地址:", poolAddress);
    expect(poolAddress).to.not.equal(ADDRESS_ZERO);
    //获取swap路由合约
    const swapRouterAddress =
      deployment.contracts.NextswapV3SwapRouter.proxyAddress;
    console.log("Swap路由合约地址:", swapRouterAddress);
    expect(swapRouterAddress).to.be.a("string").that.is.not.empty;
  });

  //------------------------------------------- functions -------------------------------------------------
  async function showTokenBalance(
    tokenName: string,
    tokenAddress: string,
    decimals: number,
    owner: string
  ) {
    const erc20Contract = (await ethers.getContractAt(
      "ERC20",
      tokenAddress
    )) as ERC20;
    const balance = await erc20Contract.balanceOf(owner);
    console.log(tokenName, "余额:", ethers.formatUnits(balance, decimals));
  }
});
