import { ethers } from "hardhat";
import { getDeploymentInfo } from "./utils/deployment-utils";
import { MetaNodeToken, MultiStakePledgeContractV2 } from "../typechain-types";
const deploymentInfo = getDeploymentInfo();

interface UsdcPoolParams {
  stakeToken: string;
  rewardToken: string;
  totalRewards: bigint;
  duration: number;
  minDepositAmount: bigint;
  cooldownPeriod: number;
  name: string;
}

interface StakeToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
}
/**
 *
 * @param stakeToken  质押代币
 * @param rewardAccount  奖励数量 单位 ether
 * @param durationSeconds 池子活动持续时间 单位秒
 * @returns 返回创建的池子ID
 */
async function createPool(
  stakeToken: StakeToken,
  rewardAccount: string
): Promise<bigint> {
  const contract = (await ethers.getContractAt(
    deploymentInfo.contracts.MultiStakePledgeContractV2.contractName,
    deploymentInfo.contracts.MultiStakePledgeContractV2.address
  )) as MultiStakePledgeContractV2;

  const version = await contract.getVersion();
  console.log(`当前合约版本: V${version}`);

  const metaNodeToken = deploymentInfo.contracts.MetaNodeToken;

  const metaNodeTokenContract = (await ethers.getContractAt(
    metaNodeToken.contractName,
    metaNodeToken.address
  )) as MetaNodeToken;

  let balance = await metaNodeTokenContract.balanceOf(contract.target);

  console.log(
    "合约中的 MetaNodeToken 余额:",
    ethers.formatUnits(balance, metaNodeToken.decimals),
    metaNodeToken.symbol
  );
  //开启池子
  // 100w个token奖励

  const rewardTotal = BigInt(ethers.parseEther(rewardAccount));

  const poolDuration = 60 * 24 * 60 * 60; // 60天（秒）
  const cooldownPeriod = 1 * 60; // 1分钟（秒）
  //如果是USDC，最小质押1个USDC,如果是WETH,最小质押0.01个WETH
  let minDeposit = 0n; // 1 USDC (6位小数)
  if (stakeToken.symbol === "WETH") {
    console.log("质押代币为WETH，设置最小质押为0.01 WETH");
    minDeposit = BigInt(ethers.parseEther("0.01"));
  } else if (stakeToken.symbol === "USDC") {
    console.log("质押代币为USDC，设置最小质押为1 USDC");
    minDeposit = BigInt(ethers.parseUnits("1", stakeToken.decimals));
  }

  console.log("\n📋 创建池子参数:");
  console.log("  质押代币:", stakeToken.symbol, stakeToken.address);
  console.log(
    "  奖励代币: MNT",
    deploymentInfo.contracts.MetaNodeToken.address
  );
  console.log("  总奖励:", ethers.formatEther(rewardTotal), "MNT");
  console.log("  持续时间:", poolDuration / (24 * 60 * 60), "天");
  console.log(
    "  最小质押:",
    ethers.formatUnits(minDeposit, stakeToken.decimals),
    stakeToken.symbol
  );
  console.log("  冷却期:", cooldownPeriod / 60, "分钟");
  console.log("");

  const tx = await contract.createPool({
    stakeToken: stakeToken.address,
    rewardToken: deploymentInfo.contracts.MetaNodeToken.address,
    totalRewards: rewardTotal,
    minDepositAmount: minDeposit,
    cooldownPeriod: cooldownPeriod, // ✅ 修正：使用实际的冷却期
    name: `${stakeToken.symbol} ${ethers.formatEther(rewardTotal)}MNT Pool`,
  } as UsdcPoolParams);
  if (tx == null) {
    throw new Error("交易创建失败");
  } else if (tx != null) {
    console.log("⏳ 交易已创建，等待确认...");
    console.log("   交易哈希:", tx.hash);
  }

  //判断tx状态
  console.log("⏳ 等待交易确认...");
  const receipt = await tx.wait();

  if (receipt == null) {
    throw new Error("❌ 交易失败，未获取到交易回执");
  } else if (receipt.status === 1) {
    console.log("✅ 池子创建成功！");
    console.log("   区块号:", receipt.blockNumber);
    console.log("   Gas 使用:", receipt.gasUsed.toString());

    //从receipt获取poolId

    // 获取 PoolCreated 事件
    const poolCounter = await contract.poolCounter();
    const newPoolId = poolCounter - BigInt(1);
    console.log("   新池子 ID:", newPoolId.toString());

    return newPoolId;
  } else {
    throw new Error("❌ 池子创建失败，交易状态异常");
  }
}

async function showCurrentPools() {
  const contract = (await ethers.getContractAt(
    deploymentInfo.contracts.MultiStakePledgeContractV2.contractName,
    deploymentInfo.contracts.MultiStakePledgeContractV2.address
  )) as MultiStakePledgeContractV2;

  const poolsCount = await contract.poolCounter();
  console.log(`当前池子数量: ${poolsCount}`);

  const poolAvailable: any[] = [];

  for (let i = 0; i < poolsCount; i++) {
    const poolInfo = await contract.getPoolInfo(i);
    console.log(`池子ID: ${i}, 信息:`, poolInfo);
    //如果池子是可用的: 当前时间小于结束时间
    if (poolInfo.endTime > Math.floor(Date.now() / 1000)) {
      poolAvailable.push(poolInfo);
    }
  }

  for (let i = 0; i < poolAvailable.length; i++) {
    //显示可用池子id和结束时间
    console.log(
      `可用池子ID: ${i}, 结束时间: ${new Date(
        poolAvailable[i].endTime * 1000
      ).toLocaleString()}`
    );
  }
}
//启动最后一个池子
async function startFinalPool(poolId: bigint, durationSeconds: number) {
  const contract = (await ethers.getContractAt(
    deploymentInfo.contracts.MultiStakePledgeContractV2.contractName,
    deploymentInfo.contracts.MultiStakePledgeContractV2.address
  )) as MultiStakePledgeContractV2;
  try {
    const tx = await contract.startPool(poolId, durationSeconds);
    const receipt = await tx.wait();

    if (!receipt) {
      throw new Error("交易失败，未获取到交易回执");
    } else if (receipt.status === 1) {
      console.log("✅ 池子启动成功");
    } else {
      console.log("池子启动失败");
    }
  } catch (error: any) {
    if (error.data) {
      const contractError = contract.interface.parseError(error.data);
      console.log("❌ 合约错误:", contractError?.name);
    }
    console.error("启动池子失败:", error.message);
    return;
  }
}

async function main() {
  const tokenAddress = deploymentInfo.tokens.WETH; // USDC
  const rewardAccount = 1 * 1000 * 1000; // 100w个token奖励
  const durationSeconds = 60 * 24 * 60 * 60; // 60天

  const poolId = await createPool(tokenAddress, rewardAccount.toString());
  console.log("创建的池子ID:", poolId);
  await startFinalPool(poolId, durationSeconds);
}

main()
  .then(() => {
    console.log("Pool created successfully");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
