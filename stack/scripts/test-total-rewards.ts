import { ethers } from "hardhat";
import { getLatestDeploymentAddresses } from "./utils/deployment-utils";

/**
 * 测试 totalRewardsEarned 功能
 * 检查用户的总奖励计算是否正确
 */
async function main() {
  console.log("🔍 测试 totalRewardsEarned 功能");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("测试账户:", deployerAddress);

  // 获取部署的合约地址
  const deployment = getLatestDeploymentAddresses();

  // 连接到合约
  const multiStakeContract = await ethers.getContractAt(
    "MultiStakePledgeContractV2",
    deployment.MultiStakePledgeContract!
  );

  const metaNodeToken = await ethers.getContractAt(
    "MetaNodeToken",
    deployment.MetaNodeToken!
  );

  console.log("✅ 已连接到合约");
  console.log("MultiStakeContract:", deployment.MultiStakePledgeContract);
  console.log("MetaNodeToken:", deployment.MetaNodeToken);
  console.log("=".repeat(60));

  // 获取池子数量
  const poolCounter = await multiStakeContract.poolCounter();
  console.log(`\n📊 总池子数: ${poolCounter}`);

  // 遍历所有池子，检查用户信息
  for (let poolId = 0; poolId < Number(poolCounter); poolId++) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🏊 池子 ${poolId} - 用户信息`);
    console.log(`${"=".repeat(60)}`);

    try {
      // 获取池子信息
      const poolInfo = await multiStakeContract.getPoolInfo(poolId);
      console.log(`池子名称: ${poolInfo.name}`);
      console.log(`是否激活: ${poolInfo.isOpenForStaking}`);
      console.log(`总质押量: ${ethers.formatEther(poolInfo.totalStaked)}`);
      console.log(`总奖励: ${ethers.formatEther(poolInfo.totalRewards)}`);
      console.log(`已发放奖励: ${ethers.formatEther(poolInfo.totalRewardsIssued)}`);
      
      const startTime = Number(poolInfo.startTime);
      const endTime = Number(poolInfo.endTime);
      const now = Math.floor(Date.now() / 1000);
      
      console.log(`开始时间: ${startTime === 0 ? '未开始' : new Date(startTime * 1000).toLocaleString()}`);
      console.log(`结束时间: ${endTime === 0 ? '未设置' : new Date(endTime * 1000).toLocaleString()}`);
      console.log(`当前时间: ${new Date(now * 1000).toLocaleString()}`);

      // 获取用户在该池子的信息
      const userInfo = await multiStakeContract.getUserPoolInfo(
        poolId,
        deployerAddress
      );

      console.log(`\n👤 用户质押信息:`);
      console.log(`  质押余额 (stakedBalance): ${ethers.formatEther(userInfo.stakedBalance)}`);
      console.log(`  待领奖励 (pendingRewards): ${ethers.formatEther(userInfo.pendingRewards)}`);
      console.log(`  总赚取奖励 (totalRewardsEarned): ${ethers.formatEther(userInfo.totalRewardsEarned)}`);
      console.log(`  已领取奖励 (totalRewardsClaimed): ${ethers.formatEther(userInfo.totalRewardsClaimed)}`);
      console.log(`  待解质押请求数: ${userInfo.pendingUnstakeRequests.length}`);

      // 验证计算
      const calculatedTotal = userInfo.totalRewardsClaimed + userInfo.pendingRewards;
      const reported = userInfo.totalRewardsEarned;
      
      console.log(`\n🧮 验证计算:`);
      console.log(`  已领取 + 待领取 = ${ethers.formatEther(calculatedTotal)}`);
      console.log(`  合约返回总奖励 = ${ethers.formatEther(reported)}`);
      
      if (calculatedTotal === reported) {
        console.log(`  ✅ 计算正确！`);
      } else {
        console.log(`  ❌ 计算不匹配！差异: ${ethers.formatEther(reported - calculatedTotal)}`);
      }

      // 如果有质押，显示额外信息
      if (userInfo.stakedBalance > 0n) {
        console.log(`\n📈 质押详情:`);
        
        // 从 mapping 获取详细信息
        const detailInfo = await multiStakeContract.userPoolInfo(poolId, deployerAddress);
        console.log(`  最后质押时间: ${detailInfo.lastStakeTimes > 0 ? new Date(Number(detailInfo.lastStakeTimes) * 1000).toLocaleString() : '无'}`);
        console.log(`  最后领取时间: ${detailInfo.lastClaimTimes > 0 ? new Date(Number(detailInfo.lastClaimTimes) * 1000).toLocaleString() : '无'}`);
        console.log(`  最后解质押时间: ${detailInfo.lastUnstakeTimes > 0 ? new Date(Number(detailInfo.lastUnstakeTimes) * 1000).toLocaleString() : '无'}`);
      }

    } catch (error: any) {
      console.log(`❌ 获取池子 ${poolId} 信息失败: ${error.message}`);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("✅ 测试完成");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 错误:", error);
    process.exit(1);
  });
