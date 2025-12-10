import { ethers } from "hardhat";
import { DeployHelper } from "./utils/DeployHelper";
import { UniswapV3Factory, UniswapV3Pool } from "../typechain-types";

async function main() {
  const deployHelper = new DeployHelper();
  const [signer] = await ethers.getSigners();
  const ownerAddress = await signer.getAddress();
  console.log("Deploying contracts with the account:", ownerAddress);

  // 部署合约（自动保存）

  await deployTokens(["WETH9"]);
}

async function deployTokens(contracts: string[]) {
  const deployHelper = new DeployHelper();

  // 使用 for...of 循环确保每个部署操作都被正确等待
  for (const contractName of contracts) {
    console.log(`🚀 正在部署 ${contractName}...`);
    const { contract, versionInfo } = await deployHelper.deployContract(
      contractName
    );
    console.log(`✅ ${contractName} 部署完成！`);
    console.log("📍 地址:", versionInfo.address);
    console.log("---");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
