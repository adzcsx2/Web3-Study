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

  //Token实现地址
  const metaNodeTokenAddressSepolia =
    "0x28532adfD6eaF4bd56A2b142bEE1B9EE0a13152C";
  //Token代理地址
  const metaNodeTokenProxyAddressSepolia =
    "0xAB0CE015038945e4f115e0dA011D0DEdcA491DfA";

  const stackContractAddressSepolia =
    "0x7F2ACE73294E8b5868d40051dbe81b2438eA17cE";

  this.beforeEach(async function () {
    // 设置2分钟防止合约超时
    this.timeout(120 * 1000);
    [deployer] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();

    console.log("-----------------------------------------------------------");

    await initTokenWithAddress();
  });

  // it("部署MetaNode", async function () {
  //   // await initTokenWithDeploy();
  // });
  // it("部署stackPledge", async function () {
  //   await initStackWithDeploy();
  // });

  it("测试给自己转100W代币", async function () {
    console.log("-----------------------------------------------------------");
    console.log("Deployer Address:", deployerAddress);
    //获取余额
    let balance = await metaNodeTokenImpl.balanceOf(deployerAddress);
    console.log(
      "Deployer MetaNodeToken Balance:",
      ethers.formatEther(balance.toString()),
      " MTN"
    );

    const tx = await metaNodeTokenImpl.mint(
      deployerAddress,
      1_000_000n * 10n ** 18n
    );

    await tx?.wait();
    console.log("Transfer tx hash:", tx?.hash);

    balance = await metaNodeTokenImpl.balanceOf(deployerAddress);
    console.log(
      "Deployer MetaNodeToken Balance:",
      ethers.formatEther(balance.toString()),
      " MTN"
    );
  });

  // 部署stack合约
  async function initStackWithDeploy() {
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

    console.log("StackPledgeContract Address:", stackContractAddress);
    console.log("ProxyContract Address:", stackContractProxyAddress);
    console.log("Deployer Address:", deployerAddress);

    //初始化合约
    await stackContractImpl.initialize(metaNodeTokenProxyAddressSepolia);
    console.log("StackPledgeContract initialized");
    console.log("-----------------------------------------------------------");
  }

  //有地址之后初始化
  async function initTokenWithAddress() {
    metaNodeTokenImpl = (await ethers.getContractAt(
      "MetaNodeToken",
      metaNodeTokenProxyAddressSepolia
    )) as MetaNodeToken;
    metaNodeTokenAddress = metaNodeTokenAddressSepolia;
    metaNodeTokenProxyAddress = metaNodeTokenProxyAddressSepolia;
    console.log("MetaNodeToken Address:", metaNodeTokenAddress);
    console.log("MetaNodeToken Proxy Address:", metaNodeTokenProxyAddress);

    //已经部署成功stackPledge,拿到地址获取实例
    stackContractImpl = (await ethers.getContractAt(
      "StackPledgeContract",
      stackContractAddressSepolia
    )) as StackPledgeContract;
    stackContractAddress = stackContractAddressSepolia;
    stackContractProxyAddress = stackContractAddressSepolia;
    console.log("StackPledgeContract Address:", stackContractAddress);
    console.log(
      "StackPledgeContract Proxy Address:",
      stackContractProxyAddress
    );
  }
  //部署Token合约之后初始化
  async function initTokenWithDeploy() {
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

    console.log("MetaNodeToken Address:", metaNodeTokenAddress);
    console.log("ProxyContract Address:", metaNodeTokenProxyAddress);
    console.log("Deployer Address:", deployerAddress);
    console.log("ProxyContract deployed to:", metaNodeTokenProxyAddress);
    console.log(
      "MetaNodeToken Version:",
      await metaNodeTokenImpl.CONTRACT_VERSION()
    );

    let balance = await metaNodeTokenImpl.balanceOf(deployerAddress);
    console.log(
      "Deployer MetaNodeToken Balance:",
      ethers.formatEther(balance.toString()),
      "MTN"
    );
    const tx = await metaNodeTokenImpl.initialize();
    await tx.wait();
    console.log("MetaNodeToken initialized");
    balance = await metaNodeTokenImpl.balanceOf(deployerAddress);
    console.log(
      "Deployer MetaNodeToken Balance:",
      ethers.formatEther(balance.toString()),
      "MTN"
    );
    console.log("-----------------------------------------------------------");
  }
});
