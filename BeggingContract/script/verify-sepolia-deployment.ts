import { ethers } from "hardhat";
import { BeggingContract } from "../typechain-types";
import {
  MockERC20,
  MockERC721,
  MockERC1155,
} from "../typechain-types";

async function main() {
  console.log("🔍 Sepolia部署验证脚本");
  console.log("=========================");

  try {
    // 获取网络信息
    const network = await ethers.provider.getNetwork();
    console.log(`🌐 当前网络: ${network.name} (Chain ID: ${network.chainId})`);

    // 获取部署账户
    const [deployer] = await ethers.getSigners();
    console.log(`👛 部署账户: ${deployer.address}`);

    const balance = await deployer.provider.getBalance(deployer.address);
    console.log(`💰 账户余额: ${ethers.formatEther(balance)} ETH`);

    // 部署合约
    console.log("\n📦 开始部署合约...");

    // 1. 部署 MockERC20
    console.log("🪙 部署 MockERC20...");
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockERC20 = await MockERC20Factory.deploy("Sepolia Test Token", "STT");
    await mockERC20.waitForDeployment();
    const mockERC20Address = await mockERC20.getAddress();
    console.log(`✅ MockERC20: ${mockERC20Address}`);

    // 2. 部署 MockERC721
    console.log("🖼️ 部署 MockERC721...");
    const MockERC721Factory = await ethers.getContractFactory("MockERC721");
    const mockERC721 = await MockERC721Factory.deploy("Sepolia Test NFT", "STN");
    await mockERC721.waitForDeployment();
    const mockERC721Address = await mockERC721.getAddress();
    console.log(`✅ MockERC721: ${mockERC721Address}`);

    // 3. 部署 MockERC1155
    console.log("🎯 部署 MockERC1155...");
    const MockERC1155Factory = await ethers.getContractFactory("MockERC1155");
    const mockERC1155 = await MockERC1155Factory.deploy("https://sepolia-test-nft.com/");
    await mockERC1155.waitForDeployment();
    const mockERC1155Address = await mockERC1155.getAddress();
    console.log(`✅ MockERC1155: ${mockERC1155Address}`);

    // 4. 部署 BeggingContract
    console.log("💝 部署 BeggingContract...");
    const currentTime = Math.floor(Date.now() / 1000);
    const startTime = currentTime;
    const endTime = currentTime + 7 * 24 * 3600; // 7天后结束

    const BeggingContractFactory = await ethers.getContractFactory("BeggingContract");
    const beggingContract = await BeggingContractFactory.deploy(startTime, endTime);
    await beggingContract.waitForDeployment();
    const contractAddress = await beggingContract.getAddress();
    console.log(`✅ BeggingContract: ${contractAddress}`);

    // 验证合约
    console.log("\n🔍 验证合约配置...");

    // 验证BeggingContract配置
    const owner = await beggingContract.owner();
    const contractStartTime = await beggingContract.startTime();
    const contractEndTime = await beggingContract.endTime();

    console.log(`👤 合约Owner: ${owner}`);
    console.log(`📅 开始时间: ${new Date(Number(contractStartTime) * 1000).toLocaleString()}`);
    console.log(`📅 结束时间: ${new Date(Number(contractEndTime) * 1000).toLocaleString()}`);
    console.log(`⏰ 捐赠期限: ${((Number(contractEndTime) - Number(contractStartTime)) / 3600).toFixed(1)} 小时`);

    // 验证排行榜初始化
    const topDonators = await beggingContract.getTopDonators();
    console.log(`🏆 排行榜初始化: ${topDonators.length} 个位置`);

    // 基本功能测试
    console.log("\n🧪 执行基本功能测试...");

    // 测试ETH捐赠
    const testAmount = ethers.parseEther("0.001");
    console.log(`💰 测试ETH捐赠: ${ethers.formatEther(testAmount)} ETH`);

    const donateTx = await beggingContract.donateETH({ value: testAmount });
    const donateReceipt = await donateTx.wait();
    console.log(`📊 捐赠交易: ${donateTx.hash}`);
    console.log(`⛽ Gas使用: ${donateReceipt?.gasUsed.toString()}`);

    // 验证捐赠记录
    const donationAmount = await beggingContract.getDonation(deployer.address);
    console.log(`💼 捐赠记录: ${ethers.formatEther(donationAmount)} ETH`);

    // 测试提现
    console.log("💸 测试提现功能...");
    const withdrawTx = await beggingContract.withdrawETH();
    const withdrawReceipt = await withdrawTx.wait();
    console.log(`📊 提现交易: ${withdrawTx.hash}`);
    console.log(`⛽ Gas使用: ${withdrawReceipt?.gasUsed.toString()}`);

    // 验证合约余额
    const finalBalance = await ethers.provider.getBalance(contractAddress);
    console.log(`💼 最终合约余额: ${ethers.formatEther(finalBalance)} ETH`);

    // 部署总结
    console.log("\n🎉 部署验证成功！");
    console.log("=========================");
    console.log(`📋 合约地址汇总:`);
    console.log(`  BeggingContract: ${contractAddress}`);
    console.log(`  MockERC20: ${mockERC20Address}`);
    console.log(`  MockERC721: ${mockERC721Address}`);
    console.log(`  MockERC1155: ${mockERC1155Address}`);
    console.log(`\n🔗 Etherscan链接:`);
    console.log(`  https://sepolia.etherscan.io/address/${contractAddress}`);

    // 保存部署信息到文件
    const deploymentInfo = {
      network: "sepolia",
      chainId: network.chainId.toString(),
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        BeggingContract: contractAddress,
        MockERC20: mockERC20Address,
        MockERC721: mockERC721Address,
        MockERC1155: mockERC1155Address,
      },
      config: {
        startTime: contractStartTime.toString(),
        endTime: contractEndTime.toString(),
      },
      transactions: {
        deploy: beggingContract.deploymentTransaction()?.hash,
        donateTest: donateTx.hash,
        withdrawTest: withdrawTx.hash,
      }
    };

    require("fs").writeFileSync(
      "./deployment-sepolia.json",
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log(`\n📄 部署信息已保存到: deployment-sepolia.json`);

  } catch (error) {
    console.error("❌ 部署验证失败:", error);
    process.exit(1);
  }
}

// 错误处理
process.on("unhandledRejection", (error) => {
  console.error("❌ 未处理的Promise拒绝:", error);
  process.exit(1);
});

// 执行脚本
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 脚本执行失败:", error);
    process.exit(1);
  });