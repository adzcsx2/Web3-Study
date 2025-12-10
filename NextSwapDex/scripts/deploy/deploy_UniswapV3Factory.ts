import { ethers } from "hardhat";
import { DeployHelper } from "../utils/DeployHelper";
import { UniswapV3Factory, UniswapV3Pool } from "../../typechain-types";

async function main() {
  const deployHelper = new DeployHelper();
  const [signer] = await ethers.getSigners();
  const ownerAddress = await signer.getAddress();
  console.log("Deploying contracts with the account:", ownerAddress);

  // 部署合约（自动保存）

  const { contract, versionInfo } =
    await deployHelper.deployContract<UniswapV3Factory>("UniswapV3Factory");

  console.log("✅ 部署完成！");
  console.log("📍 地址:", versionInfo.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
