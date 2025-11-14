import { ethers } from "hardhat";
import { BeggingContract } from "../typechain-types";
import { DeployHelper } from "./utils/DeployHelper";

async function deployBeggingContract() {
  const startTime = Math.floor(Date.now() / 1000); // 当前时间的时间戳，单位为秒
  const endTime = startTime + 30 * 24 * 60 * 60; // 30天后的时间戳

  //   //-----------------------------------原始部署---------------------------------------
  //   const [signer] = await ethers.getSigners();

  //   const beggingContractFactory = await ethers.getContractFactory(
  //     "BeggingContract"
  //   );

  //   const contract = await beggingContractFactory.deploy(startTime, endTime);
  //   const tx = await contract.waitForDeployment();
  //   const transaction = tx.deploymentTransaction();
  //   if (transaction) {
  //     const receipt = await transaction.wait();
  //     if (receipt == null || receipt.status !== 1) {
  //       throw new Error("合约部署失败");
  //     } else {
  //       console.log(`合约部署成功，地址为: ${contract.target}`);
  //     }
  //   }

  //-----------------------------------使用DeployHelper部署---------------------------------------
  const deployHelper = new DeployHelper();
  const { contract, versionInfo } =
    await deployHelper.deployContract<BeggingContract>("BeggingContract", [
      startTime,
      endTime,
    ]);
  console.log("合约部署成功，地址为: ", versionInfo.address);
}

deployBeggingContract()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
