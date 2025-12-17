import { ethers } from "hardhat";
import {
  getNetworkConfig,
  NetworkTokenAddresses,
} from "../scripts/config/network-config";
import deployment_localhost from "../deployments/localhost-deployment.json";
import deployment_sepolia from "../deployments/sepolia-deployment.json";
import { expect } from "chai";
import { ERC20 } from "../typechain-types";
import { NonfungiblePositionManager } from "../typechain-types/contracts/contract/swap/periphery/NonfungiblePositionManager";
import { NextswapV3Factory } from "../typechain-types/contracts/contract/swap/core/NextswapV3Factory";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { sortTokens, priceToSqrtRatioX96 } from "../scripts/utils/Maths";
import { nearestUsableTick, TickMath } from "@uniswap/v3-sdk";
import JSBI from "jsbi";
import { Decimals } from "../scripts/types/Enum";
import { LpPoolManager } from "../typechain-types/contracts/contract/LpPoolManager";
import { LpPoolContract } from "../typechain-types/contracts/contract/LpPoolContract";
import { NextswapToken } from "../typechain-types/contracts/contract/NextswapToken";
import { LiquidityMiningReward } from "../typechain-types/contracts/contract/token_distribution/LiquidityMiningReward";

/**
 *
 * * LP 质押 5年收益测试
 *  测试前需重置区块链状态，重新部署合约
 * npx hardhat test .\test\deploy_lp_staking.test.ts --network localhost
 */

