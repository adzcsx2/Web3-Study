import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { sign } from "crypto";

const { getSelectors, FacetCutAction } = require("../script/utils/diamond.js");

/**
 * ShibMeme Diamond 合约 - Localhost 单元测试
 *
 * 测试范围：
 * 1. Diamond 部署和初始化
 * 2. ERC20 基础功能
 * 3. ShibMeme 税费机制
 * 4. 交易限制功能
 * 5. 权限管理
 */
describe("ShibMeme Diamond - Localhost Tests", function () {
  let owner: SignerWithAddress;
  let taxRecipient: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let diamondAddress: string;
  let erc20Facet: any;
  let shibMemeFacet: any;
  let ownershipFacet: any;
  let diamondLoupeFacet: any;

  const TOKEN_NAME = "ShibMeme";
  const TOKEN_SYMBOL = "SBMM";
  const MAX_TX_AMOUNT = ethers.parseEther("10000"); // 修改为10000以匹配测试
  const DAILY_TX_LIMIT = 100;

  /**
   * 部署 Diamond 合约和所有 Facets
   */
  async function deployDiamond() {
    [owner, taxRecipient, user1, user2] = await ethers.getSigners();

    // 部署 DiamondInit
    const DiamondInit = await ethers.getContractFactory("DiamondInit");
    const diamondInit = await DiamondInit.deploy();
    await diamondInit.waitForDeployment();
    const diamondInitAddress = await diamondInit.getAddress();

    // 部署所有 Facets
    const FacetNames = [
      "DiamondCutFacet",
      "DiamondLoupeFacet",
      "OwnershipFacet",
      "ERC20Facet",
      "ShibMemeFacet",
      "LiquidityManager",
    ];

    const facetCuts = [];
    for (const FacetName of FacetNames) {
      const Facet = await ethers.getContractFactory(FacetName);
      const facet = await Facet.deploy();
      await facet.waitForDeployment();
      const facetAddress = await facet.getAddress();

      facetCuts.push({
        facetAddress: facetAddress,
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(facet),
      });
    }

    // 准备初始化调用
    const functionCall = diamondInit.interface.encodeFunctionData("init");

    const diamondArgs = {
      owner: owner.address,
      init: diamondInitAddress,
      initCalldata: functionCall,
    };

    // 部署 Diamond
    const Diamond = await ethers.getContractFactory("Diamond");
    const diamond = await Diamond.deploy(facetCuts, diamondArgs);
    await diamond.waitForDeployment();
    diamondAddress = await diamond.getAddress();

    // 获取 Facet 接口
    erc20Facet = await ethers.getContractAt("ERC20Facet", diamondAddress);
    shibMemeFacet = await ethers.getContractAt("ShibMemeFacet", diamondAddress);
    ownershipFacet = await ethers.getContractAt(
      "OwnershipFacet",
      diamondAddress
    );
    diamondLoupeFacet = await ethers.getContractAt(
      "DiamondLoupeFacet",
      diamondAddress
    );

    // 初始化 ShibMeme
    await shibMemeFacet.initializeShibMeme(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      taxRecipient.address,
      MAX_TX_AMOUNT,
      DAILY_TX_LIMIT
    );

    return {
      diamondAddress,
      erc20Facet,
      shibMemeFacet,
      ownershipFacet,
      diamondLoupeFacet,
    };
  }

  describe("部署和初始化", function () {
    beforeEach(async function () {
      await deployDiamond();
    });

    it("应该正确部署 Diamond 合约", async function () {
      expect(diamondAddress).to.be.properAddress;
    });

    it("应该正确初始化代币信息", async function () {
      expect(await erc20Facet.name()).to.equal(TOKEN_NAME);
      expect(await erc20Facet.symbol()).to.equal(TOKEN_SYMBOL);
      expect(await erc20Facet.decimals()).to.equal(18);
    });

    it("应该正确设置总供应量", async function () {
      const totalSupply = await erc20Facet.totalSupply();
      expect(totalSupply).to.equal(ethers.parseEther("100000000")); // 1亿代币
    });

    it("应该将 40% 代币铸造给合约地址", async function () {
      const contractBalance = await erc20Facet.balanceOf(diamondAddress);
      expect(contractBalance).to.equal(ethers.parseEther("40000000")); // 4000万
    });

    it("应该将 10% 代币铸造给Owner", async function () {
      const ownerBalance = await erc20Facet.balanceOf(owner.address);
      expect(ownerBalance).to.equal(ethers.parseEther("10000000")); // 1000万
    });

    it("应该将 50% 代币销毁", async function () {
      const burnAddress = "0x000000000000000000000000000000000000dEaD";
      const burnBalance = await erc20Facet.balanceOf(burnAddress);
      expect(burnBalance).to.equal(ethers.parseEther("50000000")); // 5000万（50%）
    });

    it("应该正确设置 owner", async function () {
      expect(await ownershipFacet.owner()).to.equal(owner.address);
    });

    it("应该正确设置税费接收地址", async function () {
      expect(await shibMemeFacet.getTaxRecipient()).to.equal(
        taxRecipient.address
      );
    });
  });

  describe("ERC20 基础功能", function () {
    beforeEach(async function () {
      await deployDiamond();
      // 从合约转一些代币给 user1 用于测试
      await erc20Facet.transfer(user1.address, ethers.parseEther("1000"));
    });

    it("应该支持代币转账", async function () {
      const amount = ethers.parseEther("100");
      await erc20Facet.connect(user1).transfer(user2.address, amount);
      expect(await erc20Facet.balanceOf(user2.address)).to.equal(amount);
    });

    it("应该支持授权", async function () {
      const amount = ethers.parseEther("100");
      await erc20Facet.connect(user1).approve(user2.address, amount);
      expect(await erc20Facet.allowance(user1.address, user2.address)).to.equal(
        amount
      );
    });

    it("应该支持 transferFrom", async function () {
      const amount = ethers.parseEther("100");
      await erc20Facet.connect(user1).approve(user2.address, amount);
      await erc20Facet
        .connect(user2)
        .transferFrom(user1.address, user2.address, amount);
      expect(await erc20Facet.balanceOf(user2.address)).to.equal(amount);
    });

    it("余额不足时应该失败", async function () {
      const amount = ethers.parseEther("2000"); // 超过余额
      await expect(
        erc20Facet.connect(user1).transfer(user2.address, amount)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
  });

  describe("税费机制", function () {
    beforeEach(async function () {
      await deployDiamond();
      await erc20Facet.transfer(user1.address, ethers.parseEther("20000"));
    });

    it("小额转账（< 1000）应该无税费", async function () {
      const amount = ethers.parseEther("500");
      const initialBalance = await erc20Facet.balanceOf(user2.address);

      await shibMemeFacet.connect(user1).sbtransfer(user2.address, amount);

      const finalBalance = await erc20Facet.balanceOf(user2.address);
      expect(finalBalance - initialBalance).to.equal(amount);
    });

    it("中额转账（1000-10000）应该收取 2% 税费", async function () {
      // 确认user1和user2都不在税费白名单中
      const isUser1TaxExempt = await shibMemeFacet.isTaxExempt(user1.address);
      const isUser2TaxExempt = await shibMemeFacet.isTaxExempt(user2.address);

      if (isUser1TaxExempt) {
        await shibMemeFacet.setTaxExempt(user1.address, false);
      }
      if (isUser2TaxExempt) {
        await shibMemeFacet.setTaxExempt(user2.address, false);
      }

      const amount = ethers.parseEther("5000");
      const expectedTax = (amount * 2n) / 100n; // 2%
      const expectedNet = amount - expectedTax;

      const initialBalance = await erc20Facet.balanceOf(user2.address);
      const initialTaxRecipientBalance = await erc20Facet.balanceOf(
        taxRecipient.address
      );

      const tx = await shibMemeFacet
        .connect(user1)
        .sbtransfer(user2.address, amount);
      await tx.wait();

      const finalBalance = await erc20Facet.balanceOf(user2.address);
      const finalTaxRecipientBalance = await erc20Facet.balanceOf(
        taxRecipient.address
      );

      const actualReceived = finalBalance - initialBalance;
      const actualTaxCollected =
        finalTaxRecipientBalance - initialTaxRecipientBalance;

      // console.log("Expected net:", expectedNet.toString());
      // console.log("Actual received:", actualReceived.toString());
      // console.log("Expected tax:", expectedTax.toString());
      // console.log("Actual tax:", actualTaxCollected.toString());

      expect(actualReceived).to.equal(expectedNet);
      expect(actualTaxCollected).to.equal(expectedTax);
    });

    it("大额转账（> 10000）应该收取 5% 税费", async function () {
      // 先给 user1 更多代币
      await erc20Facet.transfer(user1.address, ethers.parseEther("100000"));

      // 确认user1和user2都不在税费白名单中
      const isUser1TaxExempt = await shibMemeFacet.isTaxExempt(user1.address);
      const isUser2TaxExempt = await shibMemeFacet.isTaxExempt(user2.address);

      if (isUser1TaxExempt) {
        await shibMemeFacet.setTaxExempt(user1.address, false);
      }
      if (isUser2TaxExempt) {
        await shibMemeFacet.setTaxExempt(user2.address, false);
      }

      // 设置交易限制白名单绕过最大交易限制（但不影响税费）
      await shibMemeFacet.setMaxTxExempt(user1.address, true);

      const amount = ethers.parseEther("15000");
      const expectedTax = (amount * 5n) / 100n; // 5%
      const expectedNet = amount - expectedTax;

      const initialBalance = await erc20Facet.balanceOf(user2.address);
      const initialTaxRecipientBalance = await erc20Facet.balanceOf(
        taxRecipient.address
      );

      const tx = await shibMemeFacet
        .connect(user1)
        .sbtransfer(user2.address, amount);
      await tx.wait();

      const finalBalance = await erc20Facet.balanceOf(user2.address);
      const finalTaxRecipientBalance = await erc20Facet.balanceOf(
        taxRecipient.address
      );

      expect(finalBalance - initialBalance).to.equal(expectedNet);
      expect(finalTaxRecipientBalance - initialTaxRecipientBalance).to.equal(
        expectedTax
      );
    });
  });

  describe("交易限制", function () {
    beforeEach(async function () {
      await deployDiamond();
      // 给user2转一些代币用于测试（避免user1的白名单状态干扰）
      await erc20Facet.transfer(user2.address, ethers.parseEther("100000"));
    });

    it("超过最大交易额度应该失败", async function () {
      const amount = ethers.parseEther("15000"); // 超过 10000 限制
      await expect(
        shibMemeFacet.connect(user2).sbtransfer(user1.address, amount)
      ).to.be.revertedWith(
        "Transfer amount exceeds the maximum transaction limit"
      );
    });

    it("白名单地址应该可以绕过交易限制", async function () {
      // 设置 user2 为白名单
      await shibMemeFacet.setMaxTxExempt(user2.address, true);

      const amount = ethers.parseEther("15000");
      await shibMemeFacet.connect(user2).sbtransfer(user1.address, amount);

      expect(await erc20Facet.balanceOf(user1.address)).to.be.gt(0);
    });

    it("应该限制每日交易次数", async function () {
      const amount = ethers.parseEther("100");

      // 执行 100 笔交易（达到限制）
      for (let i = 0; i < DAILY_TX_LIMIT; i++) {
        await shibMemeFacet.connect(user2).sbtransfer(user1.address, amount);
      }

      // 第 101 笔应该失败
      await expect(
        shibMemeFacet.connect(user2).sbtransfer(user1.address, amount)
      ).to.be.revertedWith("Daily transaction limit exceeded");
    });

    it("新的一天应该重置交易计数", async function () {
      const amount = ethers.parseEther("100");

      // 执行 100 笔交易
      for (let i = 0; i < DAILY_TX_LIMIT; i++) {
        await shibMemeFacet.connect(user2).sbtransfer(user1.address, amount);
      }

      // 时间前进 1 天
      await time.increase(86400);

      // 应该可以再次交易
      await expect(
        shibMemeFacet.connect(user2).sbtransfer(user1.address, amount)
      ).to.not.be.reverted;
    });
  });

  describe("税费白名单", function () {
    beforeEach(async function () {
      await deployDiamond();
      await erc20Facet.transfer(user1.address, ethers.parseEther("20000"));
    });

    it("白名单地址应该免税", async function () {
      await shibMemeFacet.setTaxExempt(user1.address, true);

      const amount = ethers.parseEther("5000");
      const initialBalance = await erc20Facet.balanceOf(user2.address);

      await shibMemeFacet.connect(user1).sbtransfer(user2.address, amount);

      const finalBalance = await erc20Facet.balanceOf(user2.address);
      expect(finalBalance - initialBalance).to.equal(amount); // 无税费
    });

    it("应该可以取消白名单", async function () {
      await shibMemeFacet.setTaxExempt(user1.address, true);
      await shibMemeFacet.setTaxExempt(user1.address, false);

      expect(await shibMemeFacet.isTaxExempt(user1.address)).to.be.false;
    });
  });

  describe("权限管理", function () {
    beforeEach(async function () {
      await deployDiamond();
    });

    it("非 owner 不能设置税费白名单", async function () {
      await expect(
        shibMemeFacet.connect(user1).setTaxExempt(user2.address, true)
      ).to.be.reverted; // 使用自定义错误
    });

    it("非 owner 不能更新税费接收地址", async function () {
      await expect(
        shibMemeFacet.connect(user1).updateTaxRecipient(user2.address)
      ).to.be.reverted; // 使用自定义错误
    });

    it("owner 可以转移所有权", async function () {
      await ownershipFacet.transferOwnership(user1.address);
      expect(await ownershipFacet.owner()).to.equal(user1.address);
    });

    it("新 owner 可以管理合约", async function () {
      await ownershipFacet.transferOwnership(user1.address);
      await shibMemeFacet.connect(user1).setTaxExempt(user2.address, true);
      expect(await shibMemeFacet.isTaxExempt(user2.address)).to.be.true;
    });
  });

  describe("Diamond Loupe 功能", function () {
    beforeEach(async function () {
      await deployDiamond();
    });

    it("应该返回所有 facets", async function () {
      const facets = await diamondLoupeFacet.facets();
      expect(facets.length).to.equal(6); // 6 个 facets
    });

    it("应该返回正确的 facet 地址", async function () {
      const facets = await diamondLoupeFacet.facets();
      facets.forEach((facet: any) => {
        expect(facet.facetAddress).to.be.properAddress;
        expect(facet.functionSelectors.length).to.be.gt(0);
      });
    });
  });

  describe("配置更新", function () {
    beforeEach(async function () {
      await deployDiamond();
    });

    it("应该可以更新最大交易额度", async function () {
      const newAmount = ethers.parseEther("20000");
      await shibMemeFacet.updateMaxTransactionAmount(newAmount);
      expect(await shibMemeFacet.getMaxTransactionAmount()).to.equal(newAmount);
    });

    it("应该可以更新税费接收地址", async function () {
      await shibMemeFacet.updateTaxRecipient(user1.address);
      expect(await shibMemeFacet.getTaxRecipient()).to.equal(user1.address);
    });

    it("不能将税费接收地址设为零地址", async function () {
      await expect(
        shibMemeFacet.updateTaxRecipient(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });
  });
});
