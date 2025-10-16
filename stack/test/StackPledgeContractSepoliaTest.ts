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

  const metaNodeTokenAddressSepolia =
    "0xF2BEDE6379269C2cD5b262217B3e3515AB38d723"; // 替换为实际地址
  const metaNodeTokenProxyAddressSepolia =
    "0xB712806586ef3c3f4d9F28aCBC11179875202Aa4"; // 替换为实际地址
  const deployerAddressSepolia = "0x1ABfBBDfcB2313fA295bFedC942982d1b632B498"; // 替换为实际地址

  const stackContractAddressSepolia =
    "0x7F2ACE73294E8b5868d40051dbe81b2438eA17cE";

  this.beforeEach(async function () {
    [deployer] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();

    console.log("-----------------------------------------------------------");

    //已经部署成功stackPledge,拿到地址获取实例
    stackContractImpl = (await ethers.getContractAt(
      "StackPledgeContract",
      stackContractAddressSepolia
    )) as StackPledgeContract;
    stackContractAddress = stackContractAddressSepolia;
    stackContractProxyAddress = stackContractAddressSepolia;

    // //部署StackPledgeContract合约
    // const StackPledgeContract = await ethers.getContractFactory(
    //   "StackPledgeContract"
    // );
    // const stackContract = await StackPledgeContract.deploy();
    // await stackContract.waitForDeployment();
    // stackContractAddress = await stackContract.getAddress();

    // //部署代理合约
    // const proxy = await ethers.getContractFactory("ProxyContract");
    // const proxyInstance = await proxy.deploy(stackContractAddress, "0x");
    // await proxyInstance.waitForDeployment();
    // stackContractProxyAddress = await proxyInstance.getAddress();

    // stackContractImpl = (await stackContract.attach(
    //   stackContractProxyAddress
    // )) as StackPledgeContract;

    // console.log("StackPledgeContract Address:", stackContractAddress);
    // console.log("ProxyContract Address:", stackContractProxyAddress);
    // console.log("Deployer Address:", deployerAddress);

    // //初始化合约
    // await stackContractImpl.initialize(metaNodeTokenProxyAddressSepolia);
    // console.log("StackPledgeContract initialized");
    // console.log("-----------------------------------------------------------");
  });

  // it("部署MetaNode", async function () {
  //   console.log("-----------------------------------------------------------");
  //   //部署MetaNodeToken合约
  //   const MetaNodeToken = await ethers.getContractFactory("MetaNodeToken");
  //   const metaNodeToken = await MetaNodeToken.deploy();
  //   await metaNodeToken.waitForDeployment();
  //   metaNodeTokenAddress = await metaNodeToken.getAddress();

  //   //部署代理合约
  //   const metaNodeProxy = await ethers.getContractFactory("ProxyContract");
  //   const metaNodeProxyInstance = await metaNodeProxy.deploy(
  //     metaNodeTokenAddress,
  //     "0x"
  //   );
  //   await metaNodeProxyInstance.waitForDeployment();
  //   metaNodeTokenProxyAddress = await metaNodeProxyInstance.getAddress();

  //   //绑定代理合约
  //   metaNodeTokenImpl = (await metaNodeToken.attach(
  //     metaNodeTokenProxyAddress
  //   )) as MetaNodeToken;

  //   console.log("MetaNodeToken Address:", metaNodeTokenAddress);
  //   console.log("ProxyContract Address:", metaNodeTokenProxyAddress);
  //   console.log("Deployer Address:", deployerAddress);
  //   console.log("ProxyContract deployed to:", metaNodeTokenProxyAddress);
  //   console.log(
  //     "MetaNodeToken Version:",
  //     await metaNodeTokenImpl.CONTRACT_VERSION()
  //   );
  //   console.log("-----------------------------------------------------------");
  // });
  // it("部署stackPledge", async function () {
  //   console.log("-----------------------------------------------------------");
  //   //部署StackPledgeContract合约
  //   const StackPledgeContract = await ethers.getContractFactory(
  //     "StackPledgeContract"
  //   );
  //   const stackContract = await StackPledgeContract.deploy();
  //   await stackContract.waitForDeployment();
  //   stackContractAddress = await stackContract.getAddress();

  //   //部署代理合约
  //   const proxy = await ethers.getContractFactory("ProxyContract");
  //   const proxyInstance = await proxy.deploy(stackContractAddress, "0x");
  //   await proxyInstance.waitForDeployment();
  //   stackContractProxyAddress = await proxyInstance.getAddress();

  //   stackContractImpl = (await stackContract.attach(
  //     stackContractProxyAddress
  //   )) as StackPledgeContract;

  //   console.log("StackPledgeContract Address:", stackContractAddress);
  //   console.log("ProxyContract Address:", stackContractProxyAddress);
  //   console.log("Deployer Address:", deployerAddress);

  //   //初始化合约
  //   await stackContractImpl.initialize(metaNodeTokenProxyAddress);
  //   console.log("StackPledgeContract initialized");
  //   console.log("-----------------------------------------------------------");
  // });

  it("测试gas消耗和链上信息", async function () {
    this.timeout(120000); // 增加超时时间到120秒

    // console.log("开始测试正常情况...");
    // // 正常情况测试
    // const tx = await stackContractImpl.stake(111111110);
    // const receipt = await tx.wait();
    // console.log("正常情况 - Gas消耗:", receipt?.gasUsed.toString());
    // console.log("正常情况 - 交易哈希:", tx.hash);
    // console.log("正常情况 - 区块号:", receipt?.blockNumber);
    // console.log("正常情况 - 区块哈希:", receipt?.blockHash);
    // console.log("正常情况 - 交易状态:", receipt?.status === 1 ? "成功" : "失败");

    // console.log("\n开始测试错误情况1 (require方式)...");
    // 错误情况测试1 - require方式

    let balance = ethers.formatEther(
      await ethers.provider.getBalance(deployerAddress)
    );

    console.log("部署者余额:", balance, "ETH");
    try {
      const tx1 = await stackContractImpl.stakeTest1(0);
      const tx1Receipt = await tx1.wait();
      console.log("错误1 - Gas消耗:", tx1Receipt?.gasUsed.toString());
      console.log("错误1 - 交易哈希:", tx1.hash);
    } catch (error: any) {
      console.log("错误1 - 交易失败:", error.message);
      console.log("错误1 - 是否消耗gas: 是的，gas在执行revert时被消耗");

      // 尝试获取失败交易的gas消耗（如果可能）
      if (error.receipt) {
        console.log("错误1 - 实际gas消耗:", error.receipt.gasUsed?.toString());
      }
    }

    let new_balance = ethers.formatEther(
      await ethers.provider.getBalance(deployerAddress)
    );

    console.log("消耗了:", Number(new_balance) - Number(balance), "ETH");

    balance = new_balance;

    console.log("\n开始测试错误情况2 (custom error方式)...");
    // 错误情况测试2 - custom error方式
    try {
      const tx2 = await stackContractImpl.stakeTest2(0);
      const tx2Receipt = await tx2.wait();
      console.log("错误2 - Gas消耗:", tx2Receipt?.gasUsed.toString());
      console.log("错误2 - 交易哈希:", tx2.hash);
    } catch (error: any) {
      console.log("错误2 - 交易失败:", error.message);
      console.log(
        "错误2 - 是否消耗gas: 是的，custom error比require消耗更少gas"
      );

      // 尝试获取失败交易的gas消耗（如果可能）
      if (error.receipt) {
        console.log("错误2 - 实际gas消耗:", error.receipt.gasUsed?.toString());
      }
    }

    console.log("\n--- 链上信息查询 ---");
    console.log("合约地址:", await stackContractImpl.getAddress());
    console.log("当前区块号:", await ethers.provider.getBlockNumber());
    console.log("部署者地址:", deployerAddress);
    new_balance = ethers.formatEther(
      await ethers.provider.getBalance(deployerAddress)
    );

    console.log("消耗了:", Number(new_balance) - Number(balance), "ETH");

    balance = new_balance;
    console.log("余额:", balance, "ETH");

    console.log("-----------------------------------------------------------");
  });
});