describe("LP 质押 5年收益测试", function () {
  let deployment: any;
  this.timeout(600000); // 设置超时时间为 10 分钟
  let config: NetworkTokenAddresses;
  let signer: SignerWithAddress, user1: SignerWithAddress;

  // 核心合约
  let npmContract: NonfungiblePositionManager;
  let nextswapFactory: NextswapV3Factory;
  let lpPoolManager: LpPoolManager;
  let nextswapToken: NextswapToken;
  let liquidityMiningReward: LiquidityMiningReward;

  // 测试用代币
  let usdcToken: ERC20;
  let daiToken: ERC20;
  let wethToken: ERC20;

  // 快照ID，用于恢复区块链状态
  let snapshotId: string;

  enum PoolFee {
    LOW = 500, // 0.05%
    MEDIUM = 3000, // 0.3%
    HIGH = 10000, // 1%
  }

  // 初始化环境（仅执行一次）
  before(async function () {
    console.log("\n" + "=".repeat(80));
    console.log("开始 LP 质押 5年收益测试");
    console.log("=".repeat(80));

    [signer, user1] = await ethers.getSigners();

    const chainId = (await ethers.provider.getNetwork()).chainId;
    config = getNetworkConfig(Number(chainId));
    deployment =
      Number(chainId) === 11155111 ? deployment_sepolia : deployment_localhost;

    console.log("\n🔍 检查部署文件:");
    console.log("  ChainId:", chainId);
    console.log(
      "  NPM地址:",
      deployment.contracts.NonfungiblePositionManager?.proxyAddress
    );
    console.log(
      "  Factory地址:",
      deployment.contracts.NextswapV3Factory?.proxyAddress
    );
    console.log(
      "  LpPoolManager地址:",
      deployment.contracts.LpPoolManager?.proxyAddress
    );

    // 初始化核心合约
    npmContract = (await ethers.getContractAt(
      "NonfungiblePositionManager",
      deployment.contracts.NonfungiblePositionManager.proxyAddress
    )) as NonfungiblePositionManager;

    nextswapFactory = (await ethers.getContractAt(
      "NextswapV3Factory",
      deployment.contracts.NextswapV3Factory.proxyAddress
    )) as NextswapV3Factory;

    lpPoolManager = (await ethers.getContractAt(
      "LpPoolManager",
      deployment.contracts.LpPoolManager.proxyAddress
    )) as LpPoolManager;

    const liquidityMiningAddr =
      await lpPoolManager.liquidityMiningRewardContract();
    liquidityMiningReward = (await ethers.getContractAt(
      "LiquidityMiningReward",
      liquidityMiningAddr
    )) as LiquidityMiningReward;

    const nextswapTokenAddr = await liquidityMiningReward.nextSwapToken();
    nextswapToken = (await ethers.getContractAt(
      "NextswapToken",
      nextswapTokenAddr
    )) as NextswapToken;

    // 获取代币合约
    usdcToken = (await ethers.getContractAt("ERC20", config.USDC)) as ERC20;
    daiToken = (await ethers.getContractAt("ERC20", config.DAI)) as ERC20;
    wethToken = (await ethers.getContractAt("ERC20", config.WETH9)) as ERC20;

    console.log("\n📋 合约地址信息:");
    console.log("  NPM:", await npmContract.getAddress());
    console.log("  Factory:", await nextswapFactory.getAddress());
    console.log("  LpPoolManager:", await lpPoolManager.getAddress());
    console.log(
      "  LiquidityMiningReward:",
      await liquidityMiningReward.getAddress()
    );
    console.log("  NextswapToken:", await nextswapToken.getAddress());
    console.log("  USDC:", config.USDC);
    console.log("  DAI:", config.DAI);
    console.log("  WETH9:", config.WETH9);

    // 创建初始快照
    snapshotId = await ethers.provider.send("evm_snapshot", []);
    console.log("\n📸 已创建区块链初始快照，ID:", snapshotId);
  });

  // 每个测试前恢复到初始快照
  beforeEach(async function () {
    if (snapshotId) {
      await ethers.provider.send("evm_revert", [snapshotId]);
      // 恢复后重新创建快照供下次使用
      snapshotId = await ethers.provider.send("evm_snapshot", []);
      console.log("\n🔄 已恢复区块链状态到初始快照");
    }
  });

  /**
   * 辅助函数：创建或获取 LP 质押池
   */
  async function createOrGetLpPool(
    tokenA: string,
    tokenB: string,
    fee: PoolFee,
    allocPoint: number
  ): Promise<{ poolId: number; lpPoolContract: LpPoolContract }> {
    const [token0, token1] = sortTokens(tokenA, tokenB);
    const [exists, existingPoolId] = await lpPoolManager.findPoolId(
      token0,
      token1,
      fee
    );

    let poolId: number;
    let lpPoolContract: LpPoolContract;

    if (exists) {
      poolId = Number(existingPoolId);
      const poolData = await lpPoolManager.lpPools(poolId - 1);
      lpPoolContract = (await ethers.getContractAt(
        "LpPoolContract",
        poolData.poolAddress
      )) as LpPoolContract;
      console.log(`  ✅ 使用已存在的池子，Pool ID: ${poolId}`);

      // 尝试激活池子（如果已激活会失败，但我们忽略错误）
      try {
        const activateTx = await lpPoolContract.activatePool(true);
        await activateTx.wait();
        console.log(`  ✅ 已激活池子 ${poolId}`);
      } catch (error: any) {
        if (
          error.message.includes("PoolAlreadyActive") ||
          error.message.includes("PoolStatusNotChange")
        ) {
          console.log(`  ✅ 池子 ${poolId} 已处于激活状态`);
        } else {
          throw error;
        }
      }
    } else {
      const lpPoolConfig = {
        poolId: 0,
        poolAddress: ethers.ZeroAddress,
        tokenA: token0,
        tokenB: token1,
        fee: fee,
        allocPoint: allocPoint,
      };
      const tx = await lpPoolManager.addLpPool(lpPoolConfig);
      await tx.wait();
      poolId = Number(await lpPoolManager.getPoolsCount());
      const poolData = await lpPoolManager.lpPools(poolId - 1);
      lpPoolContract = (await ethers.getContractAt(
        "LpPoolContract",
        poolData.poolAddress
      )) as LpPoolContract;
      console.log(
        `  ✅ 创建新池子，Pool ID: ${poolId}，分配权重: ${allocPoint}`
      );

      // 激活新创建的池子
      const activateTx = await lpPoolContract.activatePool(true);
      await activateTx.wait();
      console.log(`  ✅ 已激活池子 ${poolId}`);
    }

    return { poolId, lpPoolContract };
  }

  /**
   * 辅助函数：创建交易池
   */
  async function createSwapPool(
    tokenA: string,
    tokenB: string,
    decimalsA: number,
    decimalsB: number,
    fee: PoolFee,
    initialPrice: number
  ) {
    const [token0, token1] = sortTokens(tokenA, tokenB);

    // 检查池子是否已存在
    const existingPool = await nextswapFactory.getPool(token0, token1, fee);

    if (existingPool !== ethers.ZeroAddress) {
      console.log(`  ✅ 交易池已存在: ${existingPool}`);
      return;
    }

    // 创建池子
    const createTx = await nextswapFactory.createPool(token0, token1, fee);
    await createTx.wait();

    // 初始化价格
    const poolAddress = await nextswapFactory.getPool(token0, token1, fee);
    const pool = await ethers.getContractAt("INextswapV3Pool", poolAddress);

    const isTokenAToken0 = token0 === tokenA;
    const decimals0 = isTokenAToken0 ? decimalsA : decimalsB;
    const decimals1 = isTokenAToken0 ? decimalsB : decimalsA;
    const priceToken1OverToken0 = isTokenAToken0
      ? 1 / initialPrice
      : initialPrice;

    const sqrtPriceX96 = priceToSqrtRatioX96(
      decimals0,
      decimals1,
      priceToken1OverToken0
    );

    const initTx = await pool.initialize(BigInt(sqrtPriceX96.toString()));
    await initTx.wait();
    console.log(`  ✅ 交易池创建并初始化成功`);
  }

  /**
   * 辅助函数：添加流动性并返回 Token ID
   */
  async function addLiquidityAndGetTokenId(
    tokenA: string,
    tokenB: string,
    decimalsA: number,
    decimalsB: number,
    fee: PoolFee,
    amountADesired: string,
    amountBDesired: string,
    priceLow: number,
    priceHigh: number
  ): Promise<number> {
    const [token0, token1] = sortTokens(tokenA, tokenB);
    const isTokenAToken0 = token0 === tokenA;

    // 获取代币合约
    const token0Contract = (await ethers.getContractAt(
      "ERC20",
      token0
    )) as ERC20;
    const token1Contract = (await ethers.getContractAt(
      "ERC20",
      token1
    )) as ERC20;

    // 计算实际数量（考虑小数位）
    const amount0Desired = ethers.parseUnits(
      isTokenAToken0 ? amountADesired : amountBDesired,
      isTokenAToken0 ? decimalsA : decimalsB
    );
    const amount1Desired = ethers.parseUnits(
      isTokenAToken0 ? amountBDesired : amountADesired,
      isTokenAToken0 ? decimalsB : decimalsA
    );

    // 授权代币
    const npmAddress = await npmContract.getAddress();
    await token0Contract.approve(npmAddress, amount0Desired);
    await token1Contract.approve(npmAddress, amount1Desired);

    // 计算价格范围的 tick
    const decimals0 = isTokenAToken0 ? decimalsA : decimalsB;
    const decimals1 = isTokenAToken0 ? decimalsB : decimalsA;

    const priceLowToken1OverToken0 = isTokenAToken0 ? 1 / priceHigh : priceLow;
    const priceHighToken1OverToken0 = isTokenAToken0 ? 1 / priceLow : priceHigh;

    const sqrtPriceLowX96 = priceToSqrtRatioX96(
      decimals0,
      decimals1,
      priceLowToken1OverToken0
    );
    const sqrtPriceHighX96 = priceToSqrtRatioX96(
      decimals0,
      decimals1,
      priceHighToken1OverToken0
    );

    const tickLow = Number(
      TickMath.getTickAtSqrtRatio(
        JSBI.BigInt(sqrtPriceLowX96.toString())
      ).toString()
    );
    const tickHigh = Number(
      TickMath.getTickAtSqrtRatio(
        JSBI.BigInt(sqrtPriceHighX96.toString())
      ).toString()
    );

    // 获取 tick spacing
    const poolAddress = await nextswapFactory.getPool(token0, token1, fee);
    const pool = await ethers.getContractAt("INextswapV3Pool", poolAddress);
    const tickSpacing = await pool.tickSpacing();

    const tickLower = nearestUsableTick(tickLow, Number(tickSpacing));
    const tickUpper = nearestUsableTick(tickHigh, Number(tickSpacing));

    // 准备 mint 参数
    const deadline =
      (await ethers.provider.getBlock("latest"))!.timestamp + 3600;
    const mintParams = {
      token0: token0,
      token1: token1,
      fee: fee,
      tickLower: tickLower,
      tickUpper: tickUpper,
      amount0Desired: amount0Desired,
      amount1Desired: amount1Desired,
      amount0Min: 0,
      amount1Min: 0,
      recipient: signer.address,
      deadline: deadline,
    };

    // 铸造 NFT - 先通过 staticCall 获取返回值
    const { tokenId: returnedTokenId } = await npmContract.mint.staticCall(
      mintParams
    );

    // 实际执行铸造
    const tx = await npmContract.mint(mintParams);
    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
      throw new Error("铸造 NFT 失败");
    }

    const tokenId = Number(returnedTokenId);
    console.log(`  ✅ 添加流动性成功，NFT Token ID: ${tokenId}`);
    return tokenId;
  }

  /**
   * 辅助函数：快进到奖励开始时间（并额外前进1天以确保奖励可领取）
   */
  async function fastForwardToRewardStart() {
    const miningStartTime = await liquidityMiningReward.startTime();
    const currentTime =
      (await ethers.provider.getBlock("latest"))?.timestamp || 0;

    if (currentTime < Number(miningStartTime)) {
      const gap = Number(miningStartTime) - currentTime + 1; // +1秒确保超过开始时间
      await ethers.provider.send("evm_increaseTime", [gap]);
      await ethers.provider.send("evm_mine", []);
      console.log("  ⏰ 已快进到奖励开始时间");
    }

    // 额外前进1天以确保有奖励可领取
    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);
    console.log("  ⏰ 已额外前进1天以确保奖励累积");

    return (await ethers.provider.getBlock("latest"))?.timestamp || 0;
  }

  /**
   * 辅助函数：质押 NFT
   */
  async function stakeNFT(
    lpPoolContract: LpPoolContract,
    tokenId: number,
    poolId: number
  ) {
    // 授权 NFT
    const lpPoolAddress = await lpPoolContract.getAddress();
    const approveTx = await npmContract.approve(lpPoolAddress, tokenId);
    await approveTx.wait();

    // 质押
    const stakeTx = await lpPoolContract.stakeLP(tokenId);
    const stakeReceipt = await stakeTx.wait();

    if (!stakeReceipt || stakeReceipt.status !== 1) {
      throw new Error("质押失败");
    }

    console.log(`  ✅ NFT ${tokenId} 质押成功到池子 ${poolId}`);
    return (await ethers.provider.getBlock("latest"))?.timestamp || 0;
  }

  // ============================================================================
  // 测试用例 1: 质押1个NFT，5年后应该能取出约5亿TOKEN
  // ============================================================================
  it("测试1: 质押1个NFT，5年后应该能取出约5亿TOKEN", async function () {
    console.log("\n" + "=".repeat(80));
    console.log("测试 1: 质押 1 个 NFT，5年后取出约 5 亿 TOKEN");
    console.log("=".repeat(80));

    // 步骤1: 创建 LP 质押池
    console.log("\n📌 步骤1: 创建 LP 质押池");
    const { poolId, lpPoolContract } = await createOrGetLpPool(
      config.USDC,
      config.DAI,
      PoolFee.LOW,
      100 // 分配权重 100
    );

    // 步骤2: 创建交易池
    console.log("\n📌 步骤2: 创建交易池");
    await createSwapPool(
      config.USDC,
      config.DAI,
      Decimals.USDC,
      Decimals.DAI,
      PoolFee.LOW,
      1.0 // USDC/DAI = 1:1
    );

    // 步骤3: 添加流动性
    console.log("\n📌 步骤3: 添加流动性");
    const tokenId = await addLiquidityAndGetTokenId(
      config.USDC,
      config.DAI,
      Decimals.USDC,
      Decimals.DAI,
      PoolFee.LOW,
      "10000", // 10,000 USDC
      "10000", // 10,000 DAI
      0.9, // 价格下限
      1.1 // 价格上限
    );

    // 步骤4: 快进到奖励开始时间
    console.log("\n📌 步骤4: 快进到奖励开始时间");
    await fastForwardToRewardStart();

    // 步骤5: 质押 NFT
    console.log("\n📌 步骤5: 质押 NFT");
    const stakeTime = await stakeNFT(lpPoolContract, tokenId, poolId);
    console.log("  质押时间:", new Date(stakeTime * 1000).toLocaleString());

    // 步骤6: 时间前进5年
    console.log("\n📌 步骤6: 时间前进 5 年");
    const fiveYears = 5 * 365 * 24 * 60 * 60;
    await ethers.provider.send("evm_increaseTime", [fiveYears]);
    await ethers.provider.send("evm_mine", []);
    const endTime = (await ethers.provider.getBlock("latest"))?.timestamp || 0;
    console.log("  结束时间:", new Date(endTime * 1000).toLocaleString());
    console.log("  质押时长:", Math.floor((endTime - stakeTime) / 86400), "天");

    // 步骤7: 领取奖励
    console.log("\n📌 步骤7: 领取奖励");
    const balanceBefore = await nextswapToken.balanceOf(signer.address);
    console.log("  领取前余额:", ethers.formatEther(balanceBefore), "NST");

    // 调试：查看质押信息
    const stakeInfo = await lpPoolContract.lpNftStakes(tokenId);
    console.log(
      "  调试 - 待领取奖励:",
      ethers.formatEther(stakeInfo.pendingRewards),
      "NST"
    );
    console.log(
      "  调试 - 已领取奖励:",
      ethers.formatEther(stakeInfo.receivedReward),
      "NST"
    );

    // 调试：查看池子信息
    const poolInfo = await lpPoolContract.getPoolInfo();
    console.log(
      "  调试 - 池子累计奖励:",
      ethers.formatEther(poolInfo.accNextSwapPerShare),
      "NST/share"
    );
    console.log("  调试 - 池子总流动性:", poolInfo.totalLiquidity.toString());
    console.log(
      "  调试 - 池子最后更新时间:",
      new Date(Number(poolInfo.lastRewardTime) * 1000).toLocaleString()
    );

    // 调试：查看挖矿合约信息
    const miningEndTime = await liquidityMiningReward.endTime();
    console.log(
      "  调试 - 挖矿结束时间:",
      new Date(Number(miningEndTime) * 1000).toLocaleString()
    );
    const rewardPerSecond = await liquidityMiningReward.getRewardPerSecond();
    console.log(
      "  调试 - 当前每秒奖励:",
      ethers.formatEther(rewardPerSecond),
      "NST/s"
    );

    const claimTx = await lpPoolContract.claimRewards(tokenId);
    await claimTx.wait();

    const balanceAfter = await nextswapToken.balanceOf(signer.address);
    const rewardReceived = balanceAfter - balanceBefore;

    console.log("  领取后余额:", ethers.formatEther(balanceAfter), "NST");
    console.log("  实际奖励:", ethers.formatEther(rewardReceived), "NST");

    // 步骤8: 验证奖励金额（约5亿TOKEN）
    console.log("\n📌 步骤8: 验证奖励金额");
    const expectedAmount = ethers.parseEther("500000000"); // 5亿 TOKEN
    const tolerance = ethers.parseEther("50000000"); // 容差 5000万（10%）

    expect(rewardReceived).to.be.greaterThan(expectedAmount - tolerance);
    console.log("  ✅ 奖励金额验证通过");
    console.log("  预期金额:", ethers.formatEther(expectedAmount), "NST");
    console.log("  实际金额:", ethers.formatEther(rewardReceived), "NST");
    console.log(
      "  完成度:",
      ((Number(rewardReceived) * 100) / Number(expectedAmount)).toFixed(2),
      "%"
    );

    console.log("\n" + "=".repeat(80));
    console.log("✅ 测试 1 完成");
    console.log("=".repeat(80));
  });

  // ============================================================================
  // 测试用例 2: 在不同池子质押5个NFT，不同分配权重，5年后总共应该能取出约5亿TOKEN
  // ============================================================================
  it("测试2: 在不同池子质押5个NFT，不同分配权重，5年后总共应该能取出约5亿TOKEN", async function () {
    console.log("\n" + "=".repeat(80));
    console.log(
      "测试 2: 在不同池子质押 5 个 NFT，不同分配权重，5年后总共取出约 5 亿 TOKEN"
    );
    console.log("=".repeat(80));

    // 步骤1: 创建3个不同的 LP 质押池，不同权重
    console.log("\n📌 步骤1: 创建 3 个不同的 LP 质押池");

    // 池子1: USDC/DAI，权重 50
    const pool1 = await createOrGetLpPool(
      config.USDC,
      config.DAI,
      PoolFee.LOW,
      50
    );

    // 池子2: USDC/WETH，权重 30
    const pool2 = await createOrGetLpPool(
      config.USDC,
      config.WETH9,
      PoolFee.MEDIUM,
      30
    );

    // 池子3: DAI/WETH，权重 20
    const pool3 = await createOrGetLpPool(
      config.DAI,
      config.WETH9,
      PoolFee.LOW,
      20
    );

    // 步骤2: 创建对应的交易池
    console.log("\n📌 步骤2: 创建对应的交易池");
    await createSwapPool(
      config.USDC,
      config.DAI,
      Decimals.USDC,
      Decimals.DAI,
      PoolFee.LOW,
      1.0
    );

    await createSwapPool(
      config.USDC,
      config.WETH9,
      Decimals.USDC,
      Decimals.WETH9,
      PoolFee.MEDIUM,
      2500.0 // 1 WETH9 = 2500 USDC
    );

    await createSwapPool(
      config.DAI,
      config.WETH9,
      Decimals.DAI,
      Decimals.WETH9,
      PoolFee.LOW,
      2500.0 // 1 WETH9 = 2500 DAI
    );

    // 步骤3: 添加流动性到3个池子，每个池子添加不同数量的NFT
    console.log("\n📌 步骤3: 添加流动性到 3 个池子");

    const tokenIds: number[] = [];

    // 池子1: 添加2个NFT
    console.log("\n  🏊 池子1 (USDC/DAI): 添加 2 个 NFT");
    for (let i = 0; i < 2; i++) {
      const tokenId = await addLiquidityAndGetTokenId(
        config.USDC,
        config.DAI,
        Decimals.USDC,
        Decimals.DAI,
        PoolFee.LOW,
        "5000",
        "5000",
        0.9,
        1.1
      );
      tokenIds.push(tokenId);
    }

    // 池子2: 添加2个NFT
    console.log("\n  🏊 池子2 (USDC/WETH9): 添加 2 个 NFT");
    for (let i = 0; i < 2; i++) {
      const tokenId = await addLiquidityAndGetTokenId(
        config.USDC,
        config.WETH9,
        Decimals.USDC,
        Decimals.WETH9,
        PoolFee.MEDIUM,
        "10000",
        "4",
        2000,
        3000
      );
      tokenIds.push(tokenId);
    }

    // 池子3: 添加1个NFT
    console.log("\n  🏊 池子3 (DAI/WETH9): 添加 1 个 NFT");
    const tokenId5 = await addLiquidityAndGetTokenId(
      config.DAI,
      config.WETH9,
      Decimals.DAI,
      Decimals.WETH9,
      PoolFee.LOW,
      "10000",
      "4",
      2000,
      3000
    );
    tokenIds.push(tokenId5);

    console.log(`\n  ✅ 总共创建了 ${tokenIds.length} 个 NFT`);
    console.log("  Token IDs:", tokenIds.join(", "));

    // 步骤4: 快进到奖励开始时间
    console.log("\n📌 步骤4: 快进到奖励开始时间");
    await fastForwardToRewardStart();

    // 步骤5: 质押所有 NFT
    console.log("\n📌 步骤5: 质押所有 NFT");

    // 池子1: 质押2个NFT
    await stakeNFT(pool1.lpPoolContract, tokenIds[0], pool1.poolId);
    await stakeNFT(pool1.lpPoolContract, tokenIds[1], pool1.poolId);

    // 池子2: 质押2个NFT
    await stakeNFT(pool2.lpPoolContract, tokenIds[2], pool2.poolId);
    await stakeNFT(pool2.lpPoolContract, tokenIds[3], pool2.poolId);

    // 池子3: 质押1个NFT
    const stakeTime = await stakeNFT(
      pool3.lpPoolContract,
      tokenIds[4],
      pool3.poolId
    );

    console.log("\n  ✅ 所有 NFT 已质押");
    console.log("  质押时间:", new Date(stakeTime * 1000).toLocaleString());

    // 步骤6: 时间前进5年
    console.log("\n📌 步骤6: 时间前进 5 年");
    const fiveYears = 5 * 365 * 24 * 60 * 60;
    await ethers.provider.send("evm_increaseTime", [fiveYears]);
    await ethers.provider.send("evm_mine", []);
    const endTime = (await ethers.provider.getBlock("latest"))?.timestamp || 0;
    console.log("  结束时间:", new Date(endTime * 1000).toLocaleString());
    console.log("  质押时长:", Math.floor((endTime - stakeTime) / 86400), "天");

    // 步骤7: 领取所有奖励
    console.log("\n📌 步骤7: 领取所有奖励");
    const balanceBefore = await nextswapToken.balanceOf(signer.address);
    console.log("  领取前余额:", ethers.formatEther(balanceBefore), "NST");

    // 从池子1领取2个NFT的奖励
    await pool1.lpPoolContract.claimRewards(tokenIds[0]);
    await pool1.lpPoolContract.claimRewards(tokenIds[1]);

    // 从池子2领取2个NFT的奖励
    await pool2.lpPoolContract.claimRewards(tokenIds[2]);
    await pool2.lpPoolContract.claimRewards(tokenIds[3]);

    // 从池子3领取1个NFT的奖励
    await pool3.lpPoolContract.claimRewards(tokenIds[4]);

    const balanceAfter = await nextswapToken.balanceOf(signer.address);
    const totalRewardReceived = balanceAfter - balanceBefore;

    console.log("  领取后余额:", ethers.formatEther(balanceAfter), "NST");
    console.log(
      "  总实际奖励:",
      ethers.formatEther(totalRewardReceived),
      "NST"
    );

    // 步骤8: 验证总奖励金额（约5亿TOKEN）
    console.log("\n📌 步骤8: 验证总奖励金额");
    const expectedAmount = ethers.parseEther("500000000"); // 5亿 TOKEN
    const tolerance = ethers.parseEther("50000000"); // 容差 5000万（10%）

    expect(totalRewardReceived).to.be.greaterThan(expectedAmount - tolerance);
    console.log("  ✅ 总奖励金额验证通过");
    console.log("  预期金额:", ethers.formatEther(expectedAmount), "NST");
    console.log("  实际金额:", ethers.formatEther(totalRewardReceived), "NST");
    console.log(
      "  完成度:",
      ((Number(totalRewardReceived) * 100) / Number(expectedAmount)).toFixed(2),
      "%"
    );

    // 额外信息：显示每个池子的奖励分配
    console.log("\n📊 奖励分配详情:");
    console.log("  池子1 (权重 50): USDC/DAI - 2 个 NFT");
    console.log("  池子2 (权重 30): USDC/WETH9 - 2 个 NFT");
    console.log("  池子3 (权重 20): DAI/WETH9 - 1 个 NFT");
    console.log("  总权重: 100");

    console.log("\n" + "=".repeat(80));
    console.log("✅ 测试 2 完成");
    console.log("=".repeat(80));
  });

  // ============================================================================
  // 测试用例 3: 质押1个NFT，3年后应该能取出约3.75亿TOKEN（75%的奖励）
  // ============================================================================
  it("测试3: 质押1个NFT，3年后应该能取出约3.75亿TOKEN", async function () {
    console.log("\n" + "=".repeat(80));
    console.log("测试 3: 质押 1 个 NFT，3年后取出约 3.75 亿 TOKEN");
    console.log("=".repeat(80));

    // 步骤1: 创建 LP 质押池
    console.log("\n📌 步骤1: 创建 LP 质押池");
    const { poolId, lpPoolContract } = await createOrGetLpPool(
      config.USDC,
      config.DAI,
      PoolFee.LOW,
      100 // 分配权重 100
    );

    // 步骤2: 创建交易池
    console.log("\n📌 步骤2: 创建交易池");
    await createSwapPool(
      config.USDC,
      config.DAI,
      Decimals.USDC,
      Decimals.DAI,
      PoolFee.LOW,
      1.0 // USDC/DAI = 1:1
    );

    // 步骤3: 添加流动性
    console.log("\n📌 步骤3: 添加流动性");
    const tokenId = await addLiquidityAndGetTokenId(
      config.USDC,
      config.DAI,
      Decimals.USDC,
      Decimals.DAI,
      PoolFee.LOW,
      "10000", // 10,000 USDC
      "10000", // 10,000 DAI
      0.9, // 价格下限
      1.1 // 价格上限
    );

    // 步骤4: 快进到奖励开始时间
    console.log("\n📌 步骤4: 快进到奖励开始时间");
    await fastForwardToRewardStart();

    // 步骤5: 质押 NFT
    console.log("\n📌 步骤5: 质押 NFT");
    const stakeTime = await stakeNFT(lpPoolContract, tokenId, poolId);
    console.log("  质押时间:", new Date(stakeTime * 1000).toLocaleString());

    // 步骤6: 时间前进3年
    console.log("\n📌 步骤6: 时间前进 3 年");
    const threeYears = 3 * 365 * 24 * 60 * 60;
    await ethers.provider.send("evm_increaseTime", [threeYears]);
    await ethers.provider.send("evm_mine", []);
    const endTime = (await ethers.provider.getBlock("latest"))?.timestamp || 0;
    console.log("  结束时间:", new Date(endTime * 1000).toLocaleString());
    console.log("  质押时长:", Math.floor((endTime - stakeTime) / 86400), "天");

    // 步骤7: 领取奖励
    console.log("\n📌 步骤7: 领取奖励");
    const balanceBefore = await nextswapToken.balanceOf(signer.address);
    console.log("  领取前余额:", ethers.formatEther(balanceBefore), "NST");

    const claimTx = await lpPoolContract.claimRewards(tokenId);
    await claimTx.wait();

    const balanceAfter = await nextswapToken.balanceOf(signer.address);
    const rewardReceived = balanceAfter - balanceBefore;

    console.log("  领取后余额:", ethers.formatEther(balanceAfter), "NST");
    console.log("  实际奖励:", ethers.formatEther(rewardReceived), "NST");

    // 步骤8: 验证奖励金额（3年约为3.75亿TOKEN，即总量的75%）
    console.log("\n📌 步骤8: 验证奖励金额");
    const expectedAmount = ethers.parseEther("375000000"); // 3.75亿 TOKEN (75%)
    const tolerance = ethers.parseEther("37500000"); // 容差 3750万（10%）

    expect(rewardReceived).to.be.greaterThan(expectedAmount - tolerance);
    expect(rewardReceived).to.be.lessThan(expectedAmount + tolerance);
    console.log("  ✅ 奖励金额验证通过");
    console.log("  预期金额:", ethers.formatEther(expectedAmount), "NST");
    console.log("  实际金额:", ethers.formatEther(rewardReceived), "NST");
    console.log(
      "  完成度:",
      ((Number(rewardReceived) * 100) / Number(expectedAmount)).toFixed(2),
      "%"
    );

    console.log("\n" + "=".repeat(80));
    console.log("✅ 测试 3 完成");
    console.log("=".repeat(80));
  });

  // ============================================================================
  // 测试用例 4: 在不同池子质押5个NFT，不同分配权重，3年后总共应该能取出约3.75亿TOKEN
  // ============================================================================
  it("测试4: 在不同池子质押5个NFT，不同分配权重，3年后总共应该能取出约3.75亿TOKEN", async function () {
    console.log("\n" + "=".repeat(80));
    console.log(
      "测试 4: 在不同池子质押 5 个 NFT，不同分配权重，3年后总共取出约 3.75 亿 TOKEN"
    );
    console.log("=".repeat(80));

    // 步骤1: 创建3个不同的LP质押池
    console.log("\n📌 步骤1: 创建 3 个不同的 LP 质押池");
    const pool1 = await createOrGetLpPool(
      config.USDC,
      config.DAI,
      PoolFee.LOW,
      50 // 分配权重 50
    );
    const pool2 = await createOrGetLpPool(
      config.USDC,
      config.WETH9,
      PoolFee.MEDIUM,
      30 // 分配权重 30
    );
    const pool3 = await createOrGetLpPool(
      config.DAI,
      config.WETH9,
      PoolFee.LOW,
      20 // 分配权重 20
    );

    // 步骤2: 创建对应的交易池
    console.log("\n📌 步骤2: 创建对应的交易池");
    await createSwapPool(
      config.USDC,
      config.DAI,
      Decimals.USDC,
      Decimals.DAI,
      PoolFee.LOW,
      1.0
    );
    await createSwapPool(
      config.USDC,
      config.WETH9,
      Decimals.USDC,
      Decimals.WETH9,
      PoolFee.MEDIUM,
      0.00025
    );
    await createSwapPool(
      config.DAI,
      config.WETH9,
      Decimals.DAI,
      Decimals.WETH9,
      PoolFee.LOW,
      0.00025
    );

    // 步骤3: 添加流动性到3个池子
    console.log("\n📌 步骤3: 添加流动性到 3 个池子");
    const tokenIds: number[] = [];

    // 池子1: 添加2个NFT
    console.log("\n  🏊 池子1 (USDC/DAI): 添加 2 个 NFT");
    for (let i = 0; i < 2; i++) {
      const tokenId = await addLiquidityAndGetTokenId(
        config.USDC,
        config.DAI,
        Decimals.USDC,
        Decimals.DAI,
        PoolFee.LOW,
        "10000",
        "10000",
        0.9,
        1.1
      );
      tokenIds.push(tokenId);
    }

    // 池子2: 添加2个NFT
    console.log("\n  🏊 池子2 (USDC/WETH9): 添加 2 个 NFT");
    for (let i = 0; i < 2; i++) {
      const tokenId = await addLiquidityAndGetTokenId(
        config.USDC,
        config.WETH9,
        Decimals.USDC,
        Decimals.WETH9,
        PoolFee.MEDIUM,
        "10000",
        "4",
        2000,
        3000
      );
      tokenIds.push(tokenId);
    }

    // 池子3: 添加1个NFT
    console.log("\n  🏊 池子3 (DAI/WETH9): 添加 1 个 NFT");
    const tokenId5 = await addLiquidityAndGetTokenId(
      config.DAI,
      config.WETH9,
      Decimals.DAI,
      Decimals.WETH9,
      PoolFee.LOW,
      "10000",
      "4",
      2000,
      3000
    );
    tokenIds.push(tokenId5);

    console.log(`\n  ✅ 总共创建了 ${tokenIds.length} 个 NFT`);
    console.log("  Token IDs:", tokenIds.join(", "));

    // 步骤4: 快进到奖励开始时间
    console.log("\n📌 步骤4: 快进到奖励开始时间");
    await fastForwardToRewardStart();

    // 步骤5: 质押所有 NFT
    console.log("\n📌 步骤5: 质押所有 NFT");

    // 池子1: 质押2个NFT
    await stakeNFT(pool1.lpPoolContract, tokenIds[0], pool1.poolId);
    await stakeNFT(pool1.lpPoolContract, tokenIds[1], pool1.poolId);

    // 池子2: 质押2个NFT
    await stakeNFT(pool2.lpPoolContract, tokenIds[2], pool2.poolId);
    await stakeNFT(pool2.lpPoolContract, tokenIds[3], pool2.poolId);

    // 池子3: 质押1个NFT
    const stakeTime = await stakeNFT(
      pool3.lpPoolContract,
      tokenIds[4],
      pool3.poolId
    );

    console.log("\n  ✅ 所有 NFT 已质押");
    console.log("  质押时间:", new Date(stakeTime * 1000).toLocaleString());

    // 步骤6: 时间前进3年
    console.log("\n📌 步骤6: 时间前进 3 年");
    const threeYears = 3 * 365 * 24 * 60 * 60;
    await ethers.provider.send("evm_increaseTime", [threeYears]);
    await ethers.provider.send("evm_mine", []);
    const endTime = (await ethers.provider.getBlock("latest"))?.timestamp || 0;
    console.log("  结束时间:", new Date(endTime * 1000).toLocaleString());
    console.log("  质押时长:", Math.floor((endTime - stakeTime) / 86400), "天");

    // 步骤7: 领取所有奖励
    console.log("\n📌 步骤7: 领取所有奖励");
    const balanceBefore = await nextswapToken.balanceOf(signer.address);
    console.log("  领取前余额:", ethers.formatEther(balanceBefore), "NST");

    // 从池子1领取2个NFT的奖励
    await pool1.lpPoolContract.claimRewards(tokenIds[0]);
    await pool1.lpPoolContract.claimRewards(tokenIds[1]);

    // 从池子2领取2个NFT的奖励
    await pool2.lpPoolContract.claimRewards(tokenIds[2]);
    await pool2.lpPoolContract.claimRewards(tokenIds[3]);

    // 从池子3领取1个NFT的奖励
    await pool3.lpPoolContract.claimRewards(tokenIds[4]);

    const balanceAfter = await nextswapToken.balanceOf(signer.address);
    const totalRewardReceived = balanceAfter - balanceBefore;

    console.log("  领取后余额:", ethers.formatEther(balanceAfter), "NST");
    console.log(
      "  总实际奖励:",
      ethers.formatEther(totalRewardReceived),
      "NST"
    );

    // 步骤8: 验证总奖励金额（3年约为3.75亿TOKEN）
    console.log("\n📌 步骤8: 验证总奖励金额");
    const expectedAmount = ethers.parseEther("375000000"); // 3.75亿 TOKEN (75%)
    const tolerance = ethers.parseEther("37500000"); // 容差 3750万（10%）

    expect(totalRewardReceived).to.be.greaterThan(expectedAmount - tolerance);
    expect(totalRewardReceived).to.be.lessThan(expectedAmount + tolerance);
    console.log("  ✅ 总奖励金额验证通过");
    console.log("  预期金额:", ethers.formatEther(expectedAmount), "NST");
    console.log("  实际金额:", ethers.formatEther(totalRewardReceived), "NST");
    console.log(
      "  完成度:",
      ((Number(totalRewardReceived) * 100) / Number(expectedAmount)).toFixed(2),
      "%"
    );

    // 额外信息：显示每个池子的奖励分配
    console.log("\n📊 奖励分配详情:");
    console.log("  池子1 (权重 50): USDC/DAI - 2 个 NFT");
    console.log("  池子2 (权重 30): USDC/WETH9 - 2 个 NFT");
    console.log("  池子3 (权重 20): DAI/WETH9 - 1 个 NFT");
    console.log("  总权重: 100");

    console.log("\n" + "=".repeat(80));
    console.log("✅ 测试 4 完成");
    console.log("=".repeat(80));
  });
});
