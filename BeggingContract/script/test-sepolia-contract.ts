import { ethers } from "hardhat";
import { BeggingContract } from "../typechain-types";

async function main() {
  console.log("🧪 Sepolia合约功能测试");
  console.log("=====================");

  try {
    // 从部署信息文件读取合约地址
    let deploymentInfo;
    try {
      const fs = require("fs");
      deploymentInfo = JSON.parse(fs.readFileSync("./deployment-sepolia.json", "utf8"));
    } catch (error) {
      console.log("📝 未找到部署信息，请先运行部署脚本");
      console.log("   或者手动输入合约地址:");

      const contractAddress = process.env.BEGGING_CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error("请设置环境变量 BEGGING_CONTRACT_ADDRESS 或先运行部署脚本");
      }

      deploymentInfo = {
        contracts: {
          BeggingContract: contractAddress
        }
      };
    }

    const contractAddress = deploymentInfo.contracts.BeggingContract;
    console.log(`📍 合约地址: ${contractAddress}`);

    // 连接到合约
    const beggingContract = await ethers.getContractAt("BeggingContract", contractAddress);
    console.log("✅ 合约连接成功");

    // 获取网络信息
    const network = await ethers.provider.getNetwork();
    console.log(`🌐 网络: ${network.name} (Chain ID: ${network.chainId})`);

    // 获取当前账户
    const [testAccount] = await ethers.getSigners();
    console.log(`👛 测试账户: ${testAccount.address}`);

    const balance = await testAccount.provider.getBalance(testAccount.address);
    console.log(`💰 账户余额: ${ethers.formatEther(balance)} ETH`);

    // 检查合约状态
    console.log("\n🔍 检查合约状态...");

    const owner = await beggingContract.owner();
    const startTime = await beggingContract.startTime();
    const endTime = await beggingContract.endTime();
    const paused = await beggingContract.paused();

    console.log(`👤 Owner: ${owner}`);
    console.log(`📅 开始时间: ${new Date(Number(startTime) * 1000).toLocaleString()}`);
    console.log(`📅 结束时间: ${new Date(Number(endTime) * 1000).toLocaleString()}`);
    console.log(`⏸️ 暂停状态: ${paused}`);

    const currentTime = Math.floor(Date.now() / 1000);
    const isActive = currentTime >= Number(startTime) && currentTime <= Number(endTime);
    console.log(`🎯 捐赠状态: ${isActive ? '✅ 激活' : '❌ 未激活'}`);

    // 功能测试
    if (isActive && !paused) {
      console.log("\n🧪 执行功能测试...");

      // 测试ETH捐赠
      const testAmount = ethers.parseEther("0.001");
      if (balance >= testAmount * 2n) { // 确保有足够余额
        console.log(`💰 测试ETH捐赠: ${ethers.formatEther(testAmount)} ETH`);

        const donateTx = await beggingContract.donateETH({
          value: testAmount,
          gasLimit: 200000
        });
        const donateReceipt = await donateTx.wait();

        console.log(`📊 捐赠交易: ${donateTx.hash}`);
        console.log(`⛽ Gas使用: ${donateReceipt?.gasUsed.toString()}`);

        // 验证捐赠记录
        const donationAmount = await beggingContract.getDonation(testAccount.address);
        console.log(`💼 捐赠记录: ${ethers.formatEther(donationAmount)} ETH`);

        // 测试排行榜
        const topDonators = await beggingContract.getTopDonators();
        console.log("🏆 排行榜:");
        for (let i = 0; i < topDonators.length; i++) {
          const donator = topDonators[i];
          if (donator !== ethers.ZeroAddress) {
            const amount = await beggingContract.donatorAmounts(donator);
            console.log(`  ${i + 1}. ${donator.slice(0, 6)}...${donator.slice(-4)} - ${ethers.formatEther(amount)} ETH`);
          } else {
            console.log(`  ${i + 1}. 空位`);
          }
        }

        // 如果是owner，测试提现
        if (testAccount.address.toLowerCase() === owner.toLowerCase()) {
          console.log("💸 测试提现功能...");

          const contractBalance = await ethers.provider.getBalance(contractAddress);
          if (contractBalance > 0) {
            const withdrawTx = await beggingContract.withdrawETH();
            const withdrawReceipt = await withdrawTx.wait();

            console.log(`📊 提现交易: ${withdrawTx.hash}`);
            console.log(`⛽ Gas使用: ${withdrawReceipt?.gasUsed.toString()}`);
            console.log(`💵 提现金额: ${ethers.formatEther(contractBalance)} ETH`);
          } else {
            console.log("💼 合约余额为0，跳过提现测试");
          }
        } else {
          console.log("ℹ️ 非Owner账户，跳过提现测试");
        }

      } else {
        console.log("⚠️ 余额不足，跳过ETH捐赠测试");
      }

    } else {
      console.log("ℹ️ 合约未激活或已暂停，跳过功能测试");
    }

    // 合约接口测试
    console.log("\n🔌 测试合约接口...");

    const supports1155 = await beggingContract.supportsInterface("0x4e2312e0");
    const supports721 = await beggingContract.supportsInterface("0x150b7a02");
    const supports165 = await beggingContract.supportsInterface("0x01ffc9a7");

    console.log(`🎯 ERC1155Receiver: ${supports1155 ? '✅' : '❌'}`);
    console.log(`🎯 ERC721Receiver: ${supports721 ? '✅' : '❌'}`);
    console.log(`🎯 IERC165: ${supports165 ? '✅' : '❌'}`);

    console.log("\n🎉 测试完成！");

  } catch (error) {
    console.error("❌ 测试失败:", error);
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