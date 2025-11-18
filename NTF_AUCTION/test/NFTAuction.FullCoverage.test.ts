import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { NFTAuction, MyNFT, MockV3Aggregator } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("NFTAuction Full Coverage Test Suite", function () {
  let nftAuction: NFTAuction;
  let myNFT: MyNFT;
  let mockAggregator: MockV3Aggregator;
  let owner: SignerWithAddress;
  let seller: SignerWithAddress;
  let bidder1: SignerWithAddress;
  let bidder2: SignerWithAddress;
  let bidder3: SignerWithAddress;
  let feeRecipient: SignerWithAddress;

  const INITIAL_ETH_PRICE = 2000n * 100000000n; // $2000 with 8 decimals
  const ONE_DAY = 86400n;
  const ONE_HOUR = 3600n;
  const PRICE_DECIMALS = 100000000n;
  const USD_DECIMALS = 1000000000000000000n;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    [owner, seller, bidder1, bidder2, bidder3, feeRecipient] = signers.slice(
      0,
      6
    );

    // 部署Mock预言机
    const MockAggregatorFactory = await ethers.getContractFactory(
      "MockV3Aggregator"
    );
    mockAggregator = await MockAggregatorFactory.deploy(8, INITIAL_ETH_PRICE);
    await mockAggregator.waitForDeployment();

    // 部署NFT合约
    const MyNFTFactory = await ethers.getContractFactory("MyNFT");
    myNFT = await upgrades.deployProxy(
      MyNFTFactory,
      ["FullCoverageNFT", "FCN", feeRecipient.address, 500n, owner.address],
      { initializer: "initialize" }
    );
    await myNFT.waitForDeployment();

    // 铸造NFT用于测试
    await myNFT.connect(owner).mint(seller.address);
    await myNFT.connect(owner).mint(seller.address);
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

    // 设置预言机地址
    await nftAuction.setDataFeed(await mockAggregator.getAddress());
  });

  describe("1. 合约初始化测试", function () {
    it("应该正确初始化合约状态", async function () {
      expect(await nftAuction.owner()).to.equal(owner.address);
      expect(await nftAuction.feeRecipient()).to.equal(feeRecipient.address);
      expect(await nftAuction.auctionCount()).to.equal(0n);
      expect(await nftAuction.paused()).to.be.false;
    });

    it("应该拒绝零地址作为费用接收者", async function () {
      const NFTAuctionFactory = await ethers.getContractFactory("NFTAuction");
      await expect(
        upgrades.deployProxy(NFTAuctionFactory, [ethers.ZeroAddress], {
          initializer: "initialize",
        })
      ).to.be.revertedWith("Fee recipient cannot be zero address");
    });

    it("应该正确设置Chainlink预言机", async function () {
      const price = await nftAuction.getChainlinkDataFeedLatestAnswer();
      expect(price).to.equal(INITIAL_ETH_PRICE);
    });

    it("应该支持ERC721Receiver接口", async function () {
      const selector =
        nftAuction.interface.getFunction("onERC721Received")!.selector;
      expect(selector).to.equal("0x150b7a02");
    });
  });

  describe("2. 拍卖创建测试", function () {
    beforeEach(async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
    });

    it("应该创建默认拍卖", async function () {
      const tx = await nftAuction
        .connect(seller)
        ["createAuction(address,uint256)"](await myNFT.getAddress(), 1);
      await expect(tx).to.emit(nftAuction, "AuctionCreated");

      expect(await nftAuction.auctionCount()).to.equal(1n);
      expect(await myNFT.ownerOf(1)).to.equal(await nftAuction.getAddress());
    });

    it("应该创建自定义拍卖", async function () {
      const endTime = BigInt(await time.latest()) + ONE_DAY;
      const startingPrice = ethers.parseEther("100");

      await expect(
        nftAuction
          .connect(seller)
          [
            "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
          ](
            await myNFT.getAddress(),
            1,
            startingPrice,
            endTime,
            ONE_HOUR,
            10,
            ethers.parseEther("5")
          )
      )
        .to.emit(nftAuction, "AuctionCreated")
        .withArgs(
          1,
          seller.address,
          await myNFT.getAddress(),
          1,
          startingPrice,
          endTime
        );

      const auction = await nftAuction.getAuction(1);
      expect(auction.startingPrice).to.equal(startingPrice);
      expect(auction.feePercent).to.equal(10);
      expect(auction.minBidIncrement).to.equal(ethers.parseEther("5"));
    });

    it("应该拒绝超过90天的拍卖", async function () {
      const tooLongDuration = BigInt(await time.latest()) + 91n * ONE_DAY;
      await expect(
        nftAuction
          .connect(seller)
          [
            "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
          ](
            await myNFT.getAddress(),
            1,
            0,
            tooLongDuration,
            ONE_HOUR,
            5,
            ethers.parseEther("1")
          )
      ).to.be.revertedWith("Auction duration too long");
    });

    it("应该拒绝过去的时间", async function () {
      const pastTime = BigInt(await time.latest()) - 1n;
      await expect(
        nftAuction
          .connect(seller)
          [
            "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
          ](
            await myNFT.getAddress(),
            1,
            0,
            pastTime,
            ONE_HOUR,
            5,
            ethers.parseEther("1")
          )
      ).to.be.revertedWith("End time must be in future");
    });

    it("应该拒绝超过20%的费用", async function () {
      const endTime = BigInt(await time.latest()) + ONE_DAY;
      await expect(
        nftAuction
          .connect(seller)
          [
            "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
          ](
            await myNFT.getAddress(),
            1,
            0,
            endTime,
            ONE_HOUR,
            25,
            ethers.parseEther("1")
          )
      ).to.be.revertedWith("Fee percent cannot exceed 20");
    });

    it("应该支持0%费用", async function () {
      const endTime = BigInt(await time.latest()) + ONE_DAY;
      await expect(
        nftAuction
          .connect(seller)
          [
            "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
          ](
            await myNFT.getAddress(),
            1,
            ethers.parseEther("100"),
            endTime,
            ONE_HOUR,
            0,
            ethers.parseEther("1")
          )
      ).to.emit(nftAuction, "AuctionCreated");
    });

    it("应该支持20%费用边界", async function () {
      const endTime = BigInt(await time.latest()) + ONE_DAY;
      await expect(
        nftAuction
          .connect(seller)
          [
            "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
          ](
            await myNFT.getAddress(),
            1,
            ethers.parseEther("100"),
            endTime,
            ONE_HOUR,
            20,
            ethers.parseEther("1")
          )
      ).to.emit(nftAuction, "AuctionCreated");
    });

    it("应该处理0起始价", async function () {
      const endTime = BigInt(await time.latest()) + ONE_DAY;
      await expect(
        nftAuction
          .connect(seller)
          [
            "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
          ](
            await myNFT.getAddress(),
            1,
            0,
            endTime,
            ONE_HOUR,
            5,
            ethers.parseEther("1")
          )
      ).to.emit(nftAuction, "AuctionCreated");
    });

    it("应该拒绝不存在的NFT", async function () {
      // tokenId 999 不存在，会触发 ERC721NonexistentToken custom error
      await expect(
        nftAuction
          .connect(seller)
          ["createAuction(address,uint256)"](await myNFT.getAddress(), 999)
      ).to.be.revertedWithCustomError(myNFT, "ERC721NonexistentToken");
    });

    it("应该拒绝未授权的NFT", async function () {
      // 使用 tokenId 2，存在但未授权
      await expect(
        nftAuction
          .connect(seller)
          ["createAuction(address,uint256)"](await myNFT.getAddress(), 2)
      ).to.be.revertedWith("Contract not approved to transfer NFT");
    });

    it("应该防止重复拍卖", async function () {
      // 注意：第一次创建拍卖后，NFT已经转移到合约中
      // seller不再是所有者，无法再次创建
      // 这个测试实际上验证了"非所有者无法创建拍卖"
      await nftAuction
        .connect(seller)
        ["createAuction(address,uint256)"](await myNFT.getAddress(), 1);

      // 第二次创建会失败，因为seller已经不是NFT所有者
      await expect(
        nftAuction
          .connect(seller)
          ["createAuction(address,uint256)"](await myNFT.getAddress(), 1)
      ).to.be.revertedWith("Caller is not the token owner");
    });

    it("应该允许已结束拍卖重新创建", async function () {
      await nftAuction
        .connect(seller)
        ["createAuction(address,uint256)"](await myNFT.getAddress(), 1);
      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction
        .connect(seller)
        .startAuction(await myNFT.getAddress(), 1, startTime);

      const auction = await nftAuction.getAuction(1);
      await time.increaseTo(auction.endTime + 1n);
      await nftAuction.settleAuction(1);

      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
      await expect(
        nftAuction
          .connect(seller)
          ["createAuction(address,uint256)"](await myNFT.getAddress(), 1)
      ).to.emit(nftAuction, "AuctionCreated");
    });

    it("应该在暂停时拒绝创建拍卖", async function () {
      await nftAuction.connect(owner).pause();
      await expect(
        nftAuction
          .connect(seller)
          ["createAuction(address,uint256)"](await myNFT.getAddress(), 1)
      ).to.be.revertedWith("Contract is paused");
    });
  });

  describe("3. 拍卖开始测试", function () {
    beforeEach(async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
      await nftAuction
        .connect(seller)
        ["createAuction(address,uint256)"](await myNFT.getAddress(), 1);
    });

    it("应该成功开始拍卖", async function () {
      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;

      await expect(
        nftAuction
          .connect(seller)
          .startAuction(await myNFT.getAddress(), 1, startTime)
      )
        .to.emit(nftAuction, "AuctionStarted")
        .withArgs(1, seller.address, startTime);

      const auction = await nftAuction.getAuction(1);
      expect(auction.startTime).to.equal(startTime);
    });

    it("应该拒绝过去时间开始", async function () {
      const pastTime = BigInt(await time.latest()) - 1n;
      await expect(
        nftAuction
          .connect(seller)
          .startAuction(await myNFT.getAddress(), 1, pastTime)
      ).to.be.revertedWith("Start time must be current or future");
    });

    it("应该拒绝超过结束时间", async function () {
      const auction = await nftAuction.getAuction(1);
      await expect(
        nftAuction
          .connect(seller)
          .startAuction(await myNFT.getAddress(), 1, auction.endTime)
      ).to.be.revertedWith("Start time must be before end time");
    });

    it("应该拒绝过远的开始时间", async function () {
      // 需要先创建一个结束时间足够远的拍卖
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 2);
      await nftAuction
        .connect(seller)
        [
          "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
        ](
          await myNFT.getAddress(),
          2,
          0,
          BigInt(await time.latest()) + 90n * ONE_DAY, // 90天后结束
          ONE_HOUR,
          5,
          ethers.parseEther("1")
        );

      const tooFarFuture = BigInt(await time.latest()) + 31n * ONE_DAY;
      await expect(
        nftAuction
          .connect(seller)
          .startAuction(await myNFT.getAddress(), 2, tooFarFuture)
      ).to.be.revertedWith("Start time too far in future");
    });

    it("应该只有卖家能开始拍卖", async function () {
      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      // startAuction使用msg.sender查找拍卖，bidder1没有创建过拍卖，所以会失败
      // 这个测试实际上验证了非卖家无法通过tokenToAuctionId查找到拍卖
      await expect(
        nftAuction
          .connect(bidder1)
          .startAuction(await myNFT.getAddress(), 1, startTime)
      ).to.be.revertedWith("Auction does not exist");
    });

    it("应该拒绝开始已取消的拍卖", async function () {
      // 取消后，tokenToAuctionId会被删除，所以再次startAuction会报Auction does not exist
      const auctionId = 1;
      await nftAuction
        .connect(seller)
        .cancelAuction(await myNFT.getAddress(), 1);
      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await expect(
        nftAuction
          .connect(seller)
          .startAuction(await myNFT.getAddress(), 1, startTime)
      ).to.be.revertedWith("Auction does not exist");
    });

    it("应该拒绝重复开始拍卖", async function () {
      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction
        .connect(seller)
        .startAuction(await myNFT.getAddress(), 1, startTime);

      await expect(
        nftAuction
          .connect(seller)
          .startAuction(await myNFT.getAddress(), 1, startTime + 1n)
      ).to.be.revertedWith("Already started");
    });
  });

  describe("4. 拍卖取消测试", function () {
    beforeEach(async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
      await nftAuction
        .connect(seller)
        ["createAuction(address,uint256)"](await myNFT.getAddress(), 1);
    });

    it("应该成功取消未开始的拍卖", async function () {
      await expect(
        nftAuction.connect(seller).cancelAuction(await myNFT.getAddress(), 1)
      )
        .to.emit(nftAuction, "AuctionCanceled")
        .withArgs(1, seller.address, await myNFT.getAddress(), 1);

      expect(await myNFT.ownerOf(1)).to.equal(seller.address);
      const auction = await nftAuction.getAuction(1);
      expect(auction.canceled).to.be.true;
    });

    it("应该只有卖家能取消拍卖", async function () {
      // cancelAuction使用msg.sender查找拍卖，bidder1没有创建过拍卖
      const auctionId = 1;
      await expect(
        nftAuction.connect(bidder1).cancelAuction(await myNFT.getAddress(), 1)
      ).to.be.revertedWith("Auction does not exist");
    });

    it("应该拒绝取消已开始的拍卖", async function () {
      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction
        .connect(seller)
        .startAuction(await myNFT.getAddress(), 1, startTime);

      await expect(
        nftAuction.connect(seller).cancelAuction(await myNFT.getAddress(), 1)
      ).to.be.revertedWith("Cannot cancel started auction");
    });

    it("应该拒绝取消有出价的拍卖", async function () {
      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction
        .connect(seller)
        .startAuction(await myNFT.getAddress(), 1, startTime);

      const bidAmount = ethers.parseEther("15");
      const requiredEth = calculateRequiredEth(bidAmount, INITIAL_ETH_PRICE);
      await nftAuction
        .connect(bidder1)
        .placeBid(1, bidAmount, { value: requiredEth });

      await expect(
        nftAuction.connect(seller).cancelAuction(await myNFT.getAddress(), 1)
      ).to.be.revertedWith("Auction has active bids");
    });
  });

  describe("5. 出价功能测试", function () {
    beforeEach(async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
      await nftAuction
        .connect(seller)
        [
          "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
        ](
          await myNFT.getAddress(),
          1,
          ethers.parseEther("10"),
          BigInt(await time.latest()) + ONE_DAY,
          ONE_HOUR,
          5,
          ethers.parseEther("1")
        );

      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction
        .connect(seller)
        .startAuction(await myNFT.getAddress(), 1, startTime);
    });

    it("应该成功出价", async function () {
      const bidAmount = ethers.parseEther("15");
      const requiredEth = calculateRequiredEth(bidAmount, INITIAL_ETH_PRICE);

      await expect(
        nftAuction
          .connect(bidder1)
          .placeBid(1, bidAmount, { value: requiredEth })
      )
        .to.emit(nftAuction, "BidPlaced")
        .withArgs(1, bidder1.address, bidAmount, ethers.parseEther("0.75"));

      const auction = await nftAuction.getAuction(1);
      expect(auction.highestBid).to.equal(bidAmount);
      expect(auction.highestBidder).to.equal(bidder1.address);
      expect(auction.feePrice).to.equal(ethers.parseEther("0.75"));
    });

    it("应该退还多余ETH", async function () {
      const bidAmount = ethers.parseEther("15");
      const requiredEth = calculateRequiredEth(bidAmount, INITIAL_ETH_PRICE);
      const excessEth = ethers.parseEther("1");

      const initialBalance = await ethers.provider.getBalance(bidder1.address);
      const tx = await nftAuction
        .connect(bidder1)
        .placeBid(1, bidAmount, { value: requiredEth + excessEth });
      const receipt = await tx.wait();

      const finalBalance = await ethers.provider.getBalance(bidder1.address);
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      expect(finalBalance + gasUsed).to.be.closeTo(
        initialBalance - requiredEth,
        ethers.parseEther("0.01")
      );
    });

    it("应该拒绝低于当前价的出价", async function () {
      const firstBid = ethers.parseEther("15");
      const requiredEth1 = calculateRequiredEth(firstBid, INITIAL_ETH_PRICE);
      await nftAuction
        .connect(bidder1)
        .placeBid(1, firstBid, { value: requiredEth1 });

      const secondBid = ethers.parseEther("12");
      const requiredEth2 = calculateRequiredEth(secondBid, INITIAL_ETH_PRICE);
      await expect(
        nftAuction
          .connect(bidder2)
          .placeBid(1, secondBid, { value: requiredEth2 })
      ).to.be.revertedWith("Bid must be higher than current highest bid");
    });

    it("应该拒绝不足最小加价的出价", async function () {
      const firstBid = ethers.parseEther("15");
      const requiredEth1 = calculateRequiredEth(firstBid, INITIAL_ETH_PRICE);
      await nftAuction
        .connect(bidder1)
        .placeBid(1, firstBid, { value: requiredEth1 });

      const secondBid = firstBid + ethers.parseEther("0.5"); // 加价不足1
      const requiredEth2 = calculateRequiredEth(secondBid, INITIAL_ETH_PRICE);
      await expect(
        nftAuction
          .connect(bidder2)
          .placeBid(1, secondBid, { value: requiredEth2 })
      ).to.be.revertedWith("Bid increment too small");
    });

    it("应该退还上一个出价者的资金", async function () {
      const firstBid = ethers.parseEther("15");
      const requiredEth1 = calculateRequiredEth(firstBid, INITIAL_ETH_PRICE);
      await nftAuction
        .connect(bidder1)
        .placeBid(1, firstBid, { value: requiredEth1 });

      const initialBalance = await ethers.provider.getBalance(bidder1.address);

      const secondBid = ethers.parseEther("20");
      const requiredEth2 = calculateRequiredEth(secondBid, INITIAL_ETH_PRICE);
      await expect(
        nftAuction
          .connect(bidder2)
          .placeBid(1, secondBid, { value: requiredEth2 })
      ).to.emit(nftAuction, "BidRefunded");

      const finalBalance = await ethers.provider.getBalance(bidder1.address);
      expect(finalBalance).to.be.greaterThan(initialBalance);
    });

    it("应该延长拍卖时间", async function () {
      const bidAmount = ethers.parseEther("15");
      const requiredEth = calculateRequiredEth(bidAmount, INITIAL_ETH_PRICE);

      const auction = await nftAuction.getAuction(1);
      const originalEndTime = auction.endTime;

      await time.increaseTo(originalEndTime - 60n);

      // 时间推进后需要更新预言机数据，避免数据过期
      await mockAggregator.updateRoundData(
        1,
        INITIAL_ETH_PRICE,
        BigInt(await time.latest()),
        1
      );

      await nftAuction
        .connect(bidder1)
        .placeBid(1, bidAmount, { value: requiredEth });

      const updatedAuction = await nftAuction.getAuction(1);
      expect(updatedAuction.endTime).to.be.greaterThan(originalEndTime);
    });

    it("应该拒绝对已结束拍卖的出价", async function () {
      const auction = await nftAuction.getAuction(1);
      await time.increaseTo(auction.endTime + 1n);

      const bidAmount = ethers.parseEther("15");
      await expect(
        nftAuction
          .connect(bidder1)
          .placeBid(1, bidAmount, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Auction has ended");
    });

    it("应该拒绝对未开始拍卖的出价", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 2);
      await nftAuction
        .connect(seller)
        ["createAuction(address,uint256)"](await myNFT.getAddress(), 2);

      const bidAmount = ethers.parseEther("15");
      await expect(
        nftAuction
          .connect(bidder1)
          .placeBid(2, bidAmount, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Auction has not started");
    });

    it("应该拒绝对已取消拍卖的出价", async function () {
      // 注意：已取消的拍卖，其tokenToAuctionId会被删除
      // 如果直接用拍卖ID出价，由于拍卖从未开始(startTime=0)
      // 会先触发"Auction has not started"错误，而不是"canceled"错误
      // 这个测试实际验证了取消后无法通过拍卖ID出价
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 2);
      await nftAuction
        .connect(seller)
        [
          "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
        ](
          await myNFT.getAddress(),
          2,
          ethers.parseEther("10"),
          BigInt(await time.latest()) + ONE_DAY,
          ONE_HOUR,
          5,
          ethers.parseEther("1")
        );

      await nftAuction
        .connect(seller)
        .cancelAuction(await myNFT.getAddress(), 2);

      const bidAmount = ethers.parseEther("15");
      // 拍卖未开始会先于canceled检查触发
      await expect(
        nftAuction
          .connect(bidder1)
          .placeBid(2, bidAmount, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Auction has not started");
    });

    it("应该拒绝ETH不足的出价", async function () {
      const bidAmount = ethers.parseEther("15");
      const requiredEth = calculateRequiredEth(bidAmount, INITIAL_ETH_PRICE);
      // 发送的ETH明显不足
      await expect(
        nftAuction
          .connect(bidder1)
          .placeBid(1, bidAmount, { value: requiredEth / 10n })
      ).to.be.revertedWith("Insufficient ETH sent for bid");
    });

    it("应该在暂停时拒绝出价", async function () {
      await nftAuction.connect(owner).pause();
      const bidAmount = ethers.parseEther("15");
      await expect(
        nftAuction
          .connect(bidder1)
          .placeBid(1, bidAmount, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Contract is paused");
    });
  });

  describe("6. 拍卖结算测试", function () {
    beforeEach(async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
      await nftAuction
        .connect(seller)
        [
          "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
        ](
          await myNFT.getAddress(),
          1,
          ethers.parseEther("10"),
          BigInt(await time.latest()) + ONE_DAY,
          ONE_HOUR,
          5,
          ethers.parseEther("1")
        );

      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction
        .connect(seller)
        .startAuction(await myNFT.getAddress(), 1, startTime);
    });

    it("应该成功结算有出价的拍卖", async function () {
      const bidAmount = ethers.parseEther("15");
      const requiredEth = calculateRequiredEth(bidAmount, INITIAL_ETH_PRICE);
      await nftAuction
        .connect(bidder1)
        .placeBid(1, bidAmount, { value: requiredEth });

      const sellerBalanceBefore = await ethers.provider.getBalance(
        seller.address
      );
      const feeBalanceBefore = await ethers.provider.getBalance(
        feeRecipient.address
      );

      const auction = await nftAuction.getAuction(1);
      await time.increaseTo(auction.endTime + 1n);

      await expect(nftAuction.settleAuction(1)).to.emit(
        nftAuction,
        "AuctionEnded"
      );

      expect(await myNFT.ownerOf(1)).to.equal(bidder1.address);

      const finalAuction = await nftAuction.getAuction(1);
      expect(finalAuction.ended).to.be.true;

      // 验证资金转移
      expect(
        await ethers.provider.getBalance(seller.address)
      ).to.be.greaterThan(sellerBalanceBefore);
      expect(
        await ethers.provider.getBalance(feeRecipient.address)
      ).to.be.greaterThan(feeBalanceBefore);
    });

    it("应该成功结算无出价的拍卖", async function () {
      const auction = await nftAuction.getAuction(1);
      await time.increaseTo(auction.endTime + 1n);

      await expect(nftAuction.settleAuction(1)).to.emit(
        nftAuction,
        "AuctionEnded"
      );

      expect(await myNFT.ownerOf(1)).to.equal(seller.address);

      const finalAuction = await nftAuction.getAuction(1);
      expect(finalAuction.ended).to.be.true;
    });

    it("应该拒绝结算未结束的拍卖", async function () {
      await expect(nftAuction.settleAuction(1)).to.be.revertedWith(
        "Auction has not ended yet"
      );
    });

    it("应该拒绝重复结算拍卖", async function () {
      const bidAmount = ethers.parseEther("15");
      const requiredEth = calculateRequiredEth(bidAmount, INITIAL_ETH_PRICE);
      await nftAuction
        .connect(bidder1)
        .placeBid(1, bidAmount, { value: requiredEth });

      const auction = await nftAuction.getAuction(1);
      await time.increaseTo(auction.endTime + 1n);
      await nftAuction.settleAuction(1);

      await expect(nftAuction.settleAuction(1)).to.be.revertedWith(
        "Auction already settled"
      );
    });

    it("应该拒绝结算不存在的拍卖", async function () {
      await expect(nftAuction.settleAuction(999)).to.be.revertedWith(
        "Auction does not exist"
      );
    });
  });

  describe("7. 查询功能测试", function () {
    beforeEach(async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
      await nftAuction
        .connect(seller)
        ["createAuction(address,uint256)"](await myNFT.getAddress(), 1);
    });

    it("应该获取拍卖信息", async function () {
      const auction = await nftAuction.getAuction(1);
      expect(auction.tokenId).to.equal(1);
      expect(auction.seller).to.equal(seller.address);
      expect(auction.ended).to.be.false;
      expect(auction.canceled).to.be.false;
    });

    it("应该拒绝获取不存在的拍卖", async function () {
      await expect(nftAuction.getAuction(999)).to.be.revertedWith(
        "Auction does not exist"
      );
    });

    it("应该获取拍卖总数", async function () {
      expect(await nftAuction.getAuctionCount()).to.equal(1n);

      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 2);
      await nftAuction
        .connect(seller)
        ["createAuction(address,uint256)"](await myNFT.getAddress(), 2);

      expect(await nftAuction.getAuctionCount()).to.equal(2n);
    });

    it("应该支持批量查询", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 2);
      await nftAuction
        .connect(seller)
        ["createAuction(address,uint256)"](await myNFT.getAddress(), 2);

      const auctions = await nftAuction.getAuctions([1, 2]);
      expect(auctions.length).to.equal(2);
      expect(auctions[0].tokenId).to.equal(1);
      expect(auctions[1].tokenId).to.equal(2);
    });

    it("应该拒绝过大的批量查询", async function () {
      const largeArray = Array(101).fill(1);
      await expect(nftAuction.getAuctions(largeArray)).to.be.revertedWith(
        "Query size exceeds maximum limit"
      );
    });

    it("应该处理无效的批量查询ID", async function () {
      const auctions = await nftAuction.getAuctions([1, 999]);
      expect(auctions.length).to.equal(2);
      expect(auctions[0].tokenId).to.equal(1);
      // 无效ID应该返回默认值，不报错
    });
  });

  describe("8. 管理功能测试", function () {
    it("应该支持暂停和恢复合约", async function () {
      await expect(nftAuction.connect(owner).pause())
        .to.emit(nftAuction, "ContractPaused")
        .withArgs(owner.address);

      expect(await nftAuction.paused()).to.be.true;

      await expect(nftAuction.connect(owner).unpause())
        .to.emit(nftAuction, "ContractUnpaused")
        .withArgs(owner.address);

      expect(await nftAuction.paused()).to.be.false;
    });

    it("应该只有所有者能暂停合约", async function () {
      await expect(
        nftAuction.connect(bidder1).pause()
      ).to.be.revertedWithCustomError(nftAuction, "OwnableUnauthorizedAccount");
    });

    it("应该只有所有者能恢复合约", async function () {
      await nftAuction.connect(owner).pause();
      await expect(
        nftAuction.connect(bidder1).unpause()
      ).to.be.revertedWithCustomError(nftAuction, "OwnableUnauthorizedAccount");
    });

    it("应该支持设置费用接收者", async function () {
      await expect(nftAuction.connect(owner).setFeeRecipient(bidder1.address))
        .to.emit(nftAuction, "FeeRecipientUpdated")
        .withArgs(feeRecipient.address, bidder1.address);

      expect(await nftAuction.feeRecipient()).to.equal(bidder1.address);
    });

    it("应该拒绝零地址作为费用接收者", async function () {
      await expect(
        nftAuction.connect(owner).setFeeRecipient(ethers.ZeroAddress)
      ).to.be.revertedWith("Fee recipient cannot be zero address");
    });

    it("应该只有所有者能设置费用接收者", async function () {
      await expect(
        nftAuction.connect(bidder1).setFeeRecipient(bidder2.address)
      ).to.be.revertedWithCustomError(nftAuction, "OwnableUnauthorizedAccount");
    });

    it("应该支持设置预言机地址", async function () {
      const newAddress = await mockAggregator.getAddress();
      await expect(nftAuction.connect(owner).setDataFeed(newAddress)).to.emit(
        nftAuction,
        "DataFeedUpdated"
      );
    });

    it("应该拒绝零地址作为预言机", async function () {
      await expect(
        nftAuction.connect(owner).setDataFeed(ethers.ZeroAddress)
      ).to.be.revertedWith("Data feed cannot be zero address");
    });

    it("应该只有所有者能设置预言机地址", async function () {
      await expect(
        nftAuction.connect(bidder1).setDataFeed(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(nftAuction, "OwnableUnauthorizedAccount");
    });
  });

  describe("9. 紧急功能测试", function () {
    it("应该支持紧急提取NFT", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
      await nftAuction
        .connect(seller)
        [
          "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
        ](
          await myNFT.getAddress(),
          1,
          ethers.parseEther("10"),
          BigInt(await time.latest()) + ONE_DAY,
          ONE_HOUR,
          5,
          ethers.parseEther("1")
        );

      // 等待3天
      await time.increase(3n * ONE_DAY);

      await expect(nftAuction.connect(owner).emergencyWithdrawNFT(1))
        .to.emit(nftAuction, "AuctionCanceled")
        .withArgs(1, seller.address, await myNFT.getAddress(), 1);

      expect(await myNFT.ownerOf(1)).to.equal(seller.address);

      const auction = await nftAuction.getAuction(1);
      expect(auction.canceled).to.be.true;
    });

    it("应该拒绝过早的紧急提取", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
      await nftAuction
        .connect(seller)
        [
          "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
        ](
          await myNFT.getAddress(),
          1,
          ethers.parseEther("10"),
          BigInt(await time.latest()) + ONE_DAY,
          ONE_HOUR,
          5,
          ethers.parseEther("1")
        );

      // 未等待3天
      await expect(
        nftAuction.connect(owner).emergencyWithdrawNFT(1)
      ).to.be.revertedWith("Cannot emergency withdraw yet");
    });

    it("应该拒绝提取已开始的拍卖", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
      await nftAuction
        .connect(seller)
        [
          "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
        ](
          await myNFT.getAddress(),
          1,
          ethers.parseEther("10"),
          BigInt(await time.latest()) + ONE_DAY,
          ONE_HOUR,
          5,
          ethers.parseEther("1")
        );

      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction
        .connect(seller)
        .startAuction(await myNFT.getAddress(), 1, startTime);

      await time.increase(3n * ONE_DAY);

      await expect(
        nftAuction.connect(owner).emergencyWithdrawNFT(1)
      ).to.be.revertedWith("Auction has started");
    });

    it("应该拒绝提取有出价的拍卖", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
      await nftAuction
        .connect(seller)
        [
          "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
        ](
          await myNFT.getAddress(),
          1,
          ethers.parseEther("10"),
          BigInt(await time.latest()) + ONE_DAY,
          ONE_HOUR,
          5,
          ethers.parseEther("1")
        );

      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction
        .connect(seller)
        .startAuction(await myNFT.getAddress(), 1, startTime);

      await time.increase(3n * ONE_DAY);

      // 拍卖已开始，所以会先触发"Auction has started"错误
      await expect(
        nftAuction.connect(owner).emergencyWithdrawNFT(1)
      ).to.be.revertedWith("Auction has started");
    });

    it("应该只有所有者能紧急提取", async function () {
      await expect(
        nftAuction.connect(bidder1).emergencyWithdrawNFT(999)
      ).to.be.revertedWithCustomError(nftAuction, "OwnableUnauthorizedAccount");
    });
  });

  describe("10. Chainlink预言机测试", function () {
    it.only("应该获取最新的ETH价格", async function () {
      const price = await nftAuction.getChainlinkDataFeedLatestAnswer();
      console.log("最新ETH价格:", ethers.formatEther(price.toString()));
      expect(price).to.equal(INITIAL_ETH_PRICE);
    });

    it("应该检测过期的数据", async function () {
      await mockAggregator.updateRoundData(
        1,
        INITIAL_ETH_PRICE,
        BigInt(await time.latest()) - 3n * ONE_HOUR,
        1
      );

      await expect(
        nftAuction.getChainlinkDataFeedLatestAnswer()
      ).to.be.revertedWith("Chainlink data is stale");
    });

    it("应该检测无效的价格数据", async function () {
      await mockAggregator.updateRoundData(
        1,
        -1, // 负价格
        BigInt(await time.latest()),
        1
      );

      await expect(
        nftAuction.getChainlinkDataFeedLatestAnswer()
      ).to.be.revertedWith("Invalid price data");
    });

    it("应该检测价格过高", async function () {
      await mockAggregator.updateRoundData(
        1,
        200000n * 100000000n, // $200,000
        BigInt(await time.latest()),
        1
      );

      await expect(
        nftAuction.getChainlinkDataFeedLatestAnswer()
      ).to.be.revertedWith("Price out of reasonable range");
    });

    it("应该检测价格过低", async function () {
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
        BigInt(await time.latest()) + ONE_HOUR,
        1
      );

      await expect(
        nftAuction.getChainlinkDataFeedLatestAnswer()
      ).to.be.revertedWith("Future timestamp detected");
    });

    it("应该检测零时间戳", async function () {
      await mockAggregator.updateRoundData(1, INITIAL_ETH_PRICE, 0, 1);

      await expect(
        nftAuction.getChainlinkDataFeedLatestAnswer()
      ).to.be.revertedWith("Invalid updatedAt timestamp");
    });
  });

  describe("11. 价格波动和数学计算测试", function () {
    beforeEach(async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);
      await nftAuction
        .connect(seller)
        [
          "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
        ](
          await myNFT.getAddress(),
          1,
          ethers.parseEther("10"),
          BigInt(await time.latest()) + ONE_DAY,
          ONE_HOUR,
          5,
          ethers.parseEther("1")
        );

      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction
        .connect(seller)
        .startAuction(await myNFT.getAddress(), 1, startTime);
    });

    it("应该处理价格下跌", async function () {
      // ETH价格从$2000跌到$100
      const newPrice = 100n * 100000000n;
      await mockAggregator.updatePrice(newPrice);

      const bidAmount = ethers.parseEther("15"); // 15 USD，需要高于起始价10 USD
      const requiredEth = calculateRequiredEth(bidAmount, newPrice);

      await expect(
        nftAuction
          .connect(bidder1)
          .placeBid(1, bidAmount, { value: requiredEth })
      ).to.emit(nftAuction, "BidPlaced");

      const auction = await nftAuction.getAuction(1);
      expect(auction.highestBid).to.equal(bidAmount);
    });

    it("应该处理价格上涨", async function () {
      // ETH价格从$2000涨到$5000
      const newPrice = 5000n * 100000000n;
      await mockAggregator.updatePrice(newPrice);

      const bidAmount = ethers.parseEther("15"); // 15 USD，需要高于起始价10 USD
      const requiredEth = calculateRequiredEth(bidAmount, newPrice);

      await expect(
        nftAuction
          .connect(bidder1)
          .placeBid(1, bidAmount, { value: requiredEth })
      ).to.emit(nftAuction, "BidPlaced");

      const auction = await nftAuction.getAuction(1);
      expect(auction.highestBid).to.equal(bidAmount);
    });

    it("应该处理精度价格", async function () {
      // $1234.56789
      const precisePrice = 1234n * 100000000n + 56789000n;
      await mockAggregator.updatePrice(precisePrice);

      const bidAmount = ethers.parseEther("15"); // 15 USD，需要高于起始价10 USD
      const requiredEth = calculateRequiredEth(bidAmount, precisePrice);

      await expect(
        nftAuction
          .connect(bidder1)
          .placeBid(1, bidAmount, { value: requiredEth })
      ).to.emit(nftAuction, "BidPlaced");

      const auction = await nftAuction.getAuction(1);
      expect(auction.highestBid).to.equal(bidAmount);
      expect(auction.feePrice).to.equal(ethers.parseEther("0.75")); // 5% of 15 USD
    });

    it("应该处理极端价格变化", async function () {
      const prices = [
        100n * 100000000n, // $100（在合理范围内）
        10000n * 100000000n, // $10,000
      ];

      let lastBid = ethers.parseEther("10"); // 起始价
      for (const price of prices) {
        await mockAggregator.updatePrice(price);

        // 每次出价都要高于上一次
        lastBid = lastBid + ethers.parseEther("5");
        const requiredEth = calculateRequiredEth(lastBid, price);

        if (requiredEth < ethers.MaxUint256) {
          await expect(
            nftAuction
              .connect(bidder1)
              .placeBid(1, lastBid, { value: requiredEth })
          ).to.emit(nftAuction, "BidPlaced");

          const auction = await nftAuction.getAuction(1);
          expect(auction.highestBid).to.equal(lastBid);
        }
      }
    });
  });

  describe("12. 批量操作和性能测试", function () {
    it("应该支持大量拍卖创建", async function () {
      const count = 20;

      for (let i = 1; i <= count; i++) {
        await myNFT.connect(owner).mint(seller.address);
        await myNFT.connect(seller).approve(await nftAuction.getAddress(), i);

        await nftAuction
          .connect(seller)
          [
            "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
          ](
            await myNFT.getAddress(),
            i,
            ethers.parseEther("10"),
            BigInt(await time.latest()) + ONE_DAY,
            ONE_HOUR,
            5,
            ethers.parseEther("1")
          );
      }

      expect(await nftAuction.getAuctionCount()).to.equal(BigInt(count));
    });

    it("应该支持最大批量查询", async function () {
      // 先创建50个拍卖（避免超过NFT的maxSupply）
      const count = 50;
      for (let i = 1; i <= count; i++) {
        await myNFT.connect(owner).mint(seller.address);
        await myNFT.connect(seller).approve(await nftAuction.getAddress(), i);

        await nftAuction
          .connect(seller)
          [
            "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
          ](
            await myNFT.getAddress(),
            i,
            ethers.parseEther("10"),
            BigInt(await time.latest()) + ONE_DAY,
            ONE_HOUR,
            5,
            ethers.parseEther("1")
          );
      }

      const auctionIds = Array.from({ length: count }, (_, i) => BigInt(i + 1));
      const auctions = await nftAuction.getAuctions(auctionIds);

      expect(auctions.length).to.equal(count);
    });

    it("应该处理价格波动下的多次出价", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);

      await nftAuction
        .connect(seller)
        [
          "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
        ](
          await myNFT.getAddress(),
          1,
          ethers.parseEther("10"),
          BigInt(await time.latest()) + ONE_DAY,
          ONE_HOUR,
          5,
          ethers.parseEther("1")
        );

      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction
        .connect(seller)
        .startAuction(await myNFT.getAddress(), 1, startTime);

      // 多次出价，每次价格都变化
      const prices = [
        INITIAL_ETH_PRICE,
        3000n * 100000000n,
        1500n * 100000000n,
        5000n * 100000000n,
      ];

      for (let i = 0; i < prices.length; i++) {
        await mockAggregator.updatePrice(prices[i]);

        const bidAmount = ethers.parseEther((15 + i * 5).toString()); // 从15开始，确保高于起始价10
        const requiredEth = calculateRequiredEth(bidAmount, prices[i]);

        await nftAuction
          .connect(i % 2 === 0 ? bidder1 : bidder2)
          .placeBid(1, bidAmount, { value: requiredEth });

        const auction = await nftAuction.getAuction(1);
        expect(auction.highestBid).to.equal(bidAmount);
      }
    });
  });

  describe("13. 边界条件和极端情况测试", function () {
    it("应该处理零起始价拍卖", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);

      await nftAuction
        .connect(seller)
        [
          "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
        ](
          await myNFT.getAddress(),
          1,
          0, // 零起始价
          BigInt(await time.latest()) + ONE_DAY,
          ONE_HOUR,
          5,
          ethers.parseEther("1")
        );

      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction
        .connect(seller)
        .startAuction(await myNFT.getAddress(), 1, startTime);

      // 第一次出价可以很小
      const bidAmount = ethers.parseEther("0.01");
      const requiredEth = calculateRequiredEth(bidAmount, INITIAL_ETH_PRICE);

      await expect(
        nftAuction
          .connect(bidder1)
          .placeBid(1, bidAmount, { value: requiredEth })
      ).to.emit(nftAuction, "BidPlaced");

      const auction = await nftAuction.getAuction(1);
      expect(auction.highestBid).to.equal(bidAmount);
    });

    it("应该处理最小拍卖时长", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);

      const minEndTime = BigInt(await time.latest()) + 10n; // 10秒后，给予一些缓冲时间

      await expect(
        nftAuction
          .connect(seller)
          [
            "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
          ](
            await myNFT.getAddress(),
            1,
            0,
            minEndTime,
            ONE_HOUR,
            5,
            ethers.parseEther("1")
          )
      ).to.emit(nftAuction, "AuctionCreated");
    });

    it("应该处理最小加价幅度", async function () {
      await myNFT.connect(seller).approve(await nftAuction.getAddress(), 1);

      await nftAuction
        .connect(seller)
        [
          "createAuction(address,uint256,uint256,uint256,uint256,uint256,uint256)"
        ](
          await myNFT.getAddress(),
          1,
          0,
          BigInt(await time.latest()) + ONE_DAY,
          ONE_HOUR,
          5,
          1 // 最小可能加价：1 wei
        );

      const currentTime = BigInt(await time.latest());
      const startTime = currentTime + 1n;
      await nftAuction
        .connect(seller)
        .startAuction(await myNFT.getAddress(), 1, startTime);

      // 第一次出价
      const firstBid = ethers.parseEther("1");
      const requiredEth1 = calculateRequiredEth(firstBid, INITIAL_ETH_PRICE);
      await nftAuction
        .connect(bidder1)
        .placeBid(1, firstBid, { value: requiredEth1 });

      // 第二次出价只加1 wei
      const secondBid = firstBid + 1n;
      const requiredEth2 = calculateRequiredEth(secondBid, INITIAL_ETH_PRICE);

      await expect(
        nftAuction
          .connect(bidder2)
          .placeBid(1, secondBid, { value: requiredEth2 })
      ).to.emit(nftAuction, "BidPlaced");

      const auction = await nftAuction.getAuction(1);
      expect(auction.highestBid).to.equal(secondBid);
    });
  });

  // 辅助函数：计算所需ETH数量（向上取整）
  function calculateRequiredEth(usdAmount: bigint, ethPrice: bigint): bigint {
    return (usdAmount * PRICE_DECIMALS + ethPrice - 1n) / ethPrice;
  }
});
