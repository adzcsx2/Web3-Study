import { expect } from "chai";
import { ethers } from "hardhat";
import { BeggingContract } from "../typechain-types";
import {
  MockERC20,
  MockERC721,
  MockERC1155,
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("BeggingContract - Sepolia Testnet", function () {
  let beggingContract: BeggingContract;
  let mockERC20: MockERC20;
  let mockERC721: MockERC721;
  let mockERC1155: MockERC1155;

  let owner: SignerWithAddress;
  let donor1: SignerWithAddress;

  const DONATION_AMOUNT = ethers.parseEther("0.01"); // 降低捐赠金额以节省测试ETH
  const ERC20_SUPPLY = ethers.parseEther("1000");
  const ERC721_TOKEN_ID = 1;
  const ERC1155_TOKEN_ID = 1;
  const ERC1155_AMOUNT = 10;

  // 增加测试超时时间
  this.timeout(300000); // 5分钟

  // 部署合约函数
  async function deployContracts() {
    try {
      // 部署 MockERC20
      console.log("🪙 部署 MockERC20...");
      const MockERC20Factory = await ethers.getContractFactory("MockERC20");
      mockERC20 = await MockERC20Factory.deploy("Sepolia Test Token", "STT");
      await mockERC20.waitForDeployment();
      const mockERC20Address = await mockERC20.getAddress();
      console.log(`✅ MockERC20 部署成功: ${mockERC20Address}`);

      // 部署 MockERC721
      console.log("🖼️ 部署 MockERC721...");
      const MockERC721Factory = await ethers.getContractFactory("MockERC721");
      mockERC721 = await MockERC721Factory.deploy("Sepolia Test NFT", "STN");
      await mockERC721.waitForDeployment();
      const mockERC721Address = await mockERC721.getAddress();
      console.log(`✅ MockERC721 部署成功: ${mockERC721Address}`);

      // 部署 MockERC1155
      console.log("🎯 部署 MockERC1155...");
      const MockERC1155Factory = await ethers.getContractFactory("MockERC1155");
      mockERC1155 = await MockERC1155Factory.deploy("https://sepolia-test-nft.com/");
      await mockERC1155.waitForDeployment();
      const mockERC1155Address = await mockERC1155.getAddress();
      console.log(`✅ MockERC1155 部署成功: ${mockERC1155Address}`);

      // 获取当前区块时间
      const block = await ethers.provider.getBlock("latest");
      const currentTimestamp = block!.timestamp;

      // 部署 BeggingContract
      console.log("💝 部署 BeggingContract...");
      const startTime = BigInt(currentTimestamp);
      const endTime = startTime + BigInt(86400); // 24小时后结束

      const BeggingContractFactory = await ethers.getContractFactory("BeggingContract");
      beggingContract = await BeggingContractFactory.deploy(startTime, endTime);
      await beggingContract.waitForDeployment();
      const contractAddress = await beggingContract.getAddress();
      console.log(`✅ BeggingContract 部署成功: ${contractAddress}`);
      console.log(`📅 捐赠时间: ${new Date(Number(startTime) * 1000).toLocaleString()} - ${new Date(Number(endTime) * 1000).toLocaleString()}`);

      console.log("🎉 所有合约部署成功！");

    } catch (error) {
      console.error("❌ 部署失败:", error);
      throw error;
    }
  }

  // 在所有测试前执行一次部署
  before(async function () {
    console.log("🚀 开始 Sepolia 测试网部署...");

    const signers = await ethers.getSigners();
    console.log(`👥 获取到 ${signers.length} 个签名者`);

    [owner, donor1] = signers;

    if (!owner || !owner.address) {
      throw new Error("❌ 未能获取到部署账户");
    }

    console.log(`👛 部署账户: ${owner.address}`);

    // 检查账户余额
    const balance = await ethers.provider.getBalance(owner.address);
    console.log(`💰 账户余额: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther("0.1")) {
      console.warn("⚠️ 账户余额较低，测试可能失败");
    }

    // 部署合约
    await deployContracts();
  });

  it("应该成功部署到Sepolia测试网", async function () {
    // 验证合约部署
    expect(await beggingContract.owner()).to.equal(owner.address);
    expect(await beggingContract.startTime()).to.be.greaterThan(0);
    expect(await beggingContract.endTime()).to.be.greaterThan(await beggingContract.startTime());

    console.log("✅ 合约配置验证通过");
  });

  it("应该支持ETH捐赠功能", async function () {
    console.log("💰 测试ETH捐赠...");

    const initialBalance = await ethers.provider.getBalance(beggingContract.getAddress());
    console.log(`💼 合约初始余额: ${ethers.formatEther(initialBalance)} ETH`);

    // 捐赠ETH
    const tx = await beggingContract.connect(donor1).donateETH({
      value: DONATION_AMOUNT,
      gasLimit: 200000 // 设置gas限制
    });

    const receipt = await tx.wait();
    console.log(`📊 捐赠交易哈希: ${tx.hash}`);
    console.log(`⛽ Gas使用: ${receipt?.gasUsed.toString()}`);

    // 验证捐赠记录
    const donorAmount = await beggingContract.getDonation(donor1.address);
    expect(donorAmount).to.equal(DONATION_AMOUNT);

    const finalBalance = await ethers.provider.getBalance(beggingContract.getAddress());
    expect(finalBalance).to.equal(initialBalance + DONATION_AMOUNT);

    console.log(`✅ ETH捐赠成功，合约当前余额: ${ethers.formatEther(finalBalance)} ETH`);
  });

  it("应该支持ERC20代币捐赠", async function () {
    console.log("🪙 测试ERC20捐赠...");

    // 为测试者铸造代币
    await mockERC20.mint(donor2.address, ERC20_SUPPLY);

    // 批准代币
    await mockERC20.connect(donor2).approve(await beggingContract.getAddress(), DONATION_AMOUNT);

    // 捐赠ERC20代币
    await expect(
      beggingContract.connect(donor2).donateERC20(await mockERC20.getAddress(), DONATION_AMOUNT)
    ).to.emit(beggingContract, "DonationERC20");

    // 验证代币余额
    const contractBalance = await mockERC20.balanceOf(await beggingContract.getAddress());
    expect(contractBalance).to.equal(DONATION_AMOUNT);

    console.log(`✅ ERC20捐赠成功，合约代币余额: ${ethers.formatEther(contractBalance)}`);
  });

  it("应该支持排行榜功能", async function () {
    console.log("🏆 测试排行榜功能...");

    // 第一次捐赠
    await beggingContract.connect(donor1).donateETH({ value: DONATION_AMOUNT });

    // 第二次捐赠（更大金额）
    const largerAmount = DONATION_AMOUNT * 2n;
    await beggingContract.connect(donor2).donateETH({ value: largerAmount });

    // 检查排行榜
    const topDonators = await beggingContract.getTopDonators();
    expect(topDonators.length).to.equal(3);

    console.log("📊 排行榜:");
    for (let i = 0; i < topDonators.length; i++) {
      const donator = topDonators[i];
      const amount = await beggingContract.donatorAmounts(donator);
      console.log(`  ${i + 1}. ${donator} - ${ethers.formatEther(amount)} ETH`);
    }

    // 验证捐赠金额
    expect(await beggingContract.getDonation(donor1.address)).to.equal(DONATION_AMOUNT);
    expect(await beggingContract.getDonation(donor2.address)).to.equal(largerAmount);

    console.log("✅ 排行榜功能正常");
  });

  it("应该支持提现功能", async function () {
    console.log("💸 测试提现功能...");

    // 先进行一次捐赠
    await beggingContract.connect(donor1).donateETH({ value: DONATION_AMOUNT });

    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
    const contractBalance = await ethers.provider.getBalance(beggingContract.getAddress());

    console.log(`👛 Owner初始余额: ${ethers.formatEther(initialOwnerBalance)} ETH`);
    console.log(`💼 合约余额: ${ethers.formatEther(contractBalance)} ETH`);

    // 提现
    const tx = await beggingContract.withdrawETH();
    const receipt = await tx.wait();

    // 计算gas费用
    const gasUsed = receipt?.gasUsed || 0n;
    const gasPrice = tx.gasPrice || 0n;
    const gasCost = gasUsed * gasPrice;

    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
    const expectedBalance = initialOwnerBalance + contractBalance - gasCost;

    // 验证提现金额（考虑gas费用）
    expect(finalOwnerBalance).to.be.closeTo(expectedBalance, ethers.parseEther("0.001"));

    // 验证合约余额归零
    const finalContractBalance = await ethers.provider.getBalance(beggingContract.getAddress());
    expect(finalContractBalance).to.equal(0);

    console.log(`✅ 提现成功，最终Owner余额: ${ethers.formatEther(finalOwnerBalance)} ETH`);
    console.log(`⛽ Gas费用: ${ethers.formatEther(gasCost)} ETH`);
  });

  it("应该支持暂停功能", async function () {
    console.log("⏸️ 测试暂停功能...");

    // 暂停合约
    await beggingContract.pause();
    expect(await beggingContract.paused()).to.be.true;

    // 尝试捐赠应该失败
    await expect(
      beggingContract.connect(donor1).donateETH({ value: DONATION_AMOUNT })
    ).to.be.revertedWithCustomError(beggingContract, "EnforcedPause");

    // 恢复合约
    await beggingContract.unpause();
    expect(await beggingContract.paused()).to.be.false;

    // 捐赠应该成功
    await expect(
      beggingContract.connect(donor1).donateETH({ value: DONATION_AMOUNT })
    ).to.not.be.reverted;

    console.log("✅ 暂停功能正常");
  });

  it("应该正确处理时间限制", async function () {
    console.log("⏰ 测试时间限制...");

    // 获取当前区块时间
    const block = await ethers.provider.getBlock("latest");
    const currentTimestamp = block!.timestamp;

    // 创建一个已过期的合约
    const pastStartTime = BigInt(currentTimestamp - 86400); // 昨天
    const pastEndTime = pastStartTime + BigInt(3600); // 一小时后结束

    const BeggingContractFactory = await ethers.getContractFactory("BeggingContract");
    const expiredContract = await BeggingContractFactory.deploy(pastStartTime, pastEndTime);
    await expiredContract.waitForDeployment();

    // 尝试向过期合约捐赠应该失败
    await expect(
      expiredContract.connect(donor1).donateETH({ value: DONATION_AMOUNT })
    ).to.be.revertedWith("Donation period is not active");

    console.log("✅ 时间限制功能正常");
  });

  // 清理函数
  after(async function () {
    try {
      // 提取剩余ETH以节省成本
      if (beggingContract) {
        const contractBalance = await ethers.provider.getBalance(await beggingContract.getAddress());
        if (contractBalance > 0) {
          console.log("💸 清理合约余额...");
          await beggingContract.withdrawETH();
          console.log("✅ 清理完成");
        }
      }
    } catch (error) {
      console.warn("⚠️ 清理过程中出现警告:", error);
    }
  });
});