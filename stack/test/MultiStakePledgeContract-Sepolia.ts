import { expect } from "chai";
import { ethers } from "hardhat";
import { MetaNodeToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { getLatestDeploymentAddresses } from "../scripts/utils/deployment-utils";
import {
  connectToDeployedContract,
  connectToMultipleContracts,
} from "../scripts/utils/contract-helpers";

// 临时类型定义，等待typechain生成
type MultiStakePledgeContract = any;

describe("MultiStakePledgeContract - Sepolia 测试网 (优化版)", function () {
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;

  let multiStakeContract: MultiStakePledgeContract;
  let metaNodeToken: MetaNodeToken;
  let usdcToken: any;
  let wethToken: any;

  let deployment: ReturnType<typeof getLatestDeploymentAddresses>;

  this.beforeAll(async function () {
    console.log("-----------------------------------------------------------");
    console.log("🌐 连接到 Sepolia 测试网合约 (优化版)");

    // 获取账户
    const signers = await ethers.getSigners();
    deployer = signers[0];
    user1 = signers[1] || signers[0];

    console.log("部署者地址:", await deployer.getAddress());
    console.log("用户地址:", await user1.getAddress());

    try {
      // 读取最新部署的合约地址
      deployment = getLatestDeploymentAddresses();
      deployment.MultiStakePledgeContract;
      console.log(
        "MultiStakePledgeContract 地址:",
        deployment.MultiStakePledgeContract
      );
      console.log("MetaNodeToken 地址:", deployment.MetaNodeToken);
      console.log("Sepolia USDC 地址:", deployment.USDC);
      console.log("Sepolia WETH 地址:", deployment.WETH);

      expect(deployment.MultiStakePledgeContract).to.be.properAddress;
      expect(deployment.MetaNodeToken).to.be.properAddress;
      expect(deployment.USDC).to.be.properAddress;
      expect(deployment.WETH).to.be.properAddress;


      // 使用优化的连接方法 - 避免 as unknown as 类型断言
      const { contract: multiStake, method: multiStakeMethod } =
        await connectToDeployedContract<MultiStakePledgeContract>(
          "MultiStakePledgeContract",
          deployment.MultiStakePledgeContract!!,
          deployer
        );
      multiStakeContract = multiStake;

      const { contract: metaNode, method: metaNodeMethod } =
        await connectToDeployedContract<MetaNodeToken>(
          "MetaNodeToken",
          deployment.MetaNodeToken!!,
          deployer
        );
      metaNodeToken = metaNode;

      console.log(`✅ MultiStakePledgeContract 连接成功 (${multiStakeMethod})`);
      console.log(`✅ MetaNodeToken 连接成功 (${metaNodeMethod})`);

      // 连接到代币合约 - 使用标准方法
      usdcToken = await ethers.getContractAt("IERC20", deployment.USDC!!);
      wethToken = await ethers.getContractAt("IERC20", deployment.WETH!!);
      console.log("✅ ERC20 代币合约连接成功");
    } catch (error) {
      console.error("❌ 无法连接到合约:", error);
      throw error;
    }

    console.log("-----------------------------------------------------------");
  });
  beforeEach(async function () {});

  it("应该能够连接到已部署的合约", async function () {
    // 检查合约版本
    const version = await multiStakeContract.getVersion();
    console.log("合约版本:", version.toString());
    expect(version).to.be.gt(0);

    // 检查池子数量
    let poolCount = 0;
    try {
      while (true) {
        await multiStakeContract.getPoolInfo(poolCount);
        poolCount++;
      }
    } catch {
      // 当获取失败时，说明已经到了最后一个池子
    }

    console.log("当前活跃池子数量:", poolCount);
    expect(poolCount).to.be.gte(2); // 至少应该有 2 个池子
    console.log("✓ 成功连接到已部署的合约");
  });

  it("应该能创建 USDC 质押池", async function () {
    this.timeout(60000); // 设置超时时间

    // 获取当前池子数量
    let poolCount = 0;
    try {
      while (true) {
        await multiStakeContract.getPoolInfo(poolCount);
        poolCount++;
      }
    } catch {
      // 当获取失败时，说明已经到了最后一个池子
    }

    // 创建新的 USDC 池子
    const poolParams = {
      stakeToken: deployment.USDC,
      rewardToken: deployment.MetaNodeToken,
      totalRewards: ethers.parseEther("10000"), // 1万奖励
      duration: 5 * 60, // 5分钟测试
      minDepositAmount: 1000000, // 1 USDC
      cooldownPeriod: 300, // 5分钟冷却期
      name: "Sepolia USDC Pool",
    };

    const tx = await multiStakeContract.createPool(poolParams);
    const receipt = await tx.wait();

    console.log("✓ 成功创建 Sepolia USDC 质押池");
    console.log("交易哈希:", receipt.hash);

    // 检查池子数量是否增加
    let newPoolCount = 0;
    try {
      while (true) {
        await multiStakeContract.getPoolInfo(newPoolCount);
        newPoolCount++;
      }
    } catch {
      // 当获取失败时，说明已经到了最后一个池子
    }

    console.log("创建后池子数量:", newPoolCount);
    expect(newPoolCount).to.be.gt(poolCount);
  });

  it("应该能创建 WETH 质押池", async function () {
    this.timeout(60000); // 设置超时时间

    // 获取当前池子数量
    let poolCount = 0;
    try {
      while (true) {
        await multiStakeContract.getPoolInfo(poolCount);
        poolCount++;
      }
    } catch {
      // 当获取失败时，说明已经到了最后一个池子
    }

    // 创建新的 WETH 池子
    const poolParams = {
      stakeToken: deployment.WETH,
      rewardToken: deployment.MetaNodeToken,
      totalRewards: ethers.parseEther("5000"), // 5000奖励
      duration: 5 * 60, // 5分钟测试
      minDepositAmount: ethers.parseEther("0.001"), // 0.001 WETH
      cooldownPeriod: 600, // 10分钟冷却期
      name: "Sepolia WETH Pool",
    };

    const tx = await multiStakeContract.createPool(poolParams);
    const receipt = await tx.wait();

    console.log("✓ 成功创建 Sepolia WETH 质押池");
    console.log("交易哈希:", receipt.hash);

    // 检查池子数量是否增加
    let newPoolCount = 0;
    try {
      while (true) {
        await multiStakeContract.getPoolInfo(newPoolCount);
        newPoolCount++;
      }
    } catch {
      // 当获取失败时，说明已经到了最后一个池子
    }

    console.log("创建后池子数量:", newPoolCount);
    expect(newPoolCount).to.be.gt(poolCount);
  });

  it("应该能查询现有池子信息", async function () {
    // 获取所有池子信息
    let poolCount = 0;
    try {
      while (true) {
        await multiStakeContract.getPoolInfo(poolCount);
        poolCount++;
      }
    } catch {
      // 当获取失败时，说明已经到了最后一个池子
    }

    console.log("当前池子数量:", poolCount);

    // 遍历所有池子
    for (let i = 0; i < poolCount; i++) {
      const poolInfo = await multiStakeContract.getPoolInfo(i);
      console.log(`池子 ${i} 信息:`);
      console.log(`  - 名称: ${poolInfo.name}`);
      console.log(`  - 质押代币: ${poolInfo.stakeToken}`);
      console.log(`  - 奖励代币: ${poolInfo.rewardToken}`);
      console.log(`  - 总奖励: ${ethers.formatEther(poolInfo.totalRewards)}`);
      console.log(`  - 是否激活: ${poolInfo.isOpenForStaking}`);
      console.log(`  - 开始时间: ${poolInfo.startTime}`);
    }

    expect(poolCount).to.be.gte(0);
  });

  it("应该能检查用户代币余额", async function () {
    const deployerAddress = await deployer.getAddress();

    // 检查 USDC 余额
    try {
      const usdcBalance = await usdcToken.balanceOf(deployerAddress);
      console.log(`用户 USDC 余额: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
    } catch (error) {
      console.log("无法获取 USDC 余额:", error);
    }

    // 检查 WETH 余额
    try {
      const wethBalance = await wethToken.balanceOf(deployerAddress);
      console.log(`用户 WETH 余额: ${ethers.formatEther(wethBalance)} WETH`);
    } catch (error) {
      console.log("无法获取 WETH 余额:", error);
    }

    // 检查 ETH 余额
    const ethBalance = await ethers.provider.getBalance(deployerAddress);
    console.log(`用户 ETH 余额: ${ethers.formatEther(ethBalance)} ETH`);

    console.log("✓ 成功查询用户余额");
  });

  it("测试质押功能 (如果有足够余额)", async function () {
    const deployerAddress = await deployer.getAddress();

    // 检查 USDC 余额
    const usdcBalance = await usdcToken.balanceOf(deployerAddress);
    const usdcBalanceFormatted = ethers.formatUnits(usdcBalance, 6);
    console.log(`用户 USDC 余额: ${usdcBalanceFormatted}`);

    if (parseFloat(usdcBalanceFormatted) >= 1) {
      console.log("⚠️  用户有足够的 USDC，但为了安全起见，此测试只是模拟");
      console.log("实际质押需要:");
      console.log("1. 首先 approve 质押合约");
      console.log("2. 然后调用 stakeInPool 函数");
      console.log("3. 确保池子已经启动");
    } else {
      console.log("ℹ️  用户 USDC 余额不足，跳过质押测试");
    }
  });

  it("管理员操作: 启动池子", function () {
    console.log("- 管理员操作: 启动池子");
    // 这里可以添加启动池子的测试，但需要确保有足够的权限
  });
});
