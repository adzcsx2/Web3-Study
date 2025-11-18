import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { MyNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("MyNFT Type-Safe Tests", function () {
  let myNFT: MyNFT;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let royaltyReceiver: SignerWithAddress;

  const TOKEN_NAME = "MyNFT";
  const TOKEN_SYMBOL = "MNFT";
  const ROYALTY_FEE = 500; // 5%

  beforeEach(async function () {
    [owner, user1, user2, royaltyReceiver] = await ethers.getSigners();

    // Deploy upgradeable contract using Hardhat Upgrades
    const MyNFTFactory = await ethers.getContractFactory("MyNFT");
    myNFT = await upgrades.deployProxy(
      MyNFTFactory,
      [
        TOKEN_NAME,
        TOKEN_SYMBOL,
        royaltyReceiver.address,
        ROYALTY_FEE,
        owner.address,
      ],
      { initializer: "initialize" }
    );

    await myNFT.waitForDeployment();
  });

  describe("基础类型安全测试", function () {
    it("应该正确初始化合约并返回正确的类型", async function () {
      // TypeScript类型检查
      const name: string = await myNFT.name();
      const symbol: string = await myNFT.symbol();
      const ownerAddress: string = await myNFT.owner();
      const version: bigint = await myNFT.getVersion();
      const totalMinted: bigint = await myNFT.totalMinted();

      expect(name).to.equal(TOKEN_NAME);
      expect(symbol).to.equal(TOKEN_SYMBOL);
      expect(ownerAddress).to.equal(owner.address);
      expect(version).to.equal(1n);
      expect(totalMinted).to.equal(0n);
    });

    it("应该正确处理铸造操作的类型", async function () {
      // 铸造操作
      const tx = await myNFT.mint(user1.address);
      const receipt = await tx.wait();

      // 类型检查
      expect(receipt).to.not.be.null;
      if (receipt) {
        expect(receipt.hash).to.be.a('string');
        expect(receipt.gasUsed).to.be.a('bigint');
      }

      // 验证铸造结果
      const tokenId: bigint = await myNFT.totalMinted();
      const ownerOfToken: string = await myNFT.ownerOf(1);
      const balance: bigint = await myNFT.balanceOf(user1.address);

      expect(tokenId).to.equal(1n);
      expect(ownerOfToken).to.equal(user1.address);
      expect(balance).to.equal(1n);
    });

    it("应该正确处理版税操作的类型", async function () {
      const salePrice = 10000;

      // 调用royaltyInfo并正确处理返回类型
      const royaltyInfo = await myNFT.royaltyInfo(1, salePrice);
      const receiver: string = royaltyInfo[0];
      const royaltyAmount: bigint = royaltyInfo[1];

      expect(receiver).to.equal(royaltyReceiver.address);
      expect(royaltyAmount).to.equal(BigInt(ROYALTY_FEE));
    });

    it("应该正确处理多参数函数调用", async function () {
      // 设置版税
      const tx = await myNFT.setDefaultRoyalty(user1.address, 1000);
      await tx.wait();

      // 验证设置
      const royaltyInfo = await myNFT.royaltyInfo(1, 10000);
      expect(royaltyInfo[0]).to.equal(user1.address);
      expect(royaltyInfo[1]).to.equal(1000n);
    });
  });

  describe("连接操作类型安全", function () {
    beforeEach(async function () {
      // 为测试铸造一个NFT
      await myNFT.mint(user1.address);
    });

    it("应该正确处理不同用户的连接操作", async function () {
      // 使用user1连接合约
      const user1Contract = myNFT.connect(user1);

      // 类型安全的调用
      const balance: bigint = await user1Contract.balanceOf(user1.address);
      expect(balance).to.equal(1n);

      // 使用user2连接合约
      const user2Contract = myNFT.connect(user2);
      const user2Balance: bigint = await user2Contract.balanceOf(user2.address);
      expect(user2Balance).to.equal(0n);
    });

    it("应该正确处理转移操作的类型", async function () {
      // 使用user1连接并转移
      const user1Contract = myNFT.connect(user1);
      const tx = await user1Contract.transferFrom(user1.address, user2.address, 1);
      const receipt = await tx.wait();

      expect(receipt).to.not.be.null;

      // 验证转移结果
      const newOwner: string = await myNFT.ownerOf(1);
      expect(newOwner).to.equal(user2.address);
    });

    it("应该正确处理只读函数的返回类型", async function () {
      // 测试各种只读函数的返回类型
      const name: string = await myNFT.name();
      const symbol: string = await myNFT.symbol();
      const version: bigint = await myNFT.getVersion();
      const totalSupply: bigint = await myNFT.totalMinted();
      const isPaused: boolean = await myNFT.paused();
      const supportsERC721: boolean = await myNFT.supportsInterface("0x80ac58cd");
      const supportsERC2981: boolean = await myNFT.supportsInterface("0x2a55205a");

      // 类型断言验证
      expect(typeof name).to.equal('string');
      expect(typeof symbol).to.equal('string');
      expect(typeof version).to.equal('bigint');
      expect(typeof totalSupply).to.equal('bigint');
      expect(typeof isPaused).to.equal('boolean');
      expect(typeof supportsERC721).to.equal('boolean');
      expect(typeof supportsERC2981).to.equal('boolean');
    });
  });

  describe("数组和解构操作类型安全", function () {
    it("应该正确处理数组类型的返回值", async function () {
      await myNFT.mint(user1.address);
      await myNFT.mint(user2.address);

      // 测试totalMinted返回类型
      const totalMinted: bigint = await myNFT.totalMinted();
      expect(totalMinted).to.equal(2n);

      // 测试balanceOf返回类型
      const user1Balance: bigint = await myNFT.balanceOf(user1.address);
      const user2Balance: bigint = await myNFT.balanceOf(user2.address);

      expect(user1Balance).to.equal(1n);
      expect(user2Balance).to.equal(1n);

      // BigInt运算和比较
      const totalBalance = user1Balance + user2Balance;
      expect(totalBalance).to.equal(totalMinted);
    });

    it("应该正确处理royaltyInfo的元组返回", async function () {
      // 使用解构处理royaltyInfo返回
      const [receiver, amount] = await myNFT.royaltyInfo(1, 10000);

      // TypeScript会自动推断正确的类型
      expect(receiver).to.be.a('string');
      expect(amount).to.be.a('bigint');
      expect(receiver).to.equal(royaltyReceiver.address);
      expect(amount).to.equal(BigInt(ROYALTY_FEE));
    });
  });

  describe("事件监听类型安全", function () {
    it("应该正确处理Transfer事件", async function () {
      // 监听Transfer事件
      await expect(myNFT.mint(user1.address))
        .to.emit(myNFT, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, 1);
    });

    it("应该正确处理 Approval事件", async function () {
      await myNFT.mint(user1.address);

      // 使用user1连接并批准
      const user1Contract = myNFT.connect(user1);
      await expect(user1Contract.approve(user2.address, 1))
        .to.emit(myNFT, "Approval")
        .withArgs(user1.address, user2.address, 1);
    });
  });

  describe("错误处理类型安全", function () {
    it("应该正确处理未授权访问的错误", async function () {
      // 使用user1尝试铸造（应该失败）
      const user1Contract = myNFT.connect(user1);

      // 期望交易失败
      await expect(
        user1Contract.mint(user1.address)
      ).to.be.reverted;
    });

    it("应该正确处理无效tokenId的错误", async function () {
      // 尝试获取不存在的token的所有者
      await expect(
        myNFT.ownerOf(999)
      ).to.be.reverted;
    });

    it("应该正确处理超过供应量的错误", async function () {
      // 铸造到最大供应量
      for (let i = 0; i < 100; i++) {
        await myNFT.mint(user1.address);
      }

      // 尝试铸造第101个（应该失败）
      await expect(
        myNFT.mint(user1.address)
      ).to.be.reverted;
    });
  });

  describe("BigInt操作类型安全", function () {
    it("应该正确处理BigInt数学运算", async function () {
      await myNFT.mint(user1.address);
      await myNFT.mint(user2.address);

      const totalMinted: bigint = await myNFT.totalMinted();
      const user1Balance: bigint = await myNFT.balanceOf(user1.address);
      const user2Balance: bigint = await myNFT.balanceOf(user2.address);

      // BigInt运算
      const expectedTotal = user1Balance + user2Balance;
      expect(totalMinted).to.equal(expectedTotal);

      // 比较
      expect(totalMinted > user1Balance).to.be.true;
      expect(totalMinted >= user1Balance).to.be.true;
    });

    it("应该正确处理版本号的BigInt操作", async function () {
      const version: bigint = await myNFT.getVersion();
      expect(version).to.equal(1n);

      // 增加版本（模拟升级）
      const nextVersion: bigint = version + 1n;
      expect(nextVersion).to.equal(2n);
    });
  });

  describe("地址类型安全", function () {
    it("应该正确处理地址操作", async function () {
      const ownerAddress: string = await myNFT.owner();
      const user1Address: string = user1.address;
      const user2Address: string = user2.address;

      // 地址比较
      expect(ownerAddress).to.be.a('string');
      expect(user1Address).to.be.a('string');
      expect(user2Address).to.be.a('string');
      expect(ownerAddress).to.not.equal(user1Address);
      expect(user1Address).to.not.equal(user2Address);

      // 零地址比较
      expect(ethers.ZeroAddress).to.be.a('string');
      expect(ethers.ZeroAddress).to.equal("0x0000000000000000000000000000000000000000");
    });
  });

  describe("字符串操作类型安全", function () {
    it("应该正确处理字符串操作", async function () {
      const name: string = await myNFT.name();
      const symbol: string = await myNFT.symbol();

      // 字符串操作
      expect(name.length).to.be.greaterThan(0);
      expect(symbol.length).to.be.greaterThan(0);
      expect(name).to.equal(TOKEN_NAME);
      expect(symbol).to.equal(TOKEN_SYMBOL);

      // 字符串模板
      const fullInfo = `${name} (${symbol})`;
      expect(fullInfo).to.equal("MyNFT (MNFT)");
    });
  });

  describe("URI功能类型安全", function () {
    beforeEach(async function () {
      await myNFT.mint(user1.address);
    });

    it("应该正确处理tokenURI的字符串返回类型", async function () {
      const tokenURI: string = await myNFT.tokenURI(1);

      // 类型验证
      expect(tokenURI).to.be.a('string');
      expect(tokenURI.length).to.be.greaterThan(0);

      // 内容验证
      expect(tokenURI).to.include("ipfs://");
      expect(tokenURI).to.include("1");
    });

    it("应该正确处理setBaseURI的字符串参数类型", async function () {
      const newBaseURI: string = "https://api.example.com/metadata/";

      // 调用函数
      await myNFT.setBaseURI(newBaseURI);

      // 验证结果
      const updatedURI: string = await myNFT.tokenURI(1);
      expect(updatedURI).to.be.a('string');
      expect(updatedURI).to.equal(`${newBaseURI}1`);
    });

    it("应该正确处理空字符串URI", async function () {
      const emptyBaseURI: string = "";

      await myNFT.setBaseURI(emptyBaseURI);

      const tokenURI: string = await myNFT.tokenURI(1);
      expect(tokenURI).to.be.a('string');
      // OpenZeppelin ERC721在base URI为空时的行为可能是返回空字符串或只返回token ID
      expect(tokenURI === "" || tokenURI === "1").to.be.true;
    });

    it("应该正确处理长字符串URI", async function () {
      const longBaseURI: string = "https://gateway.pinata.cloud/ipfs/QmVeryLongHashThatRepresentsAFolderWithMetadata/";

      await myNFT.setBaseURI(longBaseURI);

      const tokenURI: string = await myNFT.tokenURI(1);
      expect(tokenURI).to.be.a('string');
      expect(tokenURI.length).to.be.greaterThan(80); // 调整为更合理的长度要求
      expect(tokenURI).to.equal(`${longBaseURI}1`);
    });

    it("应该正确处理URI字符串操作", async function () {
      const baseURI1: string = "https://api.v1.example.com/";
      const baseURI2: string = "https://api.v2.example.com/";

      // 设置第一个URI
      await myNFT.setBaseURI(baseURI1);
      const uri1: string = await myNFT.tokenURI(1);

      // 字符串操作验证
      expect(uri1.startsWith(baseURI1)).to.be.true;
      expect(uri1.endsWith("1")).to.be.true;
      expect(uri1.length).to.equal(baseURI1.length + 1);

      // 更新URI
      await myNFT.setBaseURI(baseURI2);
      const uri2: string = await myNFT.tokenURI(1);

      // 验证更新
      expect(uri2).to.not.equal(uri1);
      expect(uri2.startsWith(baseURI2)).to.be.true;
    });

    it("应该正确处理包含特殊字符的URI", async function () {
      const specialCharURI: string = "https://api.example.com/v1/metadata?network=testnet&version=2.0/";

      await myNFT.setBaseURI(specialCharURI);

      const tokenURI: string = await myNFT.tokenURI(1);
      expect(tokenURI).to.be.a('string');
      expect(tokenURI).to.include("?");
      expect(tokenURI).to.include("=");
      expect(tokenURI).to.include("&");
    });

    it("应该正确处理URI数组操作", async function () {
      // 铸造多个token
      await myNFT.mint(user2.address);
      await myNFT.mint(owner.address);

      const baseURI: string = "https://collection.example.com/token/";
      await myNFT.setBaseURI(baseURI);

      // 收集所有URI
      const tokenURIs: string[] = [];
      for (let i = 1; i <= 3; i++) {
        const uri: string = await myNFT.tokenURI(i);
        tokenURIs.push(uri);
      }

      // 验证数组类型和内容
      expect(Array.isArray(tokenURIs)).to.be.true;
      expect(tokenURIs.length).to.equal(3);

      tokenURIs.forEach((uri: string, index: number) => {
        expect(uri).to.be.a('string');
        expect(uri).to.equal(`${baseURI}${index + 1}`);
      });
    });

    it("应该正确处理URI模板字符串", async function () {
      const baseTemplate: string = "https://api.example.com/metadata/";
      await myNFT.setBaseURI(baseTemplate);

      const tokenId: bigint = 1n;
      const tokenURI: string = await myNFT.tokenURI(1);

      // 模板字符串操作
      const expectedURI: string = `${baseTemplate}${tokenId.toString()}`;
      expect(tokenURI).to.equal(expectedURI);

      // 验证字符串方法
      expect(tokenURI.includes(baseTemplate)).to.be.true;
      expect(tokenURI.endsWith(tokenId.toString())).to.be.true;
    });
  });
});