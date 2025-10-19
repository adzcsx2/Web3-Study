// scripts/check-contract-status.ts
import { ethers } from "hardhat";

async function main() {
  console.log("🔍 检查多币种质押合约状态...\n");

  // 合约地址
  const META_NODE_TOKEN_ADDRESS = "0x3747e4d816A8A34b2c9E5CB27a702eCE97Fd3884";
  const MULTI_STAKE_CONTRACT_ADDRESS =
    "0xd740668BCBCE62c9A6C1bC106C6759e3ac835908";
  const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  const SEPOLIA_WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

  try {
    // 连接合约
    const metaNodeToken = await ethers.getContractAt(
      "MetaNodeToken",
      META_NODE_TOKEN_ADDRESS
    );
    const multiStakeContract = await ethers.getContractAt(
      "MultiStakePledgeContract",
      MULTI_STAKE_CONTRACT_ADDRESS
    );
    const usdcToken = await ethers.getContractAt("IERC20", SEPOLIA_USDC);
    const wethToken = await ethers.getContractAt("IERC20", SEPOLIA_WETH);

    console.log("📋 合约基本信息:");
    console.log("================");
    console.log("MetaNodeToken:", META_NODE_TOKEN_ADDRESS);
    console.log("MultiStakePledgeContract:", MULTI_STAKE_CONTRACT_ADDRESS);
    console.log("合约版本:", await multiStakeContract.getVersion());

    // 检查池子数量 - 尝试从 0 开始枚举
    let poolCount = 0;
    try {
      // 尝试获取池子，直到失败为止
      while (true) {
        await multiStakeContract.getPoolInfo(poolCount);
        poolCount++;
      }
    } catch {
      // 当获取失败时，说明已经到了最后一个池子
    }

    console.log("总池子数量:", poolCount);

    console.log("\n🏊 质押池详情:");
    console.log("================");

    // 遍历所有池子
    for (let i = 0; i < poolCount; i++) {
      try {
        const poolInfo = await multiStakeContract.getPoolInfo(i);
        console.log(`\n池子 ${i}:`);
        console.log(`  名称: ${poolInfo.name}`);
        console.log(`  质押代币: ${poolInfo.stakeToken}`);
        console.log(`  奖励代币: ${poolInfo.rewardToken}`);
        console.log(
          `  总奖励: ${ethers.formatEther(poolInfo.totalRewards)} 代币`
        );
        console.log(
          `  最小质押: ${formatTokenAmount(
            poolInfo.minDepositAmount,
            poolInfo.stakeToken
          )} 代币`
        );
        console.log(
          `  冷却期: ${Math.floor(Number(poolInfo.cooldownPeriod) / 60)} 分钟`
        );
        console.log(`  是否激活: ${poolInfo.isActive ? "✅" : "❌"}`);
        console.log(
          `  开始时间: ${
            poolInfo.startTime > 0
              ? new Date(Number(poolInfo.startTime) * 1000).toLocaleString()
              : "未开始"
          }`
        );
      } catch (error) {
        console.log(`❌ 无法获取池子 ${i} 的信息`);
      }
    }

    console.log("\n💰 代币余额信息:");
    console.log("==================");

    // 获取合约代币余额
    const contractMntBalance = await metaNodeToken.balanceOf(
      MULTI_STAKE_CONTRACT_ADDRESS
    );
    console.log(
      `质押合约 MNT 余额: ${ethers.formatEther(contractMntBalance)} MNT`
    );

    // 获取部署者余额
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();

    console.log(`\n部署者 (${deployerAddress}) 余额:`);

    const ethBalance = await ethers.provider.getBalance(deployerAddress);
    console.log(`  ETH: ${ethers.formatEther(ethBalance)} ETH`);

    const mntBalance = await metaNodeToken.balanceOf(deployerAddress);
    console.log(`  MNT: ${ethers.formatEther(mntBalance)} MNT`);

    try {
      const usdcBalance = await usdcToken.balanceOf(deployerAddress);
      console.log(`  USDC: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
    } catch {
      console.log(`  USDC: 无法获取余额`);
    }

    try {
      const wethBalance = await wethToken.balanceOf(deployerAddress);
      console.log(`  WETH: ${ethers.formatEther(wethBalance)} WETH`);
    } catch {
      console.log(`  WETH: 无法获取余额`);
    }

    console.log("\n🔗 有用链接:");
    console.log("=============");
    console.log(
      `区块浏览器 - MetaNodeToken: https://sepolia.etherscan.io/address/${META_NODE_TOKEN_ADDRESS}`
    );
    console.log(
      `区块浏览器 - MultiStake: https://sepolia.etherscan.io/address/${MULTI_STAKE_CONTRACT_ADDRESS}`
    );

    console.log("\n✅ 状态检查完成!");
  } catch (error) {
    console.error("❌ 检查状态失败:", error);
    process.exit(1);
  }
}

// 辅助函数：格式化代币数量
function formatTokenAmount(amount: any, tokenAddress: string): string {
  const addr = tokenAddress.toLowerCase();

  // USDC 有 6 位小数
  if (addr === "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238".toLowerCase()) {
    return ethers.formatUnits(amount, 6);
  }

  // 其他代币默认 18 位小数 (WETH, MNT)
  return ethers.formatEther(amount);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
