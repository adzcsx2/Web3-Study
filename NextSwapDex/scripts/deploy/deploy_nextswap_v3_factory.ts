import { ethers } from "hardhat";
import { DeployHelper } from "../utils/DeployHelper";
import { NextswapV3Factory, NextswapV3Pool } from "../../typechain-types";

async function main() {
  const deployHelper = new DeployHelper();
  const [signer] = await ethers.getSigners();
  const ownerAddress = await signer.getAddress();
  console.log("Deploying contracts with the account:", ownerAddress);

  // 部署合约（自动保存）

  const { contract, versionInfo } =
    await deployHelper.deployContract<NextswapV3Factory>("NextswapV3Factory");

  console.log("✅ 部署完成！");
  console.log("📍 地址:", versionInfo.address);

  // 验证合约
  await deployHelper.verifyContract(
    versionInfo.address,
    [],
    "NextswapV3Factory",
    60
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
