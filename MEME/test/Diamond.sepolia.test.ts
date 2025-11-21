import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import fs from "fs";
import path from "path";

/**
 * ShibMeme Diamond 合约 - Sepolia 集成测试
 *
 * 测试范围：
 * 1. 使用已部署的合约进行集成测试
 * 2. Uniswap 流动性交互
 * 3. 实际网络环境测试
 *
 * 注意：这些测试需要在 Sepolia 网络上运行
 * 运行命令: npx hardhat test test/Diamond.sepolia.test.ts --network sepolia
 */
describe("ShibMeme Diamond - Sepolia Integration Tests", function () {
  // 设置更长的超时时间，因为实际网络可能较慢
  this.timeout(120000); // 120秒

  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let diamondAddress: string;
  let erc20Facet: any;
  let shibMemeFacet: any;
  let liquidityManager: any;
  let deploymentInfo: any;

  const UNISWAP_V2_ROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506";

  /**
   * 加载部署信息
   */
  before(async function () {
    this.timeout(60000); // 60秒超时

    try {
      // 检查是否在 Sepolia 网络
      console.log("Checking network...");
      const network = await ethers.provider.getNetwork();
      console.log(
        "✓ Connected to network:",
        network.name,
        "ChainId:",
        network.chainId.toString()
      );

      if (network.chainId !== 11155111n) {
        console.log("⚠️  These tests should run on Sepolia network");
        console.log("Current network:", network.name);
        this.skip();
      }

      console.log("Getting signers...");
      [owner, user1, user2] = await ethers.getSigners();

      // 验证signers已正确初始化
      if (!owner || !user1 || !user2) {
        throw new Error("Failed to get signers");
      }

      console.log("✓ Owner:", owner.address);
      console.log("✓ User1:", user1.address);
      console.log("✓ User2:", user2.address);

      // 尝试加载部署信息
      const deploymentFile = path.join(
        __dirname,
        "..",
        "deployments",
        "sepolia-latest.json"
      );

      if (fs.existsSync(deploymentFile)) {
        deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
        diamondAddress = deploymentInfo.contracts.diamond;
        console.log("✓ Loaded deployment info from:", deploymentFile);
        console.log("✓ Diamond address:", diamondAddress);
      } else {
        console.log("⚠️  No deployment file found. Please deploy first:");
        console.log("   npx hardhat run script/deploy.ts --network sepolia");
        this.skip();
      }

      // 获取合约接口
      console.log("Getting contract interfaces...");
      erc20Facet = await ethers.getContractAt("ERC20Facet", diamondAddress);
      shibMemeFacet = await ethers.getContractAt(
        "ShibMemeFacet",
        diamondAddress
      );
      liquidityManager = await ethers.getContractAt(
        "LiquidityManager",
        diamondAddress
      );
      console.log("✓ Contract interfaces loaded");
    } catch (error: any) {
      console.error("❌ Setup failed:", error.message);
      console.error("Stack:", error.stack);
      throw error;
    }
  });

  describe("部署验证", function () {
    it("应该能读取代币基本信息", async function () {
      const name = await erc20Facet.name();
      const symbol = await erc20Facet.symbol();
      const decimals = await erc20Facet.decimals();

      expect(name).to.equal(deploymentInfo.token.name);
      expect(symbol).to.equal(deploymentInfo.token.symbol);
      expect(decimals).to.equal(18);
    });

    it("应该有正确的总供应量", async function () {
      const totalSupply = await erc20Facet.totalSupply();
      expect(ethers.formatEther(totalSupply)).to.equal(
        deploymentInfo.token.totalSupply
      );
    });

    it("合约应该持有代币", async function () {
      const balance = await erc20Facet.balanceOf(diamondAddress);
      expect(balance).to.be.gt(0);
      console.log("   Diamond balance:", ethers.formatEther(balance), "tokens");
    });
  });

  describe("ERC20 基础功能（实际网络）", function () {
    it("应该支持代币转账", async function () {
      this.timeout(60000); // 60秒

      // 确保user1已初始化
      if (!user1) {
        throw new Error("user1 is not initialized");
      }

      const amount = ethers.parseEther("10");
      let tx, receipt;

      // 重试机制
      for (let i = 0; i < 3; i++) {
        try {
          const initialBalance = await erc20Facet.balanceOf(user1.address);
          tx = await erc20Facet.transfer(user1.address, amount);
          receipt = await tx.wait();
          const finalBalance = await erc20Facet.balanceOf(user1.address);

          expect(finalBalance - initialBalance).to.equal(amount);
          console.log(
            "   Transfer successful, gas used:",
            receipt.gasUsed.toString()
          );
          break;
        } catch (error: any) {
          if (i === 2) throw error;
          console.log(`   Retry ${i + 1}/3 due to:`, error.message);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    });

    it("应该支持授权和 transferFrom", async function () {
      this.timeout(60000);

      // 确保signers已初始化
      if (!user1 || !user2) {
        throw new Error("user1 or user2 is not initialized");
      }

      const amount = ethers.parseEther("5");

      for (let i = 0; i < 3; i++) {
        try {
          // 授权
          const approveTx = await erc20Facet.approve(user1.address, amount);
          await approveTx.wait();

          // 检查授权额度
          const allowance = await erc20Facet.allowance(
            owner.address,
            user1.address
          );
          expect(allowance).to.equal(amount);

          // transferFrom
          const transferTx = await erc20Facet
            .connect(user1)
            .transferFrom(owner.address, user2.address, amount);
          await transferTx.wait();

          const balance = await erc20Facet.balanceOf(user2.address);
          expect(balance).to.be.gte(amount);
          console.log("   TransferFrom successful");
          break;
        } catch (error: any) {
          if (i === 2) throw error;
          console.log(`   Retry ${i + 1}/3 due to:`, error.message);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    });
  });

  describe("税费机制（实际网络）", function () {
    before(async function () {
      this.timeout(60000);

      // 确保 user1 有足够余额
      for (let i = 0; i < 3; i++) {
        try {
          const balance = await erc20Facet.balanceOf(user1.address);
          if (balance < ethers.parseEther("10000")) {
            const tx = await erc20Facet.transfer(
              user1.address,
              ethers.parseEther("10000")
            );
            await tx.wait();
          }
          break;
        } catch (error: any) {
          if (i === 2) throw error;
          console.log(`   Setup retry ${i + 1}/3`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    });

    it("应该正确收取税费", async function () {
      this.timeout(60000);

      const amount = ethers.parseEther("5000");
      const taxRecipient = await shibMemeFacet.getTaxRecipient();

      const initialTaxBalance = await erc20Facet.balanceOf(taxRecipient);
      const initialUser2Balance = await erc20Facet.balanceOf(user2.address);

      // 使用税费转账
      const tx = await shibMemeFacet
        .connect(user1)
        .sbtransfer(user2.address, amount);
      await tx.wait();

      const finalTaxBalance = await erc20Facet.balanceOf(taxRecipient);
      const finalUser2Balance = await erc20Facet.balanceOf(user2.address);

      // 验证税费
      const taxCollected = finalTaxBalance - initialTaxBalance;
      const amountReceived = finalUser2Balance - initialUser2Balance;

      expect(taxCollected).to.be.gt(0);
      expect(amountReceived).to.be.lt(amount);
      console.log(
        "   Tax collected:",
        ethers.formatEther(taxCollected),
        "tokens"
      );
      console.log(
        "   User received:",
        ethers.formatEther(amountReceived),
        "tokens"
      );
    });
  });

  describe("流动性管理（Uniswap 集成）", function () {
    it("应该能获取 Uniswap Router 信息", async function () {
      this.timeout(60000);
      const factory = await liquidityManager.getFactory();
      const weth = await liquidityManager.getWETH();

      expect(factory).to.be.properAddress;
      expect(weth).to.be.properAddress;
      console.log("   Factory:", factory);
      console.log("   WETH:", weth);
    });

    it("应该能检查流动性池地址", async function () {
      const pair = await liquidityManager.getUniswapV2Pair();

      if (pair !== ethers.ZeroAddress) {
        expect(pair).to.be.properAddress;
        console.log("   Liquidity Pair:", pair);
      } else {
        console.log("   No liquidity pool created yet");
      }
    });

    it("应该能创建流动性池（如果不存在）", async function () {
      this.timeout(90000); // 创建池可能耗时较长
      const existingPair = await liquidityManager.getUniswapV2Pair();

      if (existingPair === ethers.ZeroAddress) {
        const tx = await liquidityManager.createPair();
        const receipt = await tx.wait();

        const newPair = await liquidityManager.getUniswapV2Pair();
        expect(newPair).to.be.properAddress;
        console.log("   Created new pair:", newPair);
        console.log("   Gas used:", receipt.gasUsed.toString());
      } else {
        console.log("   Pair already exists, skipping creation");
        this.skip();
      }
    });
  });

  describe("权限验证（实际网络）", function () {
    it("非 owner 不能设置税费白名单", async function () {
      await expect(
        shibMemeFacet.connect(user1).setTaxExempt(user2.address, true)
      ).to.be.revertedWith("LibDiamond: Must be contract owner");
    });

    it("owner 可以设置税费白名单", async function () {
      const tx = await shibMemeFacet.setTaxExempt(user1.address, true);
      await tx.wait();

      const isExempt = await shibMemeFacet.isTaxExempt(user1.address);
      expect(isExempt).to.be.true;
      console.log("   Tax exemption set successfully");

      // 恢复状态
      await shibMemeFacet.setTaxExempt(user1.address, false);
    });
  });

  describe("Gas 消耗分析", function () {
    it("记录普通转账的 gas 消耗", async function () {
      const amount = ethers.parseEther("100");
      const tx = await erc20Facet.transfer(user1.address, amount);
      const receipt = await tx.wait();

      console.log("   Normal transfer gas:", receipt.gasUsed.toString());
      expect(receipt.gasUsed).to.be.lt(100000n); // 应该小于 100k gas
    });

    it("记录税费转账的 gas 消耗", async function () {
      const amount = ethers.parseEther("5000");

      // 确保 user1 有余额
      await erc20Facet.transfer(user1.address, amount);

      const tx = await shibMemeFacet
        .connect(user1)
        .sbtransfer(user2.address, amount);
      const receipt = await tx.wait();

      console.log("   Tax transfer gas:", receipt.gasUsed.toString());
      expect(receipt.gasUsed).to.be.lt(200000n); // 应该小于 200k gas
    });
  });

  describe("配置读取", function () {
    it("应该能读取所有配置参数", async function () {
      const maxTxAmount = await shibMemeFacet.getMaxTransactionAmount();
      const dailyLimit = await shibMemeFacet.getDailyTransactionLimit();
      const taxRecipient = await shibMemeFacet.getTaxRecipient();

      console.log("   Max TX Amount:", ethers.formatEther(maxTxAmount));
      console.log("   Daily TX Limit:", dailyLimit.toString());
      console.log("   Tax Recipient:", taxRecipient);

      expect(maxTxAmount).to.be.gt(0);
      expect(dailyLimit).to.be.gt(0);
      expect(taxRecipient).to.be.properAddress;
    });
  });

  describe("事件验证", function () {
    it("转账应该触发正确的事件", async function () {
      const amount = ethers.parseEther("100");

      await expect(erc20Facet.transfer(user1.address, amount))
        .to.emit(erc20Facet, "Transfer")
        .withArgs(owner.address, user1.address, amount);
    });

    it("税费转账应该触发多个事件", async function () {
      const amount = ethers.parseEther("5000");

      // 确保 user1 有余额
      await erc20Facet.transfer(user1.address, amount);

      const tx = await shibMemeFacet
        .connect(user1)
        .sbtransfer(user2.address, amount);
      const receipt = await tx.wait();

      // 验证事件数量
      expect(receipt.logs.length).to.be.gte(2); // 至少有转账和税费事件
      console.log("   Events emitted:", receipt.logs.length);
    });
  });

  describe("边界情况测试", function () {
    it("应该处理最大交易额度边界", async function () {
      const maxTxAmount = await shibMemeFacet.getMaxTransactionAmount();

      // 确保有足够余额
      await erc20Facet.transfer(user1.address, maxTxAmount);

      // 恰好等于最大额度应该成功
      await expect(
        shibMemeFacet.connect(user1).sbtransfer(user2.address, maxTxAmount)
      ).to.not.be.reverted;
    });

    it("零地址转账应该失败", async function () {
      const amount = ethers.parseEther("100");

      await expect(
        erc20Facet.transfer(ethers.ZeroAddress, amount)
      ).to.be.revertedWith("Transfer to zero address");
    });

    it("余额不足应该失败", async function () {
      const balance = await erc20Facet.balanceOf(user2.address);
      const excessAmount = balance + ethers.parseEther("1");

      await expect(
        erc20Facet.connect(user2).transfer(user1.address, excessAmount)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
  });

  // 测试清理
  after(async function () {
    console.log("\n📊 Test Summary:");
    console.log("Diamond Address:", diamondAddress);
    console.log("Network:", (await ethers.provider.getNetwork()).name);
    console.log("Tests completed successfully! ✓");
  });
});
