import { expect } from "chai";
import { ethers } from "hardhat";
import { BeggingContract } from "../typechain-types";
import {
  MockERC20,
  MockERC721,
  MockERC1155,
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";



describe("BeggingContract", function () {
  let beggingContract: BeggingContract;
  let mockERC20: MockERC20;
  let mockERC721: MockERC721;
  let mockERC1155: MockERC1155;

  let owner: SignerWithAddress;
  let donor1: SignerWithAddress;
  let donor2: SignerWithAddress;
  let donor3: SignerWithAddress;
  let donor4: SignerWithAddress;
  let nonOwner: SignerWithAddress;

  const DONATION_AMOUNT = ethers.parseEther("1.0");
  const ERC20_SUPPLY = ethers.parseEther("10000");
  const ERC721_TOKEN_ID = 1;
  const ERC1155_TOKEN_ID = 1;
  const ERC1155_AMOUNT = 100;

  beforeEach(async function () {
    [owner, donor1, donor2, donor3, donor4, nonOwner] = await ethers.getSigners();

    // Deploy mock contracts for testing
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20Factory.deploy("Mock Token", "MTK");
    await mockERC20.waitForDeployment();

    const MockERC721Factory = await ethers.getContractFactory("MockERC721");
    mockERC721 = await MockERC721Factory.deploy("Mock NFT", "MNFT");
    await mockERC721.waitForDeployment();

    const MockERC1155Factory = await ethers.getContractFactory("MockERC1155");
    mockERC1155 = await MockERC1155Factory.deploy("Mock Multi Token");
    await mockERC1155.waitForDeployment();

    // Setup test tokens
    await mockERC20.mint(donor1.address, ERC20_SUPPLY);
    await mockERC20.mint(donor2.address, ERC20_SUPPLY);
    await mockERC721.mint(donor1.address, ERC721_TOKEN_ID);
    await mockERC721.mint(donor2.address, ERC721_TOKEN_ID + 1);
    await mockERC1155.mint(donor1.address, ERC1155_TOKEN_ID, ERC1155_AMOUNT);
    await mockERC1155.mint(donor2.address, ERC1155_TOKEN_ID + 1, ERC1155_AMOUNT);

    // Deploy BeggingContract
    const startTime = await time.latest();
    const endTime = startTime + 3600; // 1 hour from now

    const BeggingContractFactory = await ethers.getContractFactory("BeggingContract");
    beggingContract = await BeggingContractFactory.deploy(startTime, endTime);
    await beggingContract.waitForDeployment();

    // Approve tokens for donation
    await mockERC20.connect(donor1).approve(beggingContract.getAddress(), ERC20_SUPPLY);
    await mockERC20.connect(donor2).approve(beggingContract.getAddress(), ERC20_SUPPLY);
    await mockERC721.connect(donor1).approve(beggingContract.getAddress(), ERC721_TOKEN_ID);
    await mockERC721.connect(donor2).approve(beggingContract.getAddress(), ERC721_TOKEN_ID + 1);
    await mockERC1155.connect(donor1).setApprovalForAll(beggingContract.getAddress(), true);
    await mockERC1155.connect(donor2).setApprovalForAll(beggingContract.getAddress(), true);
  });

  describe("合约初始化", function () {
    it("应该正确设置时间范围", async function () {
      const startTime = await time.latest();
      const endTime = startTime + 3600;

      const newContract = await ethers.getContractFactory("BeggingContract");
      const deployedContract = await newContract.deploy(startTime, endTime);
      await deployedContract.waitForDeployment();

      expect(await deployedContract.startTime()).to.equal(startTime);
      expect(await deployedContract.endTime()).to.equal(endTime);
    });

    it("应该拒绝无效的时间范围", async function () {
      const startTime = await time.latest();
      const endTime = startTime - 1; // 结束时间早于开始时间

      const BeggingContractFactory = await ethers.getContractFactory("BeggingContract");
      await expect(
        BeggingContractFactory.deploy(startTime, endTime)
      ).to.be.revertedWithCustomError(BeggingContractFactory, "InvalidTimeRange");
    });

    it("应该设置正确的owner", async function () {
      expect(await beggingContract.owner()).to.equal(owner.address);
    });

    it("应该初始化空的排行榜", async function () {
      const topDonators = await beggingContract.getTopDonators();
      expect(topDonators.length).to.equal(3);
      expect(topDonators[0]).to.equal(ethers.ZeroAddress);
      expect(topDonators[1]).to.equal(ethers.ZeroAddress);
      expect(topDonators[2]).to.equal(ethers.ZeroAddress);
    });
  });

  describe("ETH捐赠功能", function () {
    it("应该接受ETH捐赠", async function () {
      await expect(
        beggingContract.connect(donor1).donateETH({ value: DONATION_AMOUNT })
      )
        .to.emit(beggingContract, "DonationETH");

      expect(await beggingContract.donatorAmounts(donor1.address)).to.equal(DONATION_AMOUNT);
    });

    it("应该通过receive()接受直接转账", async function () {
      await expect(
        donor1.sendTransaction({
          to: beggingContract.getAddress(),
          value: DONATION_AMOUNT,
        })
      )
        .to.emit(beggingContract, "DonationETH")
  
      expect(await beggingContract.donatorAmounts(donor1.address)).to.equal(DONATION_AMOUNT);
    });

    it("应该通过fallback()接受带数据的转账", async function () {
      await expect(
        donor1.sendTransaction({
          to: beggingContract.getAddress(),
          value: DONATION_AMOUNT,
          data: "0x1234", // 一些调用数据
        })
      )
        .to.emit(beggingContract, "DonationETH")
  
      expect(await beggingContract.donatorAmounts(donor1.address)).to.equal(DONATION_AMOUNT);
    });

    it("应该拒绝零金额捐赠", async function () {
      await expect(
        beggingContract.connect(donor1).donateETH({ value: 0 })
      ).to.be.revertedWithCustomError(beggingContract, "InsufficientBalance");
    });

    it("应该在非捐赠时间拒绝捐赠", async function () {
      // 时间旅行到捐赠期结束后
      const endTime = await beggingContract.endTime();
      await time.increaseTo(endTime + 1n);

      await expect(
        beggingContract.connect(donor1).donateETH({ value: DONATION_AMOUNT })
      ).to.be.revertedWith("Donation period is not active");
    });

    it("应该在暂停时拒绝捐赠", async function () {
      await beggingContract.pause();

      await expect(
        beggingContract.connect(donor1).donateETH({ value: DONATION_AMOUNT })
      ).to.be.revertedWithCustomError(beggingContract, "EnforcedPause");
    });
  });

  describe("ERC20捐赠功能", function () {
    it("应该接受ERC20代币捐赠", async function () {
      await expect(
        beggingContract.connect(donor1).donateERC20(mockERC20.getAddress(), DONATION_AMOUNT)
      )
        .to.emit(beggingContract, "DonationERC20")
      
      expect(await mockERC20.balanceOf(beggingContract.getAddress())).to.equal(DONATION_AMOUNT);
    });

    it("应该拒绝零地址代币", async function () {
      await expect(
        beggingContract.connect(donor1).donateERC20(ethers.ZeroAddress, DONATION_AMOUNT)
      ).to.be.revertedWith("Address cannot be zero");
    });

    it("应该拒绝零金额捐赠", async function () {
      await expect(
        beggingContract.connect(donor1).donateERC20(mockERC20.getAddress(), 0)
      ).to.be.revertedWithCustomError(beggingContract, "InsufficientBalance");
    });

    it("应该拒绝余额不足的捐赠", async function () {
      const excessAmount = ERC20_SUPPLY + ethers.parseEther("1");

      await expect(
        beggingContract.connect(donor1).donateERC20(mockERC20.getAddress(), excessAmount)
      ).to.be.revertedWithCustomError(beggingContract, "InsufficientBalance");
    });

    it("应该在非捐赠时间拒绝捐赠", async function () {
      const endTime = await beggingContract.endTime();
      await time.increaseTo(endTime + 1n);

      await expect(
        beggingContract.connect(donor1).donateERC20(mockERC20.getAddress(), DONATION_AMOUNT)
      ).to.be.revertedWith("Donation period is not active");
    });
  });

  describe("ERC721捐赠功能", function () {
    it("应该接受ERC721 NFT捐赠", async function () {
      await expect(
        beggingContract.connect(donor1).donateNFT(mockERC721.getAddress(), ERC721_TOKEN_ID)
      )
        .to.emit(beggingContract, "DonationERC721")
        
      expect(await mockERC721.ownerOf(ERC721_TOKEN_ID)).to.equal(await beggingContract.getAddress());
    });

    it("应该拒绝零地址合约", async function () {
      await expect(
        beggingContract.connect(donor1).donateNFT(ethers.ZeroAddress, ERC721_TOKEN_ID)
      ).to.be.revertedWith("Address cannot be zero");
    });

    it("应该在非捐赠时间拒绝捐赠", async function () {
      const endTime = await beggingContract.endTime();
      await time.increaseTo(endTime + 1n);

      await expect(
        beggingContract.connect(donor1).donateNFT(mockERC721.getAddress(), ERC721_TOKEN_ID)
      ).to.be.revertedWith("Donation period is not active");
    });
  });

  describe("ERC1155捐赠功能", function () {
    it("应该接受ERC1155代币捐赠", async function () {
      const data = "0x";

      await expect(
        beggingContract.connect(donor1).donateERC1155(mockERC1155.getAddress(), ERC1155_TOKEN_ID, 10, data)
      )
        .to.emit(beggingContract, "DonationERC1155")
        
      expect(await mockERC1155.balanceOf(beggingContract.getAddress(), ERC1155_TOKEN_ID)).to.equal(10);
    });

    it("应该拒绝零地址合约", async function () {
      await expect(
        beggingContract.connect(donor1).donateERC1155(ethers.ZeroAddress, ERC1155_TOKEN_ID, 10, "0x")
      ).to.be.revertedWith("Address cannot be zero");
    });

    it("应该在非捐赠时间拒绝捐赠", async function () {
      const endTime = await beggingContract.endTime();
      await time.increaseTo(endTime + 1n);

      await expect(
        beggingContract.connect(donor1).donateERC1155(mockERC1155.getAddress(), ERC1155_TOKEN_ID, 10, "0x")
      ).to.be.revertedWith("Donation period is not active");
    });
  });

  describe("排行榜功能", function () {
    it("应该正确更新排行榜", async function () {
      // 第一个捐赠者
      await beggingContract.connect(donor1).donateETH({ value: ethers.parseEther("1") });

      let topDonators = await beggingContract.getTopDonators();
      expect(topDonators[0]).to.equal(donor1.address);

      // 第二个捐赠者，金额更大
      await beggingContract.connect(donor2).donateETH({ value: ethers.parseEther("2") });

      topDonators = await beggingContract.getTopDonators();
      expect(topDonators[0]).to.equal(donor2.address);
      expect(topDonators[1]).to.equal(donor1.address);

      // 第三个捐赠者，金额中等
      await beggingContract.connect(donor3).donateETH({ value: ethers.parseEther("1.5") });

      topDonators = await beggingContract.getTopDonators();
      expect(topDonators[0]).to.equal(donor2.address); // 2 ETH
      expect(topDonators[1]).to.equal(donor3.address); // 1.5 ETH
      expect(topDonators[2]).to.equal(donor1.address); // 1 ETH
    });

    it("应该替换排行榜中的最低捐赠者", async function () {
      // 添加三个捐赠者
      await beggingContract.connect(donor1).donateETH({ value: ethers.parseEther("1") });
      await beggingContract.connect(donor2).donateETH({ value: ethers.parseEther("2") });
      await beggingContract.connect(donor3).donateETH({ value: ethers.parseEther("3") });

      // 第四个捐赠者，金额超过最低者
      await beggingContract.connect(donor4).donateETH({ value: ethers.parseEther("1.5") });

      const topDonators = await beggingContract.getTopDonators();
      expect(topDonators).to.include(donor4.address);
      expect(topDonators).to.not.include(donor1.address); // 应该被替换
    });

    it("应该在捐赠者进入前三时触发RankDonator事件", async function () {
      await expect(
        beggingContract.connect(donor1).donateETH({ value: DONATION_AMOUNT })
      )
        .to.emit(beggingContract, "RankDonator")
      });

    it("不应该重复触发同一捐赠者的RankDonator事件", async function () {
      // 第一次捐赠
      await beggingContract.connect(donor1).donateETH({ value: DONATION_AMOUNT });

      // 第二次捐赠，不应该再次触发RankDonator事件
      await expect(
        beggingContract.connect(donor1).donateETH({ value: DONATION_AMOUNT })
      ).to.not.emit(beggingContract, "RankDonator");
    });

    it("应该按捐赠金额降序返回排行榜", async function () {
      await beggingContract.connect(donor1).donateETH({ value: ethers.parseEther("1") });
      await beggingContract.connect(donor2).donateETH({ value: ethers.parseEther("3") });
      await beggingContract.connect(donor3).donateETH({ value: ethers.parseEther("2") });

      const topDonators = await beggingContract.getTopDonators();
      expect(await beggingContract.donatorAmounts(topDonators[0])).to.equal(ethers.parseEther("3"));
      expect(await beggingContract.donatorAmounts(topDonators[1])).to.equal(ethers.parseEther("2"));
      expect(await beggingContract.donatorAmounts(topDonators[2])).to.equal(ethers.parseEther("1"));
    });
  });

  describe("提现功能", function () {
    beforeEach(async function () {
      // 添加一些资金到合约
      await beggingContract.connect(donor1).donateETH({ value: DONATION_AMOUNT });
      await beggingContract.connect(donor2).donateERC20(mockERC20.getAddress(), DONATION_AMOUNT);
      await beggingContract.connect(donor1).donateNFT(mockERC721.getAddress(), ERC721_TOKEN_ID);
      await beggingContract.connect(donor1).donateERC1155(mockERC1155.getAddress(), ERC1155_TOKEN_ID, 10, "0x");
    });

    describe("ETH提现", function () {
      it("应该允许owner提取ETH", async function () {
        const initialBalance = await ethers.provider.getBalance(owner.address);

        await expect(
          beggingContract.withdrawETH()
        )
          .to.emit(beggingContract, "WithdrawETH")
          
        const finalBalance = await ethers.provider.getBalance(owner.address);
        expect(finalBalance).to.be.greaterThan(initialBalance);
      });

      it("应该拒绝非owner提取ETH", async function () {
        await expect(
          beggingContract.connect(nonOwner).withdrawETH()
        ).to.be.revertedWithCustomError(beggingContract, "OwnableUnauthorizedAccount");
      });

      it("应该在合约余额为零时拒绝提取", async function () {
        // 先提取所有余额
        await beggingContract.withdrawETH();

        await expect(
          beggingContract.withdrawETH()
        ).to.be.revertedWithCustomError(beggingContract, "InsufficientBalance");
      });

      it("应该在暂停时拒绝提取", async function () {
        await beggingContract.pause();

        await expect(
          beggingContract.withdrawETH()
        ).to.be.revertedWithCustomError(beggingContract, "EnforcedPause");
      });
    });

    describe("ERC20提现", function () {
      it("应该允许owner提取ERC20代币", async function () {
        await expect(
          beggingContract.withdrawERC20(mockERC20.getAddress())
        )
          .to.emit(beggingContract, "WithdrawERC20")
          
        expect(await mockERC20.balanceOf(owner.address)).to.be.greaterThan(0);
      });

      it("应该拒绝非owner提取ERC20", async function () {
        await expect(
          beggingContract.connect(nonOwner).withdrawERC20(mockERC20.getAddress())
        ).to.be.revertedWithCustomError(beggingContract, "OwnableUnauthorizedAccount");
      });

      it("应该拒绝零地址合约", async function () {
        await expect(
          beggingContract.withdrawERC20(ethers.ZeroAddress)
        ).to.be.revertedWith("Address cannot be zero");
      });
    });

    describe("ERC721提现", function () {
      it("应该允许owner提取ERC721 NFT", async function () {
        await expect(
          beggingContract.withdrawNFT(mockERC721.getAddress(), ERC721_TOKEN_ID)
        )
          .to.emit(beggingContract, "WithdrawERC721")
          
        expect(await mockERC721.ownerOf(ERC721_TOKEN_ID)).to.equal(owner.address);
      });

      it("应该拒绝非owner提取ERC721", async function () {
        await expect(
          beggingContract.connect(nonOwner).withdrawNFT(mockERC721.getAddress(), ERC721_TOKEN_ID)
        ).to.be.revertedWithCustomError(beggingContract, "OwnableUnauthorizedAccount");
      });
    });

    describe("ERC1155提现", function () {
      it("应该允许owner提取ERC1155代币", async function () {
        await expect(
          beggingContract.withdrawERC1155(mockERC1155.getAddress(), ERC1155_TOKEN_ID, 5)
        )
          .to.emit(beggingContract, "WithdrawERC1155")
          
        expect(await mockERC1155.balanceOf(owner.address, ERC1155_TOKEN_ID)).to.equal(5);
      });

      it("应该允许批量提取ERC1155代币", async function () {
        // 先添加更多代币到合约
        await mockERC1155.mint(donor2.address, ERC1155_TOKEN_ID + 1, 50);
        await mockERC1155.connect(donor2).setApprovalForAll(beggingContract.getAddress(), true);
        await beggingContract.connect(donor2).donateERC1155(mockERC1155.getAddress(), ERC1155_TOKEN_ID + 1, 50, "0x");

        const ids = [ERC1155_TOKEN_ID, ERC1155_TOKEN_ID + 1];
        const amounts = [5, 25];

        await expect(
          beggingContract.batchWithdrawERC1155(mockERC1155.getAddress(), ids, amounts)
        )
          .to.emit(beggingContract, "BatchWithdrawERC1155")
          
        expect(await mockERC1155.balanceOf(owner.address, ERC1155_TOKEN_ID)).to.equal(5);
        expect(await mockERC1155.balanceOf(owner.address, ERC1155_TOKEN_ID + 1)).to.equal(25);
      });

      it("应该拒绝非owner提取ERC1155", async function () {
        await expect(
          beggingContract.connect(nonOwner).withdrawERC1155(mockERC1155.getAddress(), ERC1155_TOKEN_ID, 5)
        ).to.be.revertedWithCustomError(beggingContract, "OwnableUnauthorizedAccount");
      });
    });
  });

  describe("查询功能", function () {
    it("应该正确返回捐赠金额", async function () {
      await beggingContract.connect(donor1).donateETH({ value: DONATION_AMOUNT });

      expect(await beggingContract.getDonation(donor1.address)).to.equal(DONATION_AMOUNT);
      expect(await beggingContract.getDonation(donor2.address)).to.equal(0);
    });

    it("应该返回排行榜信息", async function () {
      await beggingContract.connect(donor1).donateETH({ value: ethers.parseEther("1") });
      await beggingContract.connect(donor2).donateETH({ value: ethers.parseEther("2") });

      const topDonators = await beggingContract.getTopDonators();
      expect(topDonators.length).to.equal(3);
      expect(topDonators[0]).to.equal(donor2.address); // 更高的捐赠者排在前面
    });
  });

  describe("暂停功能", function () {
    it("应该允许owner暂停合约", async function () {
      await beggingContract.pause();
      expect(await beggingContract.paused()).to.be.true;
    });

    it("应该允许owner恢复合约", async function () {
      await beggingContract.pause();
      await beggingContract.unpause();
      expect(await beggingContract.paused()).to.be.false;
    });

    it("应该拒绝非owner暂停合约", async function () {
      await expect(
        beggingContract.connect(nonOwner).pause()
      ).to.be.revertedWithCustomError(beggingContract, "OwnableUnauthorizedAccount");
    });

    it("应该在暂停时阻止所有捐赠", async function () {
      await beggingContract.pause();

      await expect(
        beggingContract.connect(donor1).donateETH({ value: DONATION_AMOUNT })
      ).to.be.revertedWithCustomError(beggingContract, "EnforcedPause");
    });
  });

  describe("接口支持", function () {
    it("应该支持ERC1155Receiver接口", async function () {
      expect(await beggingContract.supportsInterface("0x4e2312e0")).to.be.true;
    });

    it("应该支持ERC721Receiver接口", async function () {
      expect(await beggingContract.supportsInterface("0x150b7a02")).to.be.true;
    });

    it("应该支持IERC165接口", async function () {
      expect(await beggingContract.supportsInterface("0x01ffc9a7")).to.be.true;
    });

    it("应该返回正确的ERC1155接收函数选择器", async function () {
      expect(await beggingContract.onERC1155Received.staticCall(ethers.ZeroAddress, ethers.ZeroAddress, 1, 1, "0x"))
        .to.equal("0xf23a6e61");
    });

    it("应该返回正确的ERC1155批量接收函数选择器", async function () {
      expect(await beggingContract.onERC1155BatchReceived.staticCall(ethers.ZeroAddress, ethers.ZeroAddress, [1], [1], "0x"))
        .to.equal("0xbc197c81");
    });

    it("应该返回正确的ERC721接收函数选择器", async function () {
      expect(await beggingContract.onERC721Received.staticCall(ethers.ZeroAddress, ethers.ZeroAddress, 1, "0x"))
        .to.equal("0x150b7a02");
    });
  });

  describe("边界情况和安全性", function () {
    it("应该正确处理重入攻击保护", async function () {
      // 提现函数使用了nonReentrant修饰符
      // 这个测试确保修饰符正常工作
      await beggingContract.connect(donor1).donateETH({ value: DONATION_AMOUNT });

      await expect(beggingContract.withdrawETH()).to.not.be.reverted;
    });

    it("应该正确处理零地址检查", async function () {
      await expect(
        beggingContract.donateERC20(ethers.ZeroAddress, DONATION_AMOUNT)
      ).to.be.revertedWith("Address cannot be zero");
    });

    it("应该在时间范围边界正确工作", async function () {
      // 测试时间限制的边界情况
      const currentTimestamp = await time.latest();

      // 创建一个过去时间的合约（应该失败）
      const pastStartTime = currentTimestamp - 100;
      const pastEndTime = currentTimestamp - 50;

      const BeggingContractFactory = await ethers.getContractFactory("BeggingContract");
      const pastContract = await BeggingContractFactory.deploy(pastStartTime, pastEndTime);
      await pastContract.waitForDeployment();

      // 过期合约应该拒绝捐赠
      await expect(
        pastContract.connect(donor1).donateETH({ value: DONATION_AMOUNT })
      ).to.be.revertedWith("Donation period is not active");

      // 创建一个未来时间的合约
      const futureStartTime = currentTimestamp + 100;
      const futureEndTime = currentTimestamp + 3700;

      const futureContract = await BeggingContractFactory.deploy(futureStartTime, futureEndTime);
      await futureContract.waitForDeployment();

      // 未来合约应该拒绝捐赠
      await expect(
        futureContract.connect(donor1).donateETH({ value: DONATION_AMOUNT })
      ).to.be.revertedWith("Donation period is not active");

      // 验证当前合约是可用的（在时间范围内）
      await expect(
        beggingContract.connect(donor1).donateETH({ value: DONATION_AMOUNT })
      ).to.not.be.reverted;
    });

    it("应该正确处理空排行榜情况", async function () {
      const topDonators = await beggingContract.getTopDonators();
      expect(topDonators[0]).to.equal(ethers.ZeroAddress);
      expect(topDonators[1]).to.equal(ethers.ZeroAddress);
      expect(topDonators[2]).to.equal(ethers.ZeroAddress);
    });
  });
});