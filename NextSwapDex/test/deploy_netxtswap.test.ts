import { ethers } from "hardhat";
import { DeployHelper } from "../scripts/utils/DeployHelper";
import {
  getNetworkConfig,
  stringToBytes32,
  NetworkTokenAddresses,
} from "../scripts/config/network-config";

import deployment_sepolia from "../deployments/sepolia-deployment.json";
import deployment_localhost from "../deployments/localhost-deployment.json";

import { expect } from "chai";

describe("Deploy NetxtSwap Periphery Contracts", function () {
  this.timeout(600000); // 设置超时时间为 10 分钟
  let deployHelper: DeployHelper;
  let config: NetworkTokenAddresses;
  let deployment: any;

  const NextswapV3FactoryName = "NextswapV3Factory";
  const NFTDescriptorName = "NFTDescriptor";
  const NonfungibleTokenPositionDescriptorName =
    "NonfungibleTokenPositionDescriptor";
  const NonfungiblePositionManagerName = "NonfungiblePositionManager";
  const SwapRouterName = "SwapRouter";
  const QuoterName = "QuoterV2";

  beforeEach(async () => {
    deployHelper = new DeployHelper();
    // 在每个测试前初始化 config
    const chainId = (await ethers.provider.getNetwork()).chainId;
    config = getNetworkConfig(Number(chainId));

    deployment =
      Number(chainId) === 11155111 ? deployment_sepolia : deployment_localhost;
  });
  afterEach(async function () {
    // 跳过 pending 或 skipped 测试（可选）
    if (this.currentTest?.state !== "passed") return;

    await new Promise((resolve) => setTimeout(resolve, 500)); // 暂停 500ms
  });

  it.only("应该按顺序一次性部署所有合约", async function () {
    console.log("\n🚀 开始部署所有NextSwap合约...\n");

    // 1. 部署 NextswapV3Factory
    console.log("📦 [1/6] 部署 NextswapV3Factory...");
    const { contract: factoryContract, versionInfo: factoryVersionInfo } =
      await deployHelper.deployContract(NextswapV3FactoryName, []);
    console.log("✅ NextswapV3Factory 部署完成！");
    console.log("📍 地址:", factoryVersionInfo.address);
    expect(factoryVersionInfo.address).to.be.a("string").that.is.not.empty;

    // 更新deployment对象，用于后续部署
    if (!deployment.contracts) deployment.contracts = {};
    if (!deployment.contracts.NextswapV3Factory)
      deployment.contracts.NextswapV3Factory = {};
    deployment.contracts.NextswapV3Factory.proxyAddress =
      factoryVersionInfo.address;

    // 2. 部署 NFTDescriptor 库
    console.log("\n📦 [2/6] 部署 NFTDescriptor 库...");
    const {
      name: nftDescName,
      address: nftDescAddress,
      transactionHash: nftDescTxHash,
    } = await deployHelper.deployLibrary(NFTDescriptorName);
    expect(nftDescName).to.equal(NFTDescriptorName);
    expect(nftDescAddress).to.be.a("string").that.is.not.empty;
    console.log("✅ NFTDescriptor 部署完成！");
    console.log("📍 地址:", nftDescAddress);

    // 更新deployment对象
    if (!deployment.contracts.NFTDescriptor)
      deployment.contracts.NFTDescriptor = {};
    deployment.contracts.NFTDescriptor.proxyAddress = nftDescAddress;

    // 3. 部署 NonfungibleTokenPositionDescriptor
    console.log("\n📦 [3/6] 部署 NonfungibleTokenPositionDescriptor...");
    const libFullPath = await deployHelper.getContractSourcePath(
      NFTDescriptorName
    );
    const { contract: nftPosDescContract, versionInfo: nftPosDescVersionInfo } =
      await deployHelper.deployContract(
        NonfungibleTokenPositionDescriptorName,
        [
          config.WETH9,
          stringToBytes32("ETH"),
          config.DAI,
          config.USDC,
          config.USDT,
          config.TBTC,
          config.WBTC,
        ],
        {
          libraries: {
            [libFullPath]: nftDescAddress,
          },
        }
      );
    console.log("✅ NonfungibleTokenPositionDescriptor 部署完成！");
    console.log("📍 地址:", nftPosDescVersionInfo.address);
    expect(nftPosDescVersionInfo.address).to.be.a("string").that.is.not.empty;

    // 更新deployment对象
    if (!deployment.contracts.NonfungibleTokenPositionDescriptor)
      deployment.contracts.NonfungibleTokenPositionDescriptor = {};
    deployment.contracts.NonfungibleTokenPositionDescriptor.proxyAddress =
      nftPosDescVersionInfo.address;

    // 4. 部署 SwapRouter
    console.log("\n📦 [4/6] 部署 SwapRouter...");
    const { contract: swapRouterContract, versionInfo: swapRouterVersionInfo } =
      await deployHelper.deployContract(SwapRouterName, [
        factoryVersionInfo.address,
        config.WETH9,
      ]);
    console.log("✅ SwapRouter 部署完成！");
    console.log("📍 地址:", swapRouterVersionInfo.address);
    expect(swapRouterVersionInfo.address).to.be.a("string").that.is.not.empty;

    // 更新deployment对象
    if (!deployment.contracts.SwapRouter) deployment.contracts.SwapRouter = {};
    deployment.contracts.SwapRouter.proxyAddress =
      swapRouterVersionInfo.address;

    // 5. 部署 QuoterV2
    console.log("\n📦 [5/6] 部署 QuoterV2...");
    const { contract: quoterContract, versionInfo: quoterVersionInfo } =
      await deployHelper.deployContract(QuoterName, [
        factoryVersionInfo.address,
        config.WETH9,
      ]);
    console.log("✅ QuoterV2 部署完成！");
    console.log("📍 地址:", quoterVersionInfo.address);
    expect(quoterVersionInfo.address).to.be.a("string").that.is.not.empty;

    // 更新deployment对象
    if (!deployment.contracts.QuoterV2) deployment.contracts.QuoterV2 = {};
    deployment.contracts.QuoterV2.proxyAddress = quoterVersionInfo.address;

    // 6. 部署 NonfungiblePositionManager
    console.log("\n📦 [6/6] 部署 NonfungiblePositionManager...");
    const { contract: npmContract, versionInfo: npmVersionInfo } =
      await deployHelper.deployContract(NonfungiblePositionManagerName, [
        factoryVersionInfo.address,
        config.WETH9,
        nftPosDescVersionInfo.address,
      ]);
    console.log("✅ NonfungiblePositionManager 部署完成！");
    console.log("📍 地址:", npmVersionInfo.address);
    expect(npmVersionInfo.address).to.be.a("string").that.is.not.empty;

    // 更新deployment对象
    if (!deployment.contracts.NonfungiblePositionManager)
      deployment.contracts.NonfungiblePositionManager = {};
    deployment.contracts.NonfungiblePositionManager.proxyAddress =
      npmVersionInfo.address;

    console.log("\n🎉 所有合约部署完成！");
    console.log("\n📋 部署摘要:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("NextswapV3Factory:", factoryVersionInfo.address);
    console.log("NFTDescriptor:", nftDescAddress);
    console.log(
      "NonfungibleTokenPositionDescriptor:",
      nftPosDescVersionInfo.address
    );
    console.log("SwapRouter:", swapRouterVersionInfo.address);
    console.log("QuoterV2:", quoterVersionInfo.address);
    console.log("NonfungiblePositionManager:", npmVersionInfo.address);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  });

  it("应该能验证 NextswapV3Factory", async function () {
    if (!deployment.contracts?.NextswapV3Factory?.proxyAddress) {
      console.log("❌ NextswapV3Factory 未部署，跳过验证");
      this.skip();
    }

    const isSuccess = await deployHelper.verifyContract(
      NextswapV3FactoryName,
      deployment.contracts.NextswapV3Factory.proxyAddress,
      []
    );
    expect(isSuccess).to.be.true;
    console.log("✅ 测试通过：NextswapV3Factory 验证流程完成！");
  });

  it("应该能验证 NFTDescriptor 库", async function () {
    if (!deployment.contracts?.NFTDescriptor?.proxyAddress) {
      console.log("❌ NFTDescriptor 未部署，跳过验证");
      this.skip();
    }

    const isSuccess = await deployHelper.verifyContract(
      NFTDescriptorName,
      deployment.contracts.NFTDescriptor.proxyAddress,
      []
    );
    expect(isSuccess).to.be.true;
    console.log("✅ 测试通过：NFTDescriptor 验证流程完成！");
  });

  it("应该能验证 NonfungibleTokenPositionDescriptor 合约", async function () {
    if (
      !deployment.contracts?.NonfungibleTokenPositionDescriptor?.proxyAddress
    ) {
      console.log("❌ NonfungibleTokenPositionDescriptor 未部署，跳过验证");
      this.skip();
    }

    const isSuccess = await deployHelper.verifyContract(
      NonfungibleTokenPositionDescriptorName,
      deployment.contracts.NonfungibleTokenPositionDescriptor.proxyAddress,
      [
        config.WETH9,
        stringToBytes32("ETH"),
        config.DAI,
        config.USDC,
        config.USDT,
        config.TBTC,
        config.WBTC,
      ]
    );
    expect(isSuccess).to.be.true;
    console.log(
      "✅ 测试通过：NonfungibleTokenPositionDescriptor 验证流程完成！"
    );
  });

  it("应该能验证 SwapRouter", async function () {
    if (!deployment.contracts?.SwapRouter?.proxyAddress) {
      console.log("❌ SwapRouter 未部署，跳过验证");
      this.skip();
    }

    const isSuccess = await deployHelper.verifyContract(
      SwapRouterName,
      deployment.contracts.SwapRouter.proxyAddress,
      [deployment.contracts.NextswapV3Factory.proxyAddress, config.WETH9]
    );
    expect(isSuccess).to.be.true;
    console.log("✅ 测试通过：SwapRouter 验证流程完成！");
  });

  it("应该能验证 QuoterV2", async function () {
    if (!deployment.contracts?.QuoterV2?.proxyAddress) {
      console.log("❌ QuoterV2 未部署，跳过验证");
      this.skip();
    }

    const isSuccess = await deployHelper.verifyContract(
      QuoterName,
      deployment.contracts.QuoterV2.proxyAddress,
      [deployment.contracts.NextswapV3Factory.proxyAddress, config.WETH9]
    );
    expect(isSuccess).to.be.true;
    console.log("✅ 测试通过：QuoterV2 验证流程完成！");
  });

  it("应该能验证 NonfungiblePositionManager 合约", async function () {
    if (!deployment.contracts?.NonfungiblePositionManager?.proxyAddress) {
      console.log("❌ NonfungiblePositionManager 未部署，跳过验证");
      this.skip();
    }

    const isSuccess = await deployHelper.verifyContract(
      NonfungiblePositionManagerName,
      deployment.contracts.NonfungiblePositionManager.proxyAddress,
      [
        deployment.contracts.NextswapV3Factory.proxyAddress,
        config.WETH9,
        deployment.contracts.NonfungibleTokenPositionDescriptor.proxyAddress,
      ]
    );
    expect(isSuccess).to.be.true;
    console.log("✅ 测试通过：NonfungiblePositionManager 验证流程完成！");
  });
});
