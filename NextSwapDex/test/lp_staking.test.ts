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

describe("LP 质押功能测试", function () {
  let deployment: any;
  this.timeout(600000); // 设置超时时间为 10 分钟
  let config: NetworkTokenAddresses;
  let signer: SignerWithAddress,
    user1: SignerWithAddress,
    user2: SignerWithAddress,
    user3: SignerWithAddress;

  // 核心合约
  let npmContract: NonfungiblePositionManager;
  let nextswapFactory: NextswapV3Factory;
  let lpPoolManager: LpPoolManager;
  let nextswapToken: NextswapToken;
  let liquidityMiningReward: LiquidityMiningReward;

  // 测试用代币
  let usdcToken: ERC20;
  let daiToken: ERC20;

  // 测试数据
  const oneHundredThousandTokens = "100000";
  let testTokenId: number = 0;
  let poolId: number = 0;
  let lpPoolContract: LpPoolContract;

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

    // 初始化核心合约
    npmContract = (await ethers.getContractAt(
      "NonfungiblePositionManager",
      deployment.contracts.NonfungiblePositionManager.proxyAddress
    )) as NonfungiblePositionManager;

    nextswapFactory = (await ethers.getContractAt(
      "NextswapV3Factory",
      deployment.contracts.NextswapV3Factory.proxyAddress
    )) as NextswapV3Factory;

    // 获取代币合约
    usdcToken = (await ethers.getContractAt("ERC20", config.USDC)) as ERC20;
    daiToken = (await ethers.getContractAt("ERC20", config.DAI)) as ERC20;

    console.log("\n📋 合约地址信息:");
    console.log("  NPM:", await npmContract.getAddress());
    console.log("  Factory:", await nextswapFactory.getAddress());
    console.log("  USDC:", config.USDC);
    console.log("  DAI:", config.DAI);
  });

  afterEach(async function () {
    if (this.currentTest?.state !== "passed") return;
    await new Promise((resolve) => setTimeout(resolve, 100)); // 暂停 100ms
  });

  describe("1. 初始化和配置", function () {
    it("能获取LpPoolManager合约吗？", async function () {
      // 尝试从部署文件获取
      const lpPoolManagerAddress =
        deployment.contracts.LpPoolManager?.proxyAddress;

      if (!lpPoolManagerAddress) {
        console.log("⚠️  LpPoolManager 未在部署文件中找到");
        console.log("💡 提示: 这个测试需要先部署 LpPoolManager 合约");
        console.log("   可以运行: npx hardhat run scripts/deploy/[your-deploy-script].ts --network localhost");
        this.skip();
      }

      lpPoolManager = (await ethers.getContractAt(
        "LpPoolManager",
        lpPoolManagerAddress
      )) as LpPoolManager;

      expect(await lpPoolManager.getAddress()).to.not.equal(
        ethers.ZeroAddress
      );
      console.log("✅ LpPoolManager 地址:", await lpPoolManager.getAddress());

      // 获取相关合约
      const positionManagerAddr = await lpPoolManager.positionManager();
      const liquidityMiningAddr =
        await lpPoolManager.liquidityMiningRewardContract();

      expect(positionManagerAddr).to.equal(await npmContract.getAddress());
      console.log("  ✓ Position Manager 已正确配置");

      liquidityMiningReward = (await ethers.getContractAt(
        "LiquidityMiningReward",
        liquidityMiningAddr
      )) as LiquidityMiningReward;

      const nextswapTokenAddr =
        await liquidityMiningReward.nextSwapToken();
      nextswapToken = (await ethers.getContractAt(
        "NextswapToken",
        nextswapTokenAddr
      )) as NextswapToken;

      console.log("  ✓ NextswapToken 地址:", nextswapTokenAddr);
    });

    it("能创建 LP 质押池吗？", async function () {
      if (!lpPoolManager) {
        console.log("⚠️  LpPoolManager 未初始化，跳过测试");
        this.skip();
      }

      // 获取 token0 和 token1（按地址排序）
      const [token0, token1] = sortTokens(config.USDC, config.DAI);

      // 创建池配置
      const lpPoolConfig = {
        poolId: 0, // 将由合约自动分配
        poolAddress: ethers.ZeroAddress, // 将由合约创建
        tokenA: token0,
        tokenB: token1,
        fee: PoolFee.LOW,
        allocPoint: 100, // 分配权重 100
      };

      console.log("\n🏊 创建 LP 质押池:");
      console.log("  Token0 (USDC):", token0);
      console.log("  Token1 (DAI):", token1);
      console.log("  Fee:", PoolFee.LOW);
      console.log("  Alloc Point:", 100);

      try {
        // 检查池是否已存在
        const existingPoolId = await lpPoolManager.getPoolIdByKey(
          token0,
          token1,
          PoolFee.LOW
        );

        if (existingPoolId > 0) {
          console.log("✅ 池子已存在，Pool ID:", existingPoolId.toString());
          poolId = Number(existingPoolId);

          const poolData = await lpPoolManager.lpPools(poolId - 1);
          lpPoolContract = (await ethers.getContractAt(
            "LpPoolContract",
            poolData.poolAddress
          )) as LpPoolContract;
        } else {
          // 创建新池
          const tx = await lpPoolManager.addLpPool(lpPoolConfig);
          const receipt = await tx.wait();
          expect(receipt?.status).to.equal(1);

          // 获取新创建的池 ID
          poolId = Number(await lpPoolManager.getPoolsCount());
          console.log("✅ 成功创建池子，Pool ID:", poolId);

          const poolData = await lpPoolManager.lpPools(poolId - 1);
          lpPoolContract = (await ethers.getContractAt(
            "LpPoolContract",
            poolData.poolAddress
          )) as LpPoolContract;

          console.log("  ✓ Pool Contract 地址:", poolData.poolAddress);
          console.log("  ✓ Gas used:", receipt?.gasUsed.toString());
        }
      } catch (error: any) {
        console.error("❌ 创建池子失败:", error.message);
        throw error;
      }
    });

    it("能激活质押池吗？", async function () {
      if (!lpPoolContract) {
        console.log("⚠️  LpPoolContract 未初始化，跳过测试");
        this.skip();
      }

      console.log("\n🔓 激活质押池...");

      // 检查当前状态
      const poolInfo = await lpPoolContract.poolInfo();
      console.log("  当前状态:", poolInfo.isActive ? "已激活" : "未激活");

      if (poolInfo.isActive) {
        console.log("✅ 池子已激活");
        return;
      }

      // 激活池子
      try {
        const tx = await lpPoolContract.activatePool(true);
        const receipt = await tx.wait();
        expect(receipt?.status).to.equal(1);

        const newPoolInfo = await lpPoolContract.poolInfo();
        expect(newPoolInfo.isActive).to.be.true;

        console.log("✅ 成功激活池子");
        console.log("  ✓ 激活时间:", new Date(Number(newPoolInfo.activeTime) * 1000).toLocaleString());
        console.log("  ✓ Gas used:", receipt?.gasUsed.toString());
      } catch (error: any) {
        console.error("❌ 激活池子失败:", error.message);
        throw error;
      }
    });
  });

  describe("2. 准备流动性 NFT", function () {
    it("能创建并初始化 USDC-DAI 池子吗？", async function () {
      await createAndInitializePool(
        config.USDC,
        config.DAI,
        Decimals.USDC,
        Decimals.DAI,
        PoolFee.LOW,
        1 // 1:1 价格
      );
    });

    it("能添加流动性并获取 NFT 吗？", async function () {
      const tokenId = await addLiquidityAndGetTokenId(
        config.USDC,
        config.DAI,
        Decimals.USDC,
        Decimals.DAI,
        PoolFee.LOW,
        1,
        oneHundredThousandTokens,
        oneHundredThousandTokens,
        0.99,
        1.01
      );

      testTokenId = tokenId;
      console.log("✅ 成功创建流动性 NFT，Token ID:", tokenId);

      // 验证 NFT 所有权
      const owner = await npmContract.ownerOf(tokenId);
      expect(owner).to.equal(signer.address);
      console.log("  ✓ NFT 所有者:", owner);

      // 查询 NFT 详情
      const position = await npmContract.positions(tokenId);
      console.log("  ✓ 流动性:", position.liquidity.toString());
      console.log("  ✓ Token0:", position.token0);
      console.log("  ✓ Token1:", position.token1);
      console.log("  ✓ Fee:", position.fee);
    });
  });

  describe("3. 单个 NFT 质押", function () {
    it("能质押单个 LP NFT 吗？", async function () {
      if (!lpPoolContract || testTokenId === 0) {
        console.log("⚠️  前置条件未满足，跳过测试");
        this.skip();
      }

      console.log("\n💎 质押 LP NFT...");
      console.log("  Token ID:", testTokenId);

      // 授权 NFT 给质押合约
      const lpPoolAddress = await lpPoolContract.getAddress();
      const approvedAddress = await npmContract.getApproved(testTokenId);

      if (approvedAddress !== lpPoolAddress) {
        console.log("  正在授权 NFT...");
        const approveTx = await npmContract.approve(
          lpPoolAddress,
          testTokenId
        );
        await approveTx.wait();
        console.log("  ✓ NFT 授权成功");
      }

      // 查询质押前状态
      const poolInfoBefore = await lpPoolContract.poolInfo();
      console.log("  质押前总数量:", poolInfoBefore.totalStaked.toString());
      console.log(
        "  质押前总流动性:",
        poolInfoBefore.totalLiquidity.toString()
      );

      // 执行质押
      try {
        const tx = await lpPoolContract.stakeLP(testTokenId);
        const receipt = await tx.wait();
        expect(receipt?.status).to.equal(1);

        console.log("✅ 质押成功！");
        console.log("  ✓ Gas used:", receipt?.gasUsed.toString());

        // 验证质押后状态
        const poolInfoAfter = await lpPoolContract.poolInfo();
        expect(poolInfoAfter.totalStaked).to.equal(
          poolInfoBefore.totalStaked + 1n
        );
        console.log("  ✓ 质押后总数量:", poolInfoAfter.totalStaked.toString());
        console.log(
          "  ✓ 质押后总流动性:",
          poolInfoAfter.totalLiquidity.toString()
        );

        // 查询质押信息
        const stakeInfo = await lpPoolContract.lpNftStakes(testTokenId);
        expect(stakeInfo.owner).to.equal(signer.address);
        console.log("  ✓ 质押所有者:", stakeInfo.owner);
        console.log("  ✓ 质押流动性:", stakeInfo.liquidity.toString());
        console.log(
          "  ✓ 质押时间:",
          new Date(Number(stakeInfo.stakedAt) * 1000).toLocaleString()
        );

        // 验证 NFT 已转移到合约
        const newOwner = await npmContract.ownerOf(testTokenId);
        expect(newOwner).to.equal(lpPoolAddress);
        console.log("  ✓ NFT 已转移到质押合约");
      } catch (error: any) {
        console.error("❌ 质押失败:", error.message);
        if (error.reason) console.error("  原因:", error.reason);
        throw error;
      }
    });

    it("能查询用户的所有质押吗？", async function () {
      if (!lpPoolContract) {
        console.log("⚠️  LpPoolContract 未初始化，跳过测试");
        this.skip();
      }

      console.log("\n📊 查询用户质押信息...");

      const stakedTokens = await lpPoolContract.getUserStakedTokens(
        signer.address
      );
      console.log("  质押的 Token IDs:", stakedTokens.toString());
      expect(stakedTokens.length).to.be.greaterThan(0);

      // 查询每个质押的详细信息
      for (const tokenId of stakedTokens) {
        const stakeInfo = await lpPoolContract.lpNftStakes(tokenId);
        console.log(`\n  Token ID ${tokenId}:`);
        console.log("    流动性:", stakeInfo.liquidity.toString());
        console.log("    待领取奖励:", stakeInfo.pendingRewards.toString());
        console.log("    已领取奖励:", stakeInfo.receivedReward.toString());
      }
    });
  });

  describe("4. 批量质押", function () {
    let tokenIds: number[] = [];

    it("能创建多个流动性 NFT 吗？", async function () {
      console.log("\n🎨 创建多个流动性 NFT...");

      // 创建 3 个 NFT
      for (let i = 0; i < 3; i++) {
        const tokenId = await addLiquidityAndGetTokenId(
          config.USDC,
          config.DAI,
          Decimals.USDC,
          Decimals.DAI,
          PoolFee.LOW,
          1,
          "10000", // 每个 1万 tokens
          "10000",
          0.99,
          1.01
        );
        tokenIds.push(tokenId);
        console.log(`  ✓ 创建 NFT #${i + 1}, Token ID:`, tokenId);
      }

      expect(tokenIds.length).to.equal(3);
      console.log("✅ 成功创建 3 个 NFT:", tokenIds);
    });

    it("能批量质押多个 LP NFT 吗？", async function () {
      if (!lpPoolContract || tokenIds.length === 0) {
        console.log("⚠️  前置条件未满足，跳过测试");
        this.skip();
      }

      console.log("\n💎💎💎 批量质押 LP NFTs...");
      console.log("  Token IDs:", tokenIds);

      // 批量授权
      const lpPoolAddress = await lpPoolContract.getAddress();
      for (const tokenId of tokenIds) {
        const approveTx = await npmContract.approve(lpPoolAddress, tokenId);
        await approveTx.wait();
      }
      console.log("  ✓ 批量授权完成");

      // 查询质押前状态
      const poolInfoBefore = await lpPoolContract.poolInfo();
      console.log("  质押前总数量:", poolInfoBefore.totalStaked.toString());

      // 批量质押
      try {
        const tx = await lpPoolContract.batchStakeLP(tokenIds);
        const receipt = await tx.wait();
        expect(receipt?.status).to.equal(1);

        console.log("✅ 批量质押成功！");
        console.log("  ✓ Gas used:", receipt?.gasUsed.toString());

        // 验证质押后状态
        const poolInfoAfter = await lpPoolContract.poolInfo();
        expect(poolInfoAfter.totalStaked).to.equal(
          poolInfoBefore.totalStaked + BigInt(tokenIds.length)
        );
        console.log("  ✓ 质押后总数量:", poolInfoAfter.totalStaked.toString());

        // 验证每个 NFT 都已质押
        for (const tokenId of tokenIds) {
          const stakeInfo = await lpPoolContract.lpNftStakes(tokenId);
          expect(stakeInfo.owner).to.equal(signer.address);
          console.log(`  ✓ Token ID ${tokenId} 已质押`);
        }
      } catch (error: any) {
        console.error("❌ 批量质押失败:", error.message);
        throw error;
      }
    });
  });

  describe("5. 奖励领取", function () {
    it("能等待一段时间积累奖励吗？", async function () {
      console.log("\n⏰ 等待奖励积累...");

      // 增加区块时间（模拟时间流逝）
      const timeToIncrease = 24 * 60 * 60; // 1 天
      await ethers.provider.send("evm_increaseTime", [timeToIncrease]);
      await ethers.provider.send("evm_mine", []);

      console.log(`✅ 时间已前进 ${timeToIncrease / 3600} 小时`);
    });

    it("能领取单个 NFT 的质押奖励吗？", async function () {
      if (!lpPoolContract || testTokenId === 0) {
        console.log("⚠️  前置条件未满足，跳过测试");
        this.skip();
      }

      console.log("\n🎁 领取质押奖励...");
      console.log("  Token ID:", testTokenId);

      // 查询待领取奖励
      const stakeInfoBefore = await lpPoolContract.lpNftStakes(testTokenId);
      console.log(
        "  待领取奖励:",
        ethers.formatEther(stakeInfoBefore.pendingRewards)
      );

      // 查询 NextswapToken 余额
      const balanceBefore = await nextswapToken.balanceOf(signer.address);

      try {
        const tx = await lpPoolContract.claimRewards(testTokenId);
        const receipt = await tx.wait();
        expect(receipt?.status).to.equal(1);

        console.log("✅ 领取奖励成功！");
        console.log("  ✓ Gas used:", receipt?.gasUsed.toString());

        // 验证余额变化
        const balanceAfter = await nextswapToken.balanceOf(signer.address);
        const received = balanceAfter - balanceBefore;
        console.log("  ✓ 领取数量:", ethers.formatEther(received));

        // 验证质押信息更新
        const stakeInfoAfter = await lpPoolContract.lpNftStakes(testTokenId);
        expect(stakeInfoAfter.receivedReward).to.be.greaterThan(
          stakeInfoBefore.receivedReward
        );
        console.log(
          "  ✓ 累计已领取:",
          ethers.formatEther(stakeInfoAfter.receivedReward)
        );
      } catch (error: any) {
        console.error("❌ 领取奖励失败:", error.message);
        throw error;
      }
    });

    it("能批量领取多个 NFT 的奖励吗？", async function () {
      if (!lpPoolContract) {
        console.log("⚠️  LpPoolContract 未初始化，跳过测试");
        this.skip();
      }

      // 获取用户所有质押的 NFT
      const stakedTokens = await lpPoolContract.getUserStakedTokens(
        signer.address
      );

      if (stakedTokens.length === 0) {
        console.log("⚠️  没有质押的 NFT，跳过测试");
        this.skip();
      }

      console.log("\n🎁🎁🎁 批量领取奖励...");
      console.log("  Token IDs:", stakedTokens.toString());

      const balanceBefore = await nextswapToken.balanceOf(signer.address);

      try {
        const tx = await lpPoolContract.batchClaimRewards(stakedTokens);
        const receipt = await tx.wait();
        expect(receipt?.status).to.equal(1);

        console.log("✅ 批量领取成功！");
        console.log("  ✓ Gas used:", receipt?.gasUsed.toString());

        const balanceAfter = await nextswapToken.balanceOf(signer.address);
        const received = balanceAfter - balanceBefore;
        console.log("  ✓ 总领取数量:", ethers.formatEther(received));
      } catch (error: any) {
        console.error("❌ 批量领取失败:", error.message);
        throw error;
      }
    });
  });

  describe("6. 解除质押", function () {
    it("能请求解除质押吗？", async function () {
      if (!lpPoolContract || testTokenId === 0) {
        console.log("⚠️  前置条件未满足，跳过测试");
        this.skip();
      }

      console.log("\n🔓 请求解除质押...");
      console.log("  Token ID:", testTokenId);

      try {
        const tx = await lpPoolContract.requestUnstakeLP(testTokenId);
        const receipt = await tx.wait();
        expect(receipt?.status).to.equal(1);

        console.log("✅ 请求解质押成功！");
        console.log("  ✓ Gas used:", receipt?.gasUsed.toString());

        // 查询请求时间
        const stakeInfo = await lpPoolContract.lpNftStakes(testTokenId);
        expect(stakeInfo.requestedUnstakeAt).to.be.greaterThan(0);
        console.log(
          "  ✓ 请求时间:",
          new Date(Number(stakeInfo.requestedUnstakeAt) * 1000).toLocaleString()
        );

        // 查询冷却时间
        const cooldown = await lpPoolContract.UNSTAKE_COOLDOWN();
        console.log("  ✓ 冷却时间:", Number(cooldown) / 86400, "天");
      } catch (error: any) {
        console.error("❌ 请求解质押失败:", error.message);
        throw error;
      }
    });

    it("在冷却期内应该无法解除质押", async function () {
      if (!lpPoolContract || testTokenId === 0) {
        console.log("⚠️  前置条件未满足，跳过测试");
        this.skip();
      }

      console.log("\n⏰ 测试冷却期限制...");

      try {
        await lpPoolContract.unstakeLP(testTokenId);
        // 如果没有抛出错误，测试失败
        expect.fail("应该在冷却期内抛出错误");
      } catch (error: any) {
        expect(error.message).to.include("UnstakeCooldownNotPassed");
        console.log("✅ 正确阻止了冷却期内的解质押");
      }
    });

    it("能在冷却期后解除质押吗？", async function () {
      if (!lpPoolContract || testTokenId === 0) {
        console.log("⚠️  前置条件未满足，跳过测试");
        this.skip();
      }

      console.log("\n🔓 等待冷却期并解除质押...");

      // 获取冷却时间
      const cooldown = await lpPoolContract.UNSTAKE_COOLDOWN();
      console.log("  冷却时间:", Number(cooldown), "秒");

      // 增加区块时间以超过冷却期
      await ethers.provider.send("evm_increaseTime", [Number(cooldown) + 1]);
      await ethers.provider.send("evm_mine", []);
      console.log("  ✓ 时间已前进");

      // 查询解质押前状态
      const poolInfoBefore = await lpPoolContract.poolInfo();
      const stakeInfoBefore = await lpPoolContract.lpNftStakes(testTokenId);

      try {
        const tx = await lpPoolContract.unstakeLP(testTokenId);
        const receipt = await tx.wait();
        expect(receipt?.status).to.equal(1);

        console.log("✅ 解质押成功！");
        console.log("  ✓ Gas used:", receipt?.gasUsed.toString());

        // 验证质押信息已删除
        const stakeInfoAfter = await lpPoolContract.lpNftStakes(testTokenId);
        expect(stakeInfoAfter.owner).to.equal(ethers.ZeroAddress);
        console.log("  ✓ 质押信息已清除");

        // 验证池子状态更新
        const poolInfoAfter = await lpPoolContract.poolInfo();
        expect(poolInfoAfter.totalStaked).to.equal(
          poolInfoBefore.totalStaked - 1n
        );
        expect(poolInfoAfter.totalLiquidity).to.equal(
          poolInfoBefore.totalLiquidity - stakeInfoBefore.liquidity
        );
        console.log("  ✓ 池子状态已更新");

        // 验证 NFT 已返还
        const owner = await npmContract.ownerOf(testTokenId);
        expect(owner).to.equal(signer.address);
        console.log("  ✓ NFT 已返还给所有者");
      } catch (error: any) {
        console.error("❌ 解质押失败:", error.message);
        throw error;
      }
    });
  });

  describe("7. 池子管理", function () {
    it("能停用质押池吗？", async function () {
      if (!lpPoolContract) {
        console.log("⚠️  LpPoolContract 未初始化，跳过测试");
        this.skip();
      }

      console.log("\n🛑 停用质押池...");

      try {
        const tx = await lpPoolContract.activatePool(false);
        const receipt = await tx.wait();
        expect(receipt?.status).to.equal(1);

        const poolInfo = await lpPoolContract.poolInfo();
        expect(poolInfo.isActive).to.be.false;

        console.log("✅ 成功停用池子");
        console.log("  ✓ 结束时间:", new Date(Number(poolInfo.endTime) * 1000).toLocaleString());
      } catch (error: any) {
        console.error("❌ 停用池子失败:", error.message);
        throw error;
      }
    });

    it("能查询池子总体统计信息吗？", async function () {
      if (!lpPoolContract) {
        console.log("⚠️  LpPoolContract 未初始化，跳过测试");
        this.skip();
      }

      console.log("\n📊 池子统计信息:");

      const poolInfo = await lpPoolContract.poolInfo();
      console.log("  状态:", poolInfo.isActive ? "激活" : "停用");
      console.log("  总质押数量:", poolInfo.totalStaked.toString());
      console.log("  总流动性:", poolInfo.totalLiquidity.toString());
      console.log("  分配权重:", poolInfo.poolConfig.allocPoint.toString());
      console.log(
        "  上次奖励时间:",
        new Date(Number(poolInfo.lastRewardTime) * 1000).toLocaleString()
      );
      console.log(
        "  每份额累计奖励:",
        ethers.formatEther(poolInfo.accNextSwapPerShare)
      );
    });
  });

  //-----------------------------------辅助函数---------------------------------------

  /**
   * 创建并初始化交易池
   */
  async function createAndInitializePool(
    tokenA: string,
    tokenB: string,
    decimalsA: number,
    decimalsB: number,
    fee: PoolFee,
    initialPrice: number
  ) {
    const [token0, token1] = sortTokens(tokenA, tokenB);
    console.log("\n🏊 创建交易池:");
    console.log("  Token0:", token0);
    console.log("  Token1:", token1);
    console.log("  Fee:", fee);

    // 检查池子是否已存在
    const existingPool = await nextswapFactory.getPool(token0, token1, fee);

    if (existingPool !== ethers.ZeroAddress) {
      console.log("✅ 池子已存在:", existingPool);
      return;
    }

    // 创建池子
    const createTx = await nextswapFactory.createPool(token0, token1, fee);
    await createTx.wait();
    console.log("✅ 池子创建成功");

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
    console.log("✅ 池子价格初始化成功");
  }

  /**
   * 添加流动性并返回 Token ID
   */
  async function addLiquidityAndGetTokenId(
    tokenA: string,
    tokenB: string,
    decimalsA: number,
    decimalsB: number,
    fee: PoolFee,
    price: number,
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
    const deadline = (await ethers.provider.getBlock("latest"))!.timestamp + 3600;
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
    const { tokenId: returnedTokenId } =
      await npmContract.mint.staticCall(mintParams);

    // 实际执行铸造
    const tx = await npmContract.mint(mintParams);
    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
      throw new Error("铸造 NFT 失败");
    }

    const tokenId = Number(returnedTokenId);
    return tokenId;
  }
});
