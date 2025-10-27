import { ethers } from "hardhat";
import {
  getDeploymentInfo,
  getLatestDeploymentAddresses,
  saveDeploymentInfo,
} from "./utils/deployment-utils";
import { MultiStakePledgeContractV2 } from "../typechain-types";

async function main() {
  const info = getDeploymentInfo();
  console.log("🚀 部署多币种质押合约到 Sepolia 网络 v2...\n", info);
  const latestAddresses = getLatestDeploymentAddresses();
  console.log("🔍 最新部署地址:", latestAddresses);
  //部署实现合约V2
  const v2Factory = await ethers.getContractFactory(
    "MultiStakePledgeContractV2"
  );
  const v2Contract = await v2Factory.deploy();
  await v2Contract.waitForDeployment();
  console.log(
    "✅ MultiStakePledgeContractV2 部署成功，地址:",
    v2Contract.target
  );

  //升级代理合约到V2
  const proxyAddress = latestAddresses.MultiStakePledgeContract;
  if (!proxyAddress) {
    throw new Error("未找到 MultiStakePledgeContract 的部署地址");
  }
  const proxyContract = await ethers.getContractAt(
    "MultiStakePledgeContract",
    proxyAddress
  );

  const tx = await proxyContract.upgradeToAndCall(v2Contract.target, "0x");
  console.log("⏳ 等待升级交易确认...");
  const receipt = await tx.wait();
  console.log(
    "✅ MultiStakePledgeContract 升级到 V2 成功，交易哈希:",
    receipt?.hash
  );

  // 等待一下让区块链状态更新
  console.log("⏳ 等待区块链状态更新...");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  //验证升级结果
  console.log("🔍 验证升级结果...");
  const _v2Contract = (await ethers.getContractAt(
    "MultiStakePledgeContractV2",
    proxyAddress
  )) as MultiStakePledgeContractV2;

//   //获取MetaNodeToken地址以初始化合约
//   const metaNodeTokenAddress = latestAddresses.MetaNodeToken;
//   if (!metaNodeTokenAddress) {
//     throw new Error("未找到 MetaNodeToken 的部署地址");
//   }

//   //调用初始化函数
//   await _v2Contract.initialize(metaNodeTokenAddress);

  try {
    const version = await _v2Contract.getVersion();
    console.log("✅ MultiStakePledgeContract 当前版本:", version.toString());
  } catch (error) {
    console.warn("⚠️ 无法获取版本号，但升级可能已成功:", error);
  }

  //保存部署信息
  console.log("\n💾 保存最新部署信息...");
  await saveDeploymentInfo(
    "MultiStakePledgeContractV2",
    proxyAddress,
    "sepolia",
    {
      transactionHash: receipt?.hash || "",
      blockNumber: receipt?.blockNumber || 0,
    }
  );
  console.log("✅ 部署信息已保存");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
