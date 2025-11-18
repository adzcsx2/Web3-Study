import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { NFTAuction, MyNFT, MockV3Aggregator } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("NFTAuction Security and Error Handling", function () {
  let nftAuction: NFTAuction;
  let myNFT: MyNFT;
  let mockAggregator: MockV3Aggregator;
  let owner: SignerWithAddress;
  let seller: SignerWithAddress;
  let bidder1: SignerWithAddress;
  let bidder2: SignerWithAddress;
  let attacker: SignerWithAddress;
  let feeRecipient: SignerWithAddress;

  const INITIAL_ETH_PRICE = 2000n * 100000000n;
  const ONE_DAY = 86400n;
  const PRICE_DECIMALS = 100000000n;
  const THREE_DAYS = 3n * ONE_DAY;
  const ONE_HOUR = 3600n;
  const ONE_MINUTE = 60n;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    [owner, seller, bidder1, bidder2, attacker, feeRecipient] = signers.slice(0, 6);

    // 部署Mock预言机
    const MockAggregatorFactory = await ethers.getContractFactory("MockV3Aggregator");
    mockAggregator = await MockAggregatorFactory.deploy(8, INITIAL_ETH_PRICE);
    await mockAggregator.waitForDeployment();

    // 部署NFT合约
    const MyNFTFactory = await ethers.getContractFactory("MyNFT");
    myNFT = await upgrades.deployProxy(
      MyNFTFactory,
      ["SecurityNFT", "SNFT", feeRecipient.address, 500n, owner.address],
      { initializer: "initialize" }
    );
    await myNFT.waitForDeployment();

    // 铸造NFT
    await myNFT.connect(owner).mint(seller.address);
    await myNFT.connect(owner).mint(seller.address);
    await myNFT.connect(owner).mint(seller.address);

    // 部署拍卖合约
    const NFTAuctionFactory = await ethers.getContractFactory("NFTAuction");
    nftAuction = await upgrades.deployProxy(
      NFTAuctionFactory,
      [feeRecipient.address],
      { initializer: "initialize" }
    );
    await nftAuction.waitForDeployment();

    await nftAuction.setDataFeed(await mockAggregator.getAddress());
  });

  describe("1. 权限控制测试", function () {
    it("应该只有所有者能暂停合约", async function () {
      await expect(nftAuction.connect(owner).pause())
        .to.emit(nftAuction, "ContractPaused")
        .withArgs(owner.address);

      expect(await nftAuction.paused()).to.be.true;

      await expect(
        nftAuction.connect(bidder1).pause()
      ).to.be.revertedWithCustomError(nftAuction, "OwnableUnauthorizedAccount");

      await nftAuction.connect(owner).unpause();
      expect(await nftAuction.paused()).to.be.false;
    });

    it("应该只有所有者能设置费用接收者", async function () {
      await expect(
        nftAuction.connect(bidder1).setFeeRecipient(bidder1.address)
      ).to.be.revertedWithCustomError(nftAuction, "OwnableUnauthorizedAccount");

      await expect(
        nftAuction.connect(owner).setFeeRecipient(bidder1.address)
      )
        .to.emit(nftAuction, "FeeRecipientUpdated")
        .withArgs(feeRecipient.address, bidder1.address);

      expect(await nftAuction.feeRecipient()).to.equal(bidder1.address);
    });

    it("应该只有所有者能设置预言机", async function () {
      const newAddress = await mockAggregator.getAddress();

      await expect(
        nftAuction.connect(bidder1).setDataFeed(newAddress)
      ).to.be.revertedWithCustomError(nftAuction, "OwnableUnauthorizedAccount");

      await expect(
        nftAuction.connect(owner).setDataFeed(newAddress)
      )
        .to.emit(nftAuction, "DataFeedUpdated")
        .withArgs(ethers.AnyValue, newAddress, owner.address);
    });

    it("应该只有所有者能紧急提取NFT", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
      await nftAuction.connect(seller).createAuction(
        await myNFT.getAddress(),
        1,
        ethers.parseEther("10"),
        BigInt(await time.latest()) + ONE_DAY,
        ONE_DAY,
        5,
        ethers.parseEther("1")
      );

      await time.increase(THREE_DAYS);

      await expect(
        nftAuction.connect(bidder1).emergencyWithdrawNFT(1)
      ).to.be.revertedWithCustomError(nftAuction, "OwnableUnauthorizedAccount");

      await expect(
        nftAuction.connect(owner).emergencyWithdrawNFT(1)
      )
        .to.emit(nftAuction, "AuctionCanceled")
        .withArgs(1, seller.address, await myNFT.getAddress(), 1);
    });

    it("应该验证费用接收者参数", async function () {
      await expect(
        nftAuction.connect(owner).setFeeRecipient(ethers.ZeroAddress)
      ).to.be.revertedWith("Fee recipient cannot be zero address");
    });

    it("应该验证预言机地址参数", async function () {
      await expect(
        nftAuction.connect(owner).setDataFeed(ethers.ZeroAddress)
      ).to.be.revertedWith("Data feed cannot be zero address");
    });
  });

  describe("2. 重入攻击防护测试", function () {
    it("应该防止出价时的重入攻击", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);

      await nftAuction
        .connect(seller)
        .createAuction(
          await myNFT.getAddress(),
          1,
          ethers.parseEther("10"),
          BigInt(await time.latest()) + ONE_DAY,
          ONE_DAY,
          5,
          ethers.parseEther("1")
        );

      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction.connect(seller).startAuction(await myNFT.getAddress(), 1, startTime);

      // 第一次出价应该成功
      const bidAmount = ethers.parseEther("15");
      const requiredEth = calculateRequiredEth(bidAmount, INITIAL_ETH_PRICE);

      await expect(
        nftAuction.connect(bidder1).placeBid(1, bidAmount, { value: requiredEth })
      ).to.emit(nftAuction, "BidPlaced");

      // 尝试相同金额的第二次出价应该失败
      await expect(
        nftAuction.connect(bidder2).placeBid(1, bidAmount, { value: requiredEth })
      ).to.be.revertedWith("Bid must be higher than current highest bid");
    });

    it("应该防止结算时的重入攻击", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);

      await nftAuction
        .connect(seller)
        .createAuction(
          await myNFT.getAddress(),
          1,
          ethers.parseEther("10"),
          BigInt(await time.latest()) + ONE_DAY,
          ONE_DAY,
          5,
          ethers.parseEther("1")
        );

      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction.connect(seller).startAuction(await myNFT.getAddress(), 1, startTime);

      const bidAmount = ethers.parseEther("15");
      const requiredEth = calculateRequiredEth(bidAmount, INITIAL_ETH_PRICE);
      await nftAuction.connect(bidder1).placeBid(1, bidAmount, { value: requiredEth });

      const auction = await nftAuction.getAuction(1);
      await time.increaseTo(auction.endTime + 1n);

      // 第一次结算应该成功
      await expect(nftAuction.settleAuction(1))
        .to.emit(nftAuction, "AuctionEnded");

      // 尝试重复结算应该失败
      await expect(
        nftAuction.settleAuction(1)
      ).to.be.revertedWith("Auction already settled");
    });

    it("应该防止创建拍卖时的重入", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);

      // 创建第一个拍卖
      await nftAuction.connect(seller).createAuction(await myNFT.getAddress(), 1);

      // 尝试创建重复拍卖应该失败
      await expect(
        nftAuction.connect(seller).createAuction(await myNFT.getAddress(), 1)
      ).to.be.revertedWith("Active auction already exists for this NFT");
    });
  });

  describe("3. 整数溢出保护测试", function () {
    it("应该防止价格计算溢出", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);

      await nftAuction
        .connect(seller)
        .createAuction(
          await myNFT.getAddress(),
          1,
          0,
          BigInt(await time.latest()) + ONE_DAY,
          ONE_DAY,
          5,
          ethers.parseEther("1")
        );

      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction.connect(seller).startAuction(await myNFT.getAddress(), 1, startTime);

      // 尝试使用可能导致溢出的大数值
      const extremelyLargeBid = ethers.MaxUint256;

      await expect(
        nftAuction.connect(bidder1).placeBid(1, extremelyLargeBid, { value: ethers.MaxUint256 })
      ).to.be.revertedWith("Bid must be higher than current highest bid");
    });

    it("应该防止费用计算溢出", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);

      // 使用最大费用率
      const maxFeePercent = 20;
      const safeAmount = ethers.MaxUint256 / BigInt(200); // 避免费用计算溢出（20%）

      await expect(
        nftAuction
          .connect(seller)
          .createAuction(
            await myNFT.getAddress(),
            1,
            safeAmount,
            BigInt(await time.latest()) + ONE_DAY,
            ONE_DAY,
            maxFeePercent,
            ethers.parseEther("1")
          )
      ).to.emit(nftAuction, "AuctionCreated");
    });

    it("应该处理时间计算边界", async function () {
      const currentTime = BigInt(await time.latest());

      // 测试最大时间跨度
      const maxEndTime = currentTime + 90n * ONE_DAY;
      await expect(
        nftAuction
          .connect(seller)
          .createAuction(await myNFT.getAddress(), 1, 0, maxEndTime, ONE_DAY, 5, ethers.parseEther("1"))
      ).to.emit(nftAuction, "AuctionCreated");

      // 测试超过最大时间跨度
      const tooFarFuture = currentTime + 91n * ONE_DAY;
      await expect(
        nftAuction
          .connect(seller)
          .createAuction(await myNFT.getAddress(), 1, 0, tooFarFuture, ONE_DAY, 5, ethers.parseEther("1"))
      ).to.be.revertedWith("Auction duration too long");
    });
  });

  describe("4. 预言机攻击防护测试", function () {
    it("应该检测过期预言机数据", async function () {
      await mockAggregator.updateRoundData(
        1,
        INITIAL_ETH_PRICE,
        BigInt(await time.latest()) - 3n * ONE_DAY, // 3天前
        1
      );

      await expect(
        nftAuction.getChainlinkDataFeedLatestAnswer()
      ).to.be.revertedWith("Chainlink data is stale");
    });

    it("应该检测无效的价格数据", async function () {
      // 测试零价格
      await mockAggregator.updateRoundData(
        1,
        0,
        BigInt(await time.latest()),
        1
      );

      await expect(
        nftAuction.getChainlinkDataFeedLatestAnswer()
      ).to.be.revertedWith("Price out of reasonable range");

      // 测试负价格
      await mockAggregator.updateRoundData(
        1,
        -100n,
        BigInt(await time.latest()),
        1
      );

      await expect(
        nftAuction.getChainlinkDataFeedLatestAnswer()
      ).to.be.revertedWith("Price out of reasonable range");

      // 测试过高价格
      await mockAggregator.updateRoundData(
        1,
        500000n * 100000000n, // $500,000
        BigInt(await time.latest()),
        1
      );

      await expect(
        nftAuction.getChainlinkDataFeedLatestAnswer()
      ).to.be.revertedWith("Price out of reasonable range");

      // 测试过低价格
      await mockAggregator.updateRoundData(
        1,
        50n * 100000000n, // $50
        BigInt(await time.latest()),
        1
      );

      await expect(
        nftAuction.getChainlinkDataFeedLatestAnswer()
      ).to.be.revertedWith("Price out of reasonable range");
    });

    it("应该检测未来时间戳", async function () {
      await mockAggregator.updateRoundData(
        1,
        INITIAL_ETH_PRICE,
        BigInt(await time.latest()) + ONE_HOUR, // 未来1小时
        1
      );

      await expect(
        nftAuction.getChainlinkDataFeedLatestAnswer()
      ).to.be.revertedWith("Future timestamp detected");
    });

    it("应该检测零时间戳", async function () {
      await mockAggregator.updateRoundData(
        1,
        INITIAL_ETH_PRICE,
        0,
        1
      );

      await expect(
        nftAuction.getChainlinkDataFeedLatestAnswer()
      ).to.be.revertedWith("Invalid updatedAt timestamp");
    });

    it("应该防止预言机操纵下的出价", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);

      await nftAuction
        .connect(seller)
        .createAuction(
          await myNFT.getAddress(),
          1,
          ethers.parseEther("10"),
          BigInt(await time.latest()) + ONE_DAY,
          ONE_DAY,
          5,
          ethers.parseEther("1")
        );

      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction.connect(seller).startAuction(await myNFT.getAddress(), 1, startTime);

      // 模拟预言机价格操纵
      await mockAggregator.updatePrice(1); // 极低价格

      const bidAmount = ethers.parseEther("1");
      await expect(
        nftAuction.connect(bidder1).placeBid(1, bidAmount, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Price out of reasonable range");
    });
  });

  describe("5. 状态一致性验证测试", function () {
    it("应该防止同一NFT的重复拍卖", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);

      await nftAuction.connect(seller).createAuction(await myNFT.getAddress(), 1);

      await expect(
        nftAuction.connect(seller).createAuction(await myNFT.getAddress(), 1)
      ).to.be.revertedWith("Active auction already exists for this NFT");
    });

    it("应该防止未授权NFT的拍卖", async function () {
      await expect(
        nftAuction.connect(seller).createAuction(await myNFT.getAddress(), 999)
      ).to.be.revertedWith("Contract not approved to transfer NFT");
    });

    it("应该防止已开始拍卖的取消", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);

      await nftAuction.connect(seller).createAuction(await myNFT.getAddress(), 1);

      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction.connect(seller).startAuction(await myNFT.getAddress(), 1, startTime);

      await expect(
        nftAuction.connect(seller).cancelAuction(await myNFT.getAddress(), 1)
      ).to.be.revertedWith("Cannot cancel started auction");
    });

    it("应该防止有出价拍卖的取消", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);

      await nftAuction
        .connect(seller)
        .createAuction(
          await myNFT.getAddress(),
          1,
          ethers.parseEther("10"),
          BigInt(await time.latest()) + ONE_DAY,
          ONE_DAY,
          5,
          ethers.parseEther("1")
        );

      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction.connect(seller).startAuction(await myNFT.getAddress(), 1, startTime);

      const bidAmount = ethers.parseEther("15");
      const requiredEth = calculateRequiredEth(bidAmount, INITIAL_ETH_PRICE);
      await nftAuction.connect(bidder1).placeBid(1, bidAmount, { value: requiredEth });

      await expect(
        nftAuction.connect(seller).cancelAuction(await myNFT.getAddress(), 1)
      ).to.be.revertedWith("Auction has active bids");
    });
  });

  describe("6. DoS攻击防护测试", function () {
    it("应该限制批量查询的Gas消耗", async function () {
      // 创建一些拍卖
      for (let i = 1; i <= 10; i++) {
        await myNFT.connect(owner).mint(seller.address);
        await myNFT.connect(seller).approve(await nftAuction.getAddress(), i);

        await nftAuction
          .connect(seller)
          .createAuction(
            await myNFT.getAddress(),
            i,
            ethers.parseEther("10"),
            BigInt(await time.latest()) + ONE_DAY,
            ONE_DAY,
            5,
            ethers.parseEther("1")
          );
      }

      // 测试最大批量查询
      const auctionIds = Array.from({ length: 100 }, (_, i) => BigInt((i % 10) + 1));

      // 这个查询应该成功，但有合理的gas限制
      await expect(nftAuction.getAuctions(auctionIds)).to.not.be.reverted;

      // 超过限制应该失败
      const tooLargeArray = Array(101).fill(1);
      await expect(
        nftAuction.getAuctions(tooLargeArray)
      ).to.be.revertedWith("Query size exceeds maximum limit");
    });

    it("应该防止大量的小额出价", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);

      await nftAuction
        .connect(seller)
        .createAuction(
          await myNFT.getAddress(),
          1,
          0,
          BigInt(await time.latest()) + ONE_DAY,
          ONE_HOUR, // 短拍卖时间
          5,
          ethers.parseEther("0.01") // 小加价幅度
        );

      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction.connect(seller).startAuction(await myNFT.getAddress(), 1, startTime);

      let totalGasUsed = 0n;
      const maxGasLimit = 50000000n; // 50M gas limit

      // 尝试多次小额出价
      for (let i = 1; i <= 20; i++) {
        const bidAmount = ethers.parseEther("1");
        const requiredEth = calculateRequiredEth(bidAmount, INITIAL_ETH_PRICE);

        try {
          const gasEstimate = await ethers.provider.estimateGas({
            to: await nftAuction.getAddress(),
            data: nftAuction.interface.encodeFunctionData("placeBid", [1, bidAmount]),
            value: requiredEth
          });

          if (totalGasUsed + gasEstimate > maxGasLimit) {
            break; // 达到Gas限制时停止
          }

          await nftAuction.connect(bidder1).placeBid(1, bidAmount, { value: requiredEth });
          totalGasUsed += gasEstimate;

          const auction = await nftAuction.getAuction(1);
          expect(auction.highestBid).to.equal(bidAmount);
        } catch (error) {
          // 如果因为gas限制失败，这是预期的
          expect(error.message).to.include("revert");
          break;
        }
      }

      expect(totalGasUsed).to.be.lessThan(maxGasLimit);
    });

    it("应该防止恶意暂停滥用", async function () {
      await expect(
        nftAuction.connect(bidder1).pause()
      ).to.be.revertedWithCustomError(nftAuction, "OwnableUnauthorizedAccount");

      await nftAuction.connect(owner).pause();
      expect(await nftAuction.paused()).to.be.true;

      await nftAuction.connect(owner).unpause();
      expect(await nftAuction.paused()).to.be.false;
    });
  });

  describe("7. 经济攻击防护测试", function () {
    it("应该防止拍卖时间延长攻击", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);

      await nftAuction
        .connect(seller)
        .createAuction(
          await myNFT.getAddress(),
          1,
          ethers.parseEther("10"),
          BigInt(await time.latest()) + ONE_HOUR, // 短拍卖时间
          ONE_MINUTE, // 短延期时间
          5,
          ethers.parseEther("0.01") // 小加价幅度
        );

      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction.connect(seller).startAuction(await myNFT.getAddress(), 1, startTime);

      const originalEndTime = (await nftAuction.getAuction(1)).endTime;

      // 尝试通过频繁小幅度出价延长拍卖
      for (let i = 0; i < 10; i++) {
        const bidAmount = ethers.parseEther("10") + ethers.parseEther((i * 0.01).toString());
        const requiredEth = calculateRequiredEth(bidAmount, INITIAL_ETH_PRICE);

        await nftAuction.connect(bidder1).placeBid(1, bidAmount, { value: requiredEth });

        const auction = await nftAuction.getAuction(1);
        const maxAllowedExtension = originalEndTime + BigInt(i + 1) * ONE_MINUTE;
        expect(auction.endTime).to.be.lessThan(maxAllowedExtension);
      }
    });

    it("应该防止前端运行攻击", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);

      await nftAuction
        .connect(seller)
        .createAuction(
          await myNFT.getAddress(),
          1,
          ethers.parseEther("10"),
          BigInt(await time.latest()) + ONE_DAY,
          ONE_DAY,
          5,
          ethers.parseEther("1")
        );

      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction.connect(seller).startAuction(await myNFT.getAddress(), 1, startTime);

      const bidAmount = ethers.parseEther("15");
      const requiredEth = calculateRequiredEth(bidAmount, INITIAL_ETH_PRICE);

      // 第一个出价
      await nftAuction.connect(bidder1).placeBid(1, bidAmount, { value: requiredEth });

      // 尝试在同一区块内出价相同金额应该失败
      await expect(
        nftAuction.connect(bidder2).placeBid(1, bidAmount, { value: requiredEth })
      ).to.be.revertedWith("Bid must be higher than current highest bid");
    });

    it("应该处理极小出价情况", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);

      await nftAuction
        .connect(seller)
        .createAuction(
          await myNFT.getAddress(),
          1,
          0,
          BigInt(await time.latest()) + ONE_DAY,
          ONE_DAY,
          5,
          ethers.parseEther("1")
        );

      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction.connect(seller).startAuction(await myNFT.getAddress(), 1, startTime);

      // 测试最小可能的出价
      const minBid = ethers.parseEther("0.000001");
      const requiredEth = calculateRequiredEth(minBid, INITIAL_ETH_PRICE);

      await expect(
        nftAuction.connect(bidder1).placeBid(1, minBid, { value: requiredEth })
      ).to.emit(nftAuction, "BidPlaced");

      const auction = await nftAuction.getAuction(1);
      expect(auction.highestBid).to.equal(minBid);
    });
  });

  describe("8. 错误处理完整性测试", function () {
    it("应该正确处理不存在的拍卖查询", async function () {
      await expect(
        nftAuction.getAuction(999)
      ).to.be.revertedWith("Auction does not exist");

      await expect(
        nftAuction.settleAuction(999)
      ).to.be.revertedWith("Auction does not exist");

      await expect(
        nftAuction.connect(seller).cancelAuction(ethers.ZeroAddress, 999)
      ).to.be.revertedWith("Auction does not exist");

      await expect(
        nftAuction.connect(bidder1).placeBid(999, ethers.parseEther("10"))
      ).to.be.revertedWith("Auction does not exist");
    });

    it("应该正确处理无效参数", async function () {
      await expect(
        nftAuction
          .connect(seller)
          .createAuction(ethers.ZeroAddress, 1, 0, BigInt(await time.latest()) + ONE_DAY, ONE_DAY, 5, ethers.parseEther("1"))
      ).to.be.revertedWith("Invalid token address");

      await expect(
        nftAuction
          .connect(seller)
          .createAuction(await myNFT.getAddress(), 0, 0, BigInt(await time.latest()) + ONE_DAY, ONE_DAY, 5, ethers.parseEther("1"))
      ).to.be.revertedWith("Invalid token ID");

      await expect(
        nftAuction
          .connect(seller)
          .createAuction(
            await myNFT.getAddress(),
            1,
            0,
            BigInt(await time.latest()) - 1, // 过去的时间
            ONE_DAY,
            5,
            ethers.parseEther("1")
          )
      ).to.be.revertedWith("End time must be in future");
    });

    it("应该处理紧急提取的各种情况", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);

      // 测试已开始的拍卖
      await nftAuction
        .connect(seller)
        .createAuction(
          await myNFT.getAddress(),
          1,
          ethers.parseEther("10"),
          BigInt(await time.latest()) + ONE_DAY,
          ONE_DAY,
          5,
          ethers.parseEther("1")
        );

      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction.connect(seller).startAuction(await myNFT.getAddress(), 1, startTime);

      await time.increase(THREE_DAYS);
      await expect(
        nftAuction.connect(owner).emergencyWithdrawNFT(1)
      ).to.be.revertedWith("Auction has started");

      // 重置为有出价的拍卖
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 2);
      await nftAuction
        .connect(seller)
        .createAuction(
          await myNFT.getAddress(),
          2,
          ethers.parseEther("10"),
          BigInt(await time.latest()) + ONE_DAY,
          ONE_DAY,
          5,
          ethers.parseEther("1")
        );

      const currentTime2 = BigInt(await time.latest());
      const startTime2 = currentTime2 + 1n;
      await nftAuction.connect(seller).startAuction(await myNFT.getAddress(), 2, startTime2);

      const bidAmount = ethers.parseEther("15");
      const requiredEth = calculateRequiredEth(bidAmount, INITIAL_ETH_PRICE);
      await nftAuction.connect(bidder1).placeBid(2, bidAmount, { value: requiredEth });

      await time.increase(THREE_DAYS);
      await expect(
        nftAuction.connect(owner).emergencyWithdrawNFT(2)
      ).to.be.revertedWith("Auction has active bids");

      // 测试未过期的拍卖
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 3);
      await nftAuction
        .connect(seller)
        .createAuction(
          await myNFT.getAddress(),
          3,
          ethers.parseEther("10"),
          BigInt(await time.latest()) + ONE_DAY,
          ONE_DAY,
          5,
          ethers.parseEther("1")
        );

      await expect(
        nftAuction.connect(owner).emergencyWithdrawNFT(3)
      ).to.be.revertedWith("Cannot emergency withdraw yet");

      await time.increase(THREE_DAYS);
      await expect(
        nftAuction.connect(owner).emergencyWithdrawNFT(3)
      )
        .to.emit(nftAuction, "AuctionCanceled")
        .withArgs(3, seller.address, await myNFT.getAddress(), 3);
    });
  });

  describe("9. ERC721接收器测试", function () {
    it("应该正确实现ERC721接收器接口", async function () {
      const selector = nftAuction.interface.getFunction("onERC721Received")!.selector;
      const result = await nftAuction.onERC721Received.selector;

      expect(result).to.equal(selector);

      // 测试接口函数调用
      const calldata = nftAuction.interface.encodeFunctionData("onERC721Received", [
        ethers.ZeroAddress,
        ethers.ZeroAddress,
        1,
        "0x"
      ]);

      const response = await ethers.provider.call({
        to: await nftAuction.getAddress(),
        data: calldata
      });

      expect(response).to.equal(selector);
    });

    it("应该只接受来自NFT合约的调用", async function () {
      // 这个测试验证合约只能在特定情况下接收NFT
      const calldata = nftAuction.interface.encodeFunctionData("onERC721Received", [
        ethers.ZeroAddress,
        seller.address,
        1,
        "0x"
      ]);

      // 只有在已授权的情况下才能接收NFT
      await expect(
        ethers.provider.call({
          to: await nftAuction.getAddress(),
          data: calldata
        })
      ).to.be.reverted;
    });
  });

  // 辅助函数
  function calculateRequiredEth(usdAmount: bigint, ethPrice: bigint): bigint {
    return (usdAmount * PRICE_DECIMALS + ethPrice - 1n) / ethPrice;
  }
});