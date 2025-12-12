import { ethers } from "hardhat";
import { DeployHelper } from "../scripts/utils/DeployHelper";
import {
  getNetworkConfig,
  stringToBytes32,
  NetworkTokenAddresses,
} from "../scripts/config/network-config";

import deployment from "../deployments/sepolia-deployment.json";
import { expect } from "chai";

describe("Liquidity Add Test", function () {
  this.timeout(600000); // 设置超时时间为 10 分钟
  let config: NetworkTokenAddresses;
  let signer;
  const npmAddress =
    deployment.contracts.NonfungiblePositionManager.proxyAddress;

  let usdcContract,
    daiContract,
    wethContract,
    usdtContract,
    tbtcContract,
    wbtcContract;

  this.beforeEach(async function () {
    config = getNetworkConfig(
      Number((await ethers.provider.getNetwork()).chainId)
    );
    signer = (await ethers.getSigners())[0];
  });

  it("能获取所有代币合约吗?", async function () {
    wethContract = await ethers.getContractAt("WETH9", config.WETH9);
    usdcContract = await ethers.getContractAt("ERC20", config.USDC);
    daiContract = await ethers.getContractAt("ERC20", config.DAI);
    usdtContract = await ethers.getContractAt("ERC20", config.USDT);
    tbtcContract = await ethers.getContractAt("ERC20", config.TBTC);
    wbtcContract = await ethers.getContractAt("ERC20", config.WBTC);

    expect(await usdcContract.getAddress()).to.equal(config.USDC);
    expect(await daiContract.getAddress()).to.equal(config.DAI);
    expect(await wethContract.getAddress()).to.equal(config.WETH9);
    expect(await usdtContract.getAddress()).to.equal(config.USDT);
    expect(await tbtcContract.getAddress()).to.equal(config.TBTC);
    expect(await wbtcContract.getAddress()).to.equal(config.WBTC);
    console.log("✅ 获取所有代币合约成功！");
  });
  it("能添加USDC-DAI流动性吗？", async function () {
    // 在这里编写添加USDC-DAI流动性的测试逻辑
    // 例如，部署合约、调用添加流动性的方法等
    // viem.getContract("");
  });
});
