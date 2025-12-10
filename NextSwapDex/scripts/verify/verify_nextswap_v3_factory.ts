import { ethers } from "hardhat";
import { DeployHelper } from "../utils/DeployHelper";
import { NextswapV3Factory, NextswapV3Pool } from "../../typechain-types";
import deployment from "../../deployments/sepolia-deployment.json";

async function main() {
  const deployHelper = new DeployHelper();
  const [signer] = await ethers.getSigners();
  const ownerAddress = await signer.getAddress();
  console.log("Deploying contracts with the account:", ownerAddress);
  require("../../deployments/sepolia-deployment.json");
  // 部署合约（自动保存）

  await deployHelper.verifyContract(
    deployment.contracts.NextswapV3Factory.proxyAddress,
    [],
    deployment.contracts.NextswapV3Factory.contractName
  );
}

async function verifyTokens(
  tokens: Array<{ address: string; args: any[]; name: string }>
) {
  const deployHelper = new DeployHelper();

  for (const token of tokens) {
    const { address, args, name } = token;
    console.log(`🚀 正在验证 ${name} (${address})...`);

    // ✅ 关键：指定合约路径，避免字节码匹配多个合约
    const contractPath = `contracts/contract/mock/${name}.sol:${name}`;

    await deployHelper.verifyContract(address, args, contractPath);
    console.log(`✅ ${name} 验证完成！args: ${JSON.stringify(args)}`);
    console.log("---");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
