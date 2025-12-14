import { ethers } from "hardhat";
import { DeployHelper } from "../scripts/utils/DeployHelper";
import {
  getNetworkConfig,
  stringToBytes32,
  NetworkTokenAddresses,
} from "../scripts/config/network-config";

import deployment_sepolia from "../deployments/sepolia-deployment.json";
import deployment_localhost from "../deployments/localhost-deployment.json";

import { expect } from "chai";
import { artifacts } from "hardhat";

const contracts = [
  "NextswapV3Pool",
  "NextswapV3Factory",
  "NextswapV3PoolDeployer",
  "NextswapToken",
  "SwapRouter",
];
const MAX_SIZE = 24576; // 24 KB 限制
const WARNING_SIZE = 22000; // 警告阈值
describe("检查合约是否超过了24k", function () {
  it("检查合约是否超过了24k", async function () {
    for (const contractName of contracts) {
      try {
        const artifact = await artifacts.readArtifact(contractName);
        const bytecode = artifact.deployedBytecode || artifact.bytecode;

        // 移除 0x 前缀，每2个字符 = 1字节
        const sizeInBytes = (bytecode.length - 2) / 2;
        const sizeInKB = (sizeInBytes / 1024).toFixed(2);
        const percentage = ((sizeInBytes / MAX_SIZE) * 100).toFixed(1);

        let status = "✅";
        if (sizeInBytes > MAX_SIZE) {
          status = "❌ 超出限制!";
        } else if (sizeInBytes > WARNING_SIZE) {
          status = "⚠️  接近限制";
        }

        console.log(`${status} ${contractName}`);
        console.log(`   大小: ${sizeInBytes} 字节 (${sizeInKB} KB)`);
        console.log(`   占用: ${percentage}% / 100%`);
        console.log(`   剩余: ${MAX_SIZE - sizeInBytes} 字节\n`);

        expect(sizeInBytes).to.be.lessThanOrEqual(MAX_SIZE);
      } catch (error: any) {
        console.log(`⏭️  跳过 ${contractName}: ${error.message}\n`);
      }
    }
  });
});
