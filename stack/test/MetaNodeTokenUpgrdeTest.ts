import { ethers } from "hardhat";
import { MetaNodeToken, MetaNodeTokenV2 } from "../typechain-types";
import { expect } from "chai";
import { sign } from "crypto";

describe("MetaNodeToken Upgrade Test", function () {
  it("should upgrade MetaNodeToken contract successfully", async function () {
    const [deployer, receipter] = await ethers.getSigners();

    console.log("Deployer address:", await deployer.getAddress());
    console.log("Receipter address:", await receipter.getAddress());

    //部署MetaNode实现合约
    const MetaNodeTokenFactory = await ethers.getContractFactory(
      "MetaNodeToken"
    );
    const metaNodeTokenImpl = await MetaNodeTokenFactory.deploy();
    await metaNodeTokenImpl.waitForDeployment();

    //部署MetaNode代理合约
    const MetaNodeProxyFactory = await ethers.getContractFactory(
      "ProxyContract"
    );

    const metaNodeProxy = (await MetaNodeProxyFactory.deploy(
      await metaNodeTokenImpl.getAddress(),
      "0x"
    )) as MetaNodeToken;
    await metaNodeProxy.waitForDeployment();
    const metaNodeProxyAddress = await metaNodeProxy.getAddress();

    const metaNodeToken = await ethers.getContractAt(
      "MetaNodeToken",
      metaNodeProxyAddress
    );
    //调用初始化函数
    await metaNodeToken.initialize();

    const version = await metaNodeToken.getTokenVersion();

    console.log("Token version:", version);

    expect(version).to.equal(1);


    console.log("-------------------------开始升级 MetaNodeToken 合约...---------------");
    //先部署新合约
    const MetaNodeTokenV2Factory = await ethers.getContractFactory(
      "MetaNodeTokenV2"
    );
    const metaNodeV2 = await MetaNodeTokenV2Factory.deploy();
    await metaNodeV2.waitForDeployment();

    // 获取实例合约
    const MetaNodeTokenImpl = await ethers.getContractAt("MetaNodeToken", metaNodeProxyAddress);

    // 在UUPS模式下，升级函数在实现合约中，而不是代理合约中
    const tx = await MetaNodeTokenImpl.upgradeToAndCall(
      await metaNodeV2.getAddress(),
      "0x" // 空的调用数据
    );
    await tx.wait();

    console.log("升级成功", tx.hash);

    //使用新接口调用
    const metaNodeTokenV2 = (await ethers.getContractAt(
      "MetaNodeTokenV2",
      metaNodeProxyAddress
    )) as MetaNodeTokenV2;

    const version2 = await metaNodeTokenV2.getTokenVersion();
    expect(version2).to.equal(2);

    console.log("New Token version:", version2);
  });
});
