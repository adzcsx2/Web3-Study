import { artifacts } from "hardhat";
import fs from "fs";

async function main() {
  console.log("📊 检查合约大小...\n");

  const contracts = [
    "NextswapV3Pool",
    "NextswapV3Factory",
    "NextswapV3PoolDeployer",
    "NextswapToken",
    "SwapRouter",
  ];

  const MAX_SIZE = 24576; // 24 KB 限制
  const WARNING_SIZE = 22000; // 警告阈值

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
    } catch (error: any) {
      console.log(`⏭️  跳过 ${contractName}: ${error.message}\n`);
    }
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📏 EIP-170 限制: ${MAX_SIZE} 字节 (24 KB)`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
