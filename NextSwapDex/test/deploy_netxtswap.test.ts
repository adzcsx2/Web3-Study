import { ethers } from "hardhat";
import { DeployHelper } from "../scripts/utils/DeployHelper";
import {
  getNetworkConfig,
  stringToBytes32,
  NetworkTokenAddresses,
} from "../scripts/config/network-config";

import deployment from "../deployments/sepolia-deployment.json";
import { expect } from "chai";

describe("Deploy NetxtSwap Periphery Contracts", function () {
  this.timeout(600000); // 设置超时时间为 10 分钟
  let deployHelper: DeployHelper;
  let config: NetworkTokenAddresses;

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
  });

  it.only("应该能部署NextswapV3Factory", async function () {
    //部署SwapRouter
    const { contract, versionInfo } = await deployHelper.deployContract(
      NextswapV3FactoryName,
      []
    );
    console.log("✅ 部署完成！");
    console.log("📍 地址:", versionInfo.address);
    expect(versionInfo.address).to.be.a("string").that.is.not;
  });

  it("应该能验证NextswapV3Factory", async function () {
    const isSuccess = await deployHelper.verifyContract(
      NextswapV3FactoryName,
      deployment.contracts.NextswapV3Factory.proxyAddress,
      []
    );
    expect(isSuccess).to.be.true;
    console.log("✅ 测试通过：合约验证流程完成！");
  });

  it("应该可以部署NFTDescriptor库", async function () {
    const { name, address, transactionHash } = await deployHelper.deployLibrary(
      NFTDescriptorName
    );
    expect(name).to.equal(NFTDescriptorName);
    expect(address).to.be.a("string").that.is.not.empty;
    console.log("✅ 部署完成！");
    console.log("📍 地址:", address);
  });

  it("应该能验证 NFTDescriptor 库", async function () {
    // 确保库已部署
    if (!deployment.contracts.NFTDescriptor) {
      this.skip(); // 如果库未部署，跳过测试
    }
    const isSuccess = await deployHelper.verifyContract(
      NFTDescriptorName,
      deployment.contracts.NFTDescriptor.proxyAddress,
      []
    );
    expect(isSuccess).to.be.true;
    console.log("✅ 测试通过：库验证流程完成！");
  });

  it("应该可以部署NonfungibleTokenPositionDescriptor", async function () {
    const libFullPath = await deployHelper.getContractSourcePath(
      NFTDescriptorName
    );
    const { contract, versionInfo } = await deployHelper.deployContract(
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
          [libFullPath]: deployment.contracts.NFTDescriptor.proxyAddress,
        },
      }
    );
    console.log("✅ 部署完成！");
    console.log("📍 地址:", versionInfo.address);
    // 断言versionInfo.address应该有值且不为空
    expect(versionInfo.address).to.be.a("string").that.is.not.empty;
  });

  it("应该能验证 NonfungibleTokenPositionDescriptor 合约", async function () {
    // 确保合约已部署
    if (!deployment.contracts.NonfungibleTokenPositionDescriptor) {
      this.skip(); // 如果合约未部署，跳过测试
    }

    const contractAddress =
      deployment.contracts.NonfungibleTokenPositionDescriptor.proxyAddress;

    console.log("正在验证合约:", contractAddress);
    const isSuccess = await deployHelper.verifyContract(
      "NonfungibleTokenPositionDescriptor",
      contractAddress,
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

    console.log("✅ 测试通过：合约验证流程完成！");
  });

  it("应该能部署 NonfungiblePositionManager 合约", async function () {
    //部署SwapRouter
    const { contract, versionInfo } = await deployHelper.deployContract(
      NonfungiblePositionManagerName,
      [
        deployment.contracts.NextswapV3Factory.proxyAddress,
        config.WETH9,
        deployment.contracts.NonfungibleTokenPositionDescriptor.proxyAddress,
      ]
    );
    console.log("✅ 部署完成！");
    console.log("📍 地址:", versionInfo.address);
    expect(versionInfo.address).to.be.a("string").that.is.not;
  });

  it("应该能验证 NonfungiblePositionManager 合约", async function () {
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
    console.log("✅ 测试通过：合约验证流程完成！");
  });

  it("应该能部署deploySwapRouter", async function () {
    //部署SwapRouter
    const { contract: swapRouterContract, versionInfo: swapRouterVersionInfo } =
      await deployHelper.deployContract(SwapRouterName, [
        deployment.contracts.NextswapV3Factory.proxyAddress,
        config.WETH9,
      ]);
    console.log("✅ 部署完成！");
    console.log("📍 地址:", swapRouterVersionInfo.address);
    expect(swapRouterVersionInfo.address).to.be.a("string").that.is.not;
  });

  it("应该能验证deploySwapRouter", async function () {
    const isSuccess = await deployHelper.verifyContract(
      SwapRouterName,
      deployment.contracts.SwapRouter.proxyAddress,
      [deployment.contracts.NextswapV3Factory.proxyAddress, config.WETH9]
    );
    expect(isSuccess).to.be.true;
    console.log("✅ 测试通过：合约验证流程完成！");
  });

  it("应该能部署Quoter", async function () {
    //部署SwapRouter
    const { contract, versionInfo } = await deployHelper.deployContract(
      QuoterName,
      [deployment.contracts.NextswapV3Factory.proxyAddress, config.WETH9]
    );
    console.log("✅ 部署完成！");
    console.log("📍 地址:", versionInfo.address);
    expect(versionInfo.address).to.be.a("string").that.is.not;
  });

  it("应该能验证Quoter", async function () {
    const isSuccess = await deployHelper.verifyContract(
      QuoterName,
      deployment.contracts.QuoterV2.proxyAddress,
      [deployment.contracts.NextswapV3Factory.proxyAddress, config.WETH9]
    );
    expect(isSuccess).to.be.true;
    console.log("✅ 测试通过：合约验证流程完成！");
  });
});
