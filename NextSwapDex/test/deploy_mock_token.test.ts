import { ethers } from "hardhat";
import { DeployHelper } from "../scripts/utils/DeployHelper";
import {
  getNetworkConfig,
  stringToBytes32,
  NetworkTokenAddresses,
} from "../scripts/config/network-config";

import { expect } from "chai";

describe("部署测试代币Token合约", function () {
  this.timeout(600000); // 设置超时时间为 10 分钟
  const deployHelper = new DeployHelper();

  afterEach(async function () {
    // 跳过 pending 或 skipped 测试（可选）
    if (this.currentTest?.state !== "passed") return;

    await new Promise((resolve) => setTimeout(resolve, 500)); // 暂停0.5秒
  });

  it("应该能部署DAI合约", async function () {
    const { contract, versionInfo } = await deployHelper.deployContract("DAI");
    expect(versionInfo.address).to.be.a("string").that.is.not.empty;
    console.log("✅ 部署完成！");
  });
  it("应该能部署TBTC合约", async function () {
    const { contract, versionInfo } = await deployHelper.deployContract("TBTC");
    expect(versionInfo.address).to.be.a("string").that.is.not.empty;
    console.log("✅ 部署完成！");
  });
  it("应该能部署USDC合约", async function () {
    const { contract, versionInfo } = await deployHelper.deployContract("USDC");
    expect(versionInfo.address).to.be.a("string").that.is.not.empty;
    console.log("✅ 部署完成！");
  });
  it("应该能部署USDT合约", async function () {
    const { contract, versionInfo } = await deployHelper.deployContract("USDT");
    expect(versionInfo.address).to.be.a("string").that.is.not.empty;
    console.log("✅ 部署完成！");
  });
  it("应该能部署WBTC合约", async function () {
    const { contract, versionInfo } = await deployHelper.deployContract("WBTC");
    expect(versionInfo.address).to.be.a("string").that.is.not.empty;
    console.log("✅ 部署完成！");
  });
  it("应该能部署WETH9合约", async function () {
    const { contract, versionInfo } = await deployHelper.deployContract(
      "WETH9"
    );
    expect(versionInfo.address).to.be.a("string").that.is.not.empty;
    console.log("✅ 部署完成！");
  });
});
