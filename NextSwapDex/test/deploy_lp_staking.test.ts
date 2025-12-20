import { ethers } from "hardhat";
import { DeployHelper } from "../scripts/utils/DeployHelper";
import {
  getNetworkConfig,
  NetworkTokenAddresses,
} from "../scripts/config/network-config";
import * as fs from "fs";
import * as path from "path";

import { expect } from "chai";
import { LpPoolManager } from "../typechain-types";

describe("Deploy LP Staking System", function () {
  this.timeout(600000); // 设置超时时间为 10 分钟
  let deployHelper: DeployHelper;
  let config: NetworkTokenAddresses;
  let deployment: any;

  const NextswapTokenName = "NextswapToken";
  const NextswapTimelockName = "NextswapTimelock";
  const LiquidityMiningRewardName = "LiquidityMiningReward";
  const LpPoolManagerName = "LpPoolManager";

  beforeEach(async () => {
    deployHelper = new DeployHelper();
    const chainId = (await ethers.provider.getNetwork()).chainId;
    config = getNetworkConfig(Number(chainId));

    // 动态加载 deployment 文件
    const deploymentFileName =
      Number(chainId) === 11155111
        ? "sepolia-deployment.json"
        : "localhost-deployment.json";
    const deploymentPath = path.join(
      __dirname,
      "..",
      "deployments",
      deploymentFileName
    );

    if (fs.existsSync(deploymentPath)) {
      deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
    } else {
      console.log(`⚠️  警告: ${deploymentFileName} 文件不存在，将使用空配置`);
      deployment = { contracts: {} };
    }
  });

  afterEach(async function () {
    if (this.currentTest?.state !== "passed") return;
    await new Promise((resolve) => setTimeout(resolve, 500)); // 暂停 500ms
  });

  it("应该按顺序一次性部署所有 LP 质押合约", async function () {
    console.log("\n🚀 开始部署 LP 质押系统合约...\n");

    // 检查必要的依赖合约
    console.log("📋 检查依赖合约...");
    if (!deployment.contracts?.NonfungiblePositionManager?.proxyAddress) {
      throw new Error(
        "❌ 未找到 NonfungiblePositionManager，请先部署 DEX 核心合约"
      );
    }
    const npmAddress =
      deployment.contracts.NonfungiblePositionManager.proxyAddress;
    console.log("✅ NonfungiblePositionManager:", npmAddress);

    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log("🔑 部署账户:", deployerAddress);
    console.log("━".repeat(60));

    // 1. 先部署 NextswapTimelock（必须先部署，其他合约需要这个地址）
    console.log("\n📦 [1/4] 部署 NextswapTimelock...");
    const minDelay = 2 * 24 * 60 * 60; // 2 天
    const proposers = [deployerAddress];
    const executors = [deployerAddress];
    const admin = deployerAddress;

    const { contract: timeLockBase, versionInfo: timeLockVersionInfo } =
      await deployHelper.deployContract(NextswapTimelockName, [
        minDelay,
        proposers,
        executors,
        admin,
      ]);
    const timeLock = timeLockBase as any; // 转换为正确类型
    console.log("✅ NextswapTimelock 部署完成！");
    console.log("📍 地址:", timeLockVersionInfo.address);
    console.log("⏰ 最小延迟:", minDelay / 86400, "天");
    console.log("⛽ Gas used:", timeLockVersionInfo.gasUsed);
    expect(timeLockVersionInfo.address).to.be.a("string").that.is.not.empty;

    // 更新 deployment 对象
    if (!deployment.contracts) deployment.contracts = {};
    if (!deployment.contracts.NextswapTimelock)
      deployment.contracts.NextswapTimelock = {};
    deployment.contracts.NextswapTimelock.proxyAddress =
      timeLockVersionInfo.address;

    // 2. 部署 NextswapToken（使用 NextswapTimelock 地址）
    console.log("\n📦 [2/4] 部署 NextswapToken...");
    console.log("   使用 NextswapTimelock 地址:", timeLockVersionInfo.address);
    const { contract: nextswapTokenBase, versionInfo: tokenVersionInfo } =
      await deployHelper.deployContract(NextswapTokenName, [
        timeLockVersionInfo.address, // ✅ 使用 NextswapTimelock 地址而非部署者地址
      ]);
    const nextswapToken = nextswapTokenBase as any; // 转换为正确类型
    console.log("✅ NextswapToken 部署完成！");
    console.log("📍 地址:", tokenVersionInfo.address);
    console.log("⛽ Gas used:", tokenVersionInfo.gasUsed);
    expect(tokenVersionInfo.address).to.be.a("string").that.is.not.empty;

    // 更新 deployment 对象
    if (!deployment.contracts.NextswapToken)
      deployment.contracts.NextswapToken = {};
    deployment.contracts.NextswapToken.proxyAddress = tokenVersionInfo.address;

    // 3. 部署 LiquidityMiningReward
    console.log("\n📦 [3/4] 部署 LiquidityMiningReward...");

    // 获取最新区块时间
    const latestBlock = await ethers.provider.getBlock("latest");
    const currentBlockTime = latestBlock!.timestamp;
    const startTime = currentBlockTime + 10; // 当前区块时间 + 10秒（立即开始，方便测试）

    console.log("   配置参数:");
    console.log("   - NextswapToken:", tokenVersionInfo.address);
    console.log("   - PositionManager:", npmAddress);
    console.log(
      "   - 当前区块时间:",
      new Date(currentBlockTime * 1000).toLocaleString()
    );
    console.log(
      "   - 开始时间（约10秒后）:",
      new Date(startTime * 1000).toLocaleString()
    );
    console.log("   - PositionManager:", npmAddress);
    console.log(
      "   - 当前区块时间:",
      new Date(currentBlockTime * 1000).toLocaleString()
    );
    console.log("   - 开始时间:", new Date(startTime * 1000).toLocaleString());

    const {
      contract: liquidityMiningRewardBase,
      versionInfo: rewardVersionInfo,
    } = await deployHelper.deployContract(LiquidityMiningRewardName, [
      tokenVersionInfo.address,
      npmAddress,
      startTime,
    ]);
    const liquidityMiningReward = liquidityMiningRewardBase as any; // 转换为正确类型
    console.log("✅ LiquidityMiningReward 部署完成！");
    console.log("📍 地址:", rewardVersionInfo.address);
    console.log("⛽ Gas used:", rewardVersionInfo.gasUsed);
    expect(rewardVersionInfo.address).to.be.a("string").that.is.not.empty;

    // 初始化 LiquidityMiningReward
    console.log("\n🔧 初始化 LiquidityMiningReward...");
    const initTx = await liquidityMiningReward.initialize(
      deployerAddress, // ecosystemFundAddress
      timeLockVersionInfo.address, // timelock
      deployerAddress // admin
    );
    await initTx.wait();
    console.log("✅ 初始化完成");

    // 更新 deployment 对象
    if (!deployment.contracts.LiquidityMiningReward)
      deployment.contracts.LiquidityMiningReward = {};
    deployment.contracts.LiquidityMiningReward.proxyAddress =
      rewardVersionInfo.address;

    // 转移奖励代币到 LiquidityMiningReward
    console.log("\n💰 转移奖励代币到 LiquidityMiningReward...");
    const rewardAmount = ethers.parseEther("500000000"); // 5亿代币（流动性挖矿总量）
    const transferTx = await nextswapToken.transfer(
      rewardVersionInfo.address,
      rewardAmount
    );
    await transferTx.wait();
    console.log(
      "✅ 已转移",
      ethers.formatEther(rewardAmount),
      "NST 作为奖励池"
    );
    console.log(
      "   理论每日释放约:",
      Math.floor(500000000 / 1461).toLocaleString(),
      "NST"
    );

    // 4. 部署 LpPoolManager
    console.log("\n📦 [4/4] 部署 LpPoolManager...");
    console.log("   构造参数:");
    console.log("   - LiquidityMiningReward:", rewardVersionInfo.address);
    console.log("   - PositionManager:", npmAddress);

    const { contract: lpPoolManagerBase, versionInfo: managerVersionInfo } =
      await deployHelper.deployContract(LpPoolManagerName, [
        rewardVersionInfo.address,
        npmAddress,
      ]);
    const lpPoolManager = lpPoolManagerBase as LpPoolManager; // 转换为正确类型
    console.log("✅ LpPoolManager 部署完成！");
    console.log("📍 地址:", managerVersionInfo.address);
    console.log("⛽ Gas used:", managerVersionInfo.gasUsed);
    expect(managerVersionInfo.address).to.be.a("string").that.is.not.empty;

    // 更新 deployment 对象
    if (!deployment.contracts.LpPoolManager)
      deployment.contracts.LpPoolManager = {};
    deployment.contracts.LpPoolManager.proxyAddress =
      managerVersionInfo.address;

    // 授予 TimeLock 角色
    console.log("\n🔐 配置权限...");
    const timelockRole = ethers.id("TIMELOCK_ROLE");
    const grantRoleTx = await lpPoolManager.grantRole(
      timelockRole,
      timeLockVersionInfo.address
    );
    await grantRoleTx.wait();
    console.log("✅ 已授予 TimeLock 管理权限");

    // 授予 LpPoolManager 对 LiquidityMiningReward 的 TIMELOCK_ROLE 权限
    // 这样 LpPoolManager 可以调用 addAuthorizedPool
    const grantRewardRoleTx = await liquidityMiningReward.grantRole(
      timelockRole,
      managerVersionInfo.address
    );
    await grantRewardRoleTx.wait();
    console.log("✅ 已授予 LpPoolManager 对 LiquidityMiningReward 的管理权限");

    // 创建测试质押池（可选）
    console.log("\n📦 [额外] 创建测试质押池 (USDC-DAI)...");
    try {
      // 获取 USDC 和 DAI 地址
      const usdcAddress = config.USDC;
      const daiAddress = config.DAI;

      if (!usdcAddress || !daiAddress) {
        console.log("⚠️  未找到 USDC 或 DAI 地址，跳过创建测试池");
      } else {
        // 排序代币地址
        const [token0, token1] =
          usdcAddress < daiAddress
            ? [usdcAddress, daiAddress]
            : [daiAddress, usdcAddress];

        const poolConfig = {
          poolId: 0,
          poolAddress: ethers.ZeroAddress,
          tokenA: token0,
          tokenB: token1,
          fee: 500, // 0.05%
          allocPoint: 100,
        };

        console.log("   池配置:");
        console.log("   - Token0:", token0);
        console.log("   - Token1:", token1);
        console.log("   - Fee: 500 (0.05%)");
        console.log("   - Alloc Point: 100");

        const addPoolTx = await lpPoolManager.addLpPool(poolConfig);
        const receipt = await addPoolTx.wait();

        console.log("✅ 测试池创建成功！");
        console.log("⛽ Gas used:", receipt?.gasUsed.toString());

        // 获取创建的池地址
        const poolsCount = await lpPoolManager.getPoolsCount();
        const poolData = await lpPoolManager.lpPools(Number(poolsCount) - 1);

        console.log("   Pool ID:", poolsCount.toString());
        console.log("   Pool Contract:", poolData.poolAddress);

        // 激活池子
        const lpPoolContract = await ethers.getContractAt(
          "LpPoolContract",
          poolData.poolAddress
        );
        const activateTx = await lpPoolContract.activatePool(true);
        await activateTx.wait();

        console.log("✅ 池子已激活");
      }
    } catch (error: any) {
      console.log("⚠️  创建测试池失败:", error.message);
      console.log("   这不影响主要合约的部署");
    }

    // 部署摘要
    console.log("\n🎉 所有合约部署完成！");
    console.log("\n📋 部署摘要:");
    console.log("━".repeat(60));
    console.log("NextswapToken:          ", tokenVersionInfo.address);
    console.log("NextswapTimelock:       ", timeLockVersionInfo.address);
    console.log("LiquidityMiningReward:  ", rewardVersionInfo.address);
    console.log("LpPoolManager:          ", managerVersionInfo.address);
    console.log("━".repeat(60));

    console.log("\n💡 下一步:");
    console.log("   1. 运行质押测试:");
    console.log(
      "      npx hardhat test test/lp_staking.test.ts --network localhost"
    );
    console.log("   2. 创建更多质押池:");
    console.log("      使用 LpPoolManager.addLpPool()");
    console.log("   3. 激活质押池:");
    console.log("      使用 LpPoolContract.activatePool(true)");

    console.log("\n📝 重要提示:");
    console.log(
      "   - ✅ 奖励代币已充值:",
      ethers.formatEther(rewardAmount),
      "NST"
    );
    console.log("   - ✅ TimeLock 权限已配置");
    console.log("   - ⚠️  池子创建后需要手动激活才能开始质押");
    console.log("━".repeat(60) + "\n");
  });

  it("应该能验证 NextswapToken", async function () {
    if (!deployment.contracts?.NextswapToken?.proxyAddress) {
      console.log("❌ NextswapToken 未部署，跳过验证");
      this.skip();
    }

    const [deployer] = await ethers.getSigners();
    const isSuccess = await deployHelper.verifyContract(
      NextswapTokenName,
      deployment.contracts.NextswapToken.proxyAddress,
      [await deployer.getAddress()]
    );
    expect(isSuccess).to.be.true;
    console.log("✅ 测试通过：NextswapToken 验证流程完成！");
  });

  it("应该能验证 NextswapTimelock", async function () {
    if (!deployment.contracts?.NextswapTimelock?.proxyAddress) {
      console.log("❌ NextswapTimelock 未部署，跳过验证");
      this.skip();
    }

    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    const minDelay = 2 * 24 * 60 * 60;

    const isSuccess = await deployHelper.verifyContract(
      NextswapTimelockName,
      deployment.contracts.NextswapTimelock.proxyAddress,
      [minDelay, [deployerAddress], [deployerAddress], deployerAddress]
    );
    expect(isSuccess).to.be.true;
    console.log("✅ 测试通过：NextswapTimelock 验证流程完成！");
  });

  it("应该能验证 LiquidityMiningReward", async function () {
    if (!deployment.contracts?.LiquidityMiningReward?.proxyAddress) {
      console.log("❌ LiquidityMiningReward 未部署，跳过验证");
      this.skip();
    }

    const tokenAddress = deployment.contracts.NextswapToken.proxyAddress;
    const npmAddress =
      deployment.contracts.NonfungiblePositionManager.proxyAddress;

    // 注意：这里的时间参数可能需要根据实际部署时的值调整
    const startTime = Math.floor(Date.now() / 1000) + 60;

    console.log("⚠️  注意：时间参数可能与部署时不同，验证可能失败");
    console.log("   如需精确验证，请从部署记录中获取时间参数");

    const isSuccess = await deployHelper.verifyContract(
      LiquidityMiningRewardName,
      deployment.contracts.LiquidityMiningReward.proxyAddress,
      [tokenAddress, npmAddress, startTime]
    );
    expect(isSuccess).to.be.true;
    console.log("✅ 测试通过：LiquidityMiningReward 验证流程完成！");
  });

  it("应该能验证 LpPoolManager", async function () {
    if (!deployment.contracts?.LpPoolManager?.proxyAddress) {
      console.log("❌ LpPoolManager 未部署，跳过验证");
      this.skip();
    }

    const rewardAddress =
      deployment.contracts.LiquidityMiningReward.proxyAddress;
    const npmAddress =
      deployment.contracts.NonfungiblePositionManager.proxyAddress;

    const isSuccess = await deployHelper.verifyContract(
      LpPoolManagerName,
      deployment.contracts.LpPoolManager.proxyAddress,
      [rewardAddress, npmAddress]
    );
    expect(isSuccess).to.be.true;
    console.log("✅ 测试通过：LpPoolManager 验证流程完成！");
  });
});
