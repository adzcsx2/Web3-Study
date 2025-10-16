import { ethers } from "hardhat";

async function main() {
  console.log("🔍 检查账户信息...");
  
  const [deployer] = await ethers.getSigners();
  const address = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(address);
  
  console.log("📍 账户地址:", address);
  console.log("💰 账户余额:", ethers.formatEther(balance), "ETH");
  console.log("🌐 网络:", await ethers.provider.getNetwork());
  
  if (balance === 0n) {
    console.log("\n❌ 余额不足！");
    console.log("📋 解决方案:");
    console.log("1. 访问 Sepolia 测试网水龙头:");
    console.log("   - https://sepoliafaucet.com/");
    console.log("   - https://www.alchemy.com/faucets/ethereum-sepolia");
    console.log("   - https://cloud.google.com/application/web3/faucet/ethereum/sepolia");
    console.log("2. 输入你的地址:", address);
    console.log("3. 获取免费的测试 ETH");
    console.log("4. 等待几分钟后重新运行测试");
  } else {
    console.log("✅ 余额充足，可以进行测试!");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});