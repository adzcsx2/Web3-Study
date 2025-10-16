import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Sign } from "crypto";
import { ethers } from "hardhat";
import { MetaNodeToken, StackPledgeContract } from "../typechain-types";

describe("StackPledgeContract", function () {
  let deployer: SignerWithAddress;
  let recipient: SignerWithAddress;
  let deployerAddress: string;
  let recipientAddress: string;

  //MetaNodeToken
  let metaNodeTokenImpl: MetaNodeToken;
  let metaNodeTokenAddress: string;
  let metaNodeTokenProxyAddress: string;
  //stackPledge
  let stackContractImpl: StackPledgeContract;
  let stackContractAddress: string;
  let stackContractProxyAddress: string;

  this.beforeEach(async function () {
    console.log("-----------------------------------------------------------");

    //部署MetaNodeToken合约
    const MetaNodeToken = await ethers.getContractFactory("MetaNodeToken");
    const metaNodeToken = await MetaNodeToken.deploy();
    await metaNodeToken.waitForDeployment();
    metaNodeTokenAddress = await metaNodeToken.getAddress();

    //部署代理合约
    const metaNodeProxy = await ethers.getContractFactory("ProxyContract");
    const metaNodeProxyInstance = await metaNodeProxy.deploy(
      metaNodeTokenAddress,
      "0x"
    );
    await metaNodeProxyInstance.waitForDeployment();
    metaNodeTokenProxyAddress = await metaNodeProxyInstance.getAddress();

    //绑定代理合约
    metaNodeTokenImpl = (await metaNodeToken.attach(
      metaNodeTokenProxyAddress
    )) as MetaNodeToken;

    //部署StackPledgeContract合约
    const StackPledgeContract = await ethers.getContractFactory(
      "StackPledgeContract"
    );
    const stackContract = await StackPledgeContract.deploy();
    await stackContract.waitForDeployment();
    stackContractAddress = await stackContract.getAddress();

    //部署代理合约
    const proxy = await ethers.getContractFactory("ProxyContract");
    const proxyInstance = await proxy.deploy(stackContractAddress, "0x");
    await proxyInstance.waitForDeployment();
    stackContractProxyAddress = await proxyInstance.getAddress();

    stackContractImpl = (await stackContract.attach(
      stackContractProxyAddress
    )) as StackPledgeContract;

    [deployer, recipient] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
    recipientAddress = await recipient.getAddress();

    console.log("StackPledgeContract Address:", stackContractAddress);
    console.log("ProxyContract Address:", stackContractProxyAddress);
    console.log("Deployer Address:", deployerAddress);
    console.log("Recipient Address:", recipientAddress);
    console.log("ProxyContract deployed to:", stackContractProxyAddress);
    console.log(
      "StackPledgeContract Version:",
      await stackContractImpl.CONTRACT_VERSION()
    );

    //初始化合约
    await stackContractImpl.initialize(metaNodeTokenProxyAddress);
    console.log("StackPledgeContract initialized");
    console.log("-----------------------------------------------------------");
  });

  it("测试gas消耗", async function () {
    const tx = await stackContractImpl.stake(111111110);
    const receipt = await tx.wait();
    console.log("正常:", receipt?.gasUsed.toString());

    const tx1 = await stackContractImpl.stakeTest1(0).catch((error) => {
      console.log("错误1:", error.message);
      return null;
    });

    const tx1Receipt = await tx1?.wait();
    console.log("错误1:", tx1Receipt?.gasUsed.toString());

    const tx2 = await stackContractImpl.stakeTest2(0).catch((error) => {
      console.log("错误2:", error.message);
      return null;
    });
    const tx2Receipt = await tx2?.wait();
    console.log("错误2:", tx2Receipt?.gasUsed.toString());

    console.log("-----------------------------------------------------------");
  });
});
