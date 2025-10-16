import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { StackPledgeContract } from "../typechain-types";

describe("Gas消耗详细分析", function () {
  let deployer: SignerWithAddress;
  let stackContractImpl: StackPledgeContract;
  let deployerAddress: string;

  const stackContractAddressSepolia = "0x7F2ACE73294E8b5868d40051dbe81b2438eA17cE";

  this.beforeEach(async function () {
    [deployer] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();

    // 连接到已部署的合约实例
    stackContractImpl = (await ethers.getContractAt(
      "StackPledgeContract",
      stackContractAddressSepolia
    )) as StackPledgeContract;
  });

  it("Gas消耗详细分析", async function () {
    this.timeout(120000);

    console.log("=".repeat(80));
    console.log("Gas消耗和失败交易分析");
    console.log("=".repeat(80));

    // 1. 成功交易的gas消耗
    console.log("\n1. 成功交易:");
    const balanceBefore = await ethers.provider.getBalance(deployerAddress);
    const tx = await stackContractImpl.stake(111111110);
    const receipt = await tx.wait();
    const balanceAfter = await ethers.provider.getBalance(deployerAddress);
    
    const ethUsed = balanceBefore - balanceAfter;
    const gasPrice = receipt!.gasPrice;
    
    console.log("   - 交易哈希:", tx.hash);
    console.log("   - Gas消耗:", receipt?.gasUsed.toString());
    console.log("   - Gas价格:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
    console.log("   - ETH消耗:", ethers.formatEther(ethUsed));
    console.log("   - 区块号:", receipt?.blockNumber);
    console.log("   - 交易状态:", receipt?.status === 1 ? "✓ 成功" : "✗ 失败");

    // 2. 失败交易的gas消耗 (require方式)
    console.log("\n2. 失败交易 (require方式):");
    try {
      const balanceBeforeError1 = await ethers.provider.getBalance(deployerAddress);
      
      // 估算gas
      const estimatedGas = await stackContractImpl.stakeTest1.estimateGas(0).catch(() => {
        console.log("   - Gas估算: 无法估算 (交易会失败)");
        return BigInt(0);
      });
      
      const txError1 = await stackContractImpl.stakeTest1(0);
      const receiptError1 = await txError1.wait();
      
      const balanceAfterError1 = await ethers.provider.getBalance(deployerAddress);
      const ethUsedError1 = balanceBeforeError1 - balanceAfterError1;
      
      console.log("   - 交易哈希:", txError1.hash);
      console.log("   - Gas消耗:", receiptError1?.gasUsed.toString());
      console.log("   - ETH消耗:", ethers.formatEther(ethUsedError1));
    } catch (error: any) {
      console.log("   - 交易失败:", error.shortMessage || error.message);
      console.log("   - ⚠️ 注意: 即使交易失败，gas费用仍然会被扣除!");
      
      // 如果错误包含receipt信息
      if (error.receipt) {
        console.log("   - Gas消耗:", error.receipt.gasUsed?.toString());
        console.log("   - 交易状态:", error.receipt.status === 0 ? "✗ 失败但已上链" : "未知");
      }
    }

    // 3. 失败交易的gas消耗 (custom error方式)
    console.log("\n3. 失败交易 (custom error方式):");
    try {
      const balanceBeforeError2 = await ethers.provider.getBalance(deployerAddress);
      
      const txError2 = await stackContractImpl.stakeTest2(0);
      const receiptError2 = await txError2.wait();
      
      const balanceAfterError2 = await ethers.provider.getBalance(deployerAddress);
      const ethUsedError2 = balanceBeforeError2 - balanceAfterError2;
      
      console.log("   - 交易哈希:", txError2.hash);
      console.log("   - Gas消耗:", receiptError2?.gasUsed.toString());
      console.log("   - ETH消耗:", ethers.formatEther(ethUsedError2));
    } catch (error: any) {
      console.log("   - 交易失败:", error.shortMessage || error.message);
      console.log("   - ⚠️ Custom error通常比require消耗更少gas");
      
      if (error.receipt) {
        console.log("   - Gas消耗:", error.receipt.gasUsed?.toString());
        console.log("   - 交易状态:", error.receipt.status === 0 ? "✗ 失败但已上链" : "未知");
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("总结:");
    console.log("1. 成功交易: gas会被完全消耗，交易状态为1");
    console.log("2. 失败交易: gas仍然会被消耗，但交易状态为0");
    console.log("3. 超时不等于失败: 如果网络慢但交易最终成功，gas正常消耗");
    console.log("4. 真正失败: 只有在交易被拒绝或revert时才会失败但仍消耗gas");
    console.log("=".repeat(80));
  });

  it("查询链上信息", async function () {
    console.log("\n" + "=".repeat(80));
    console.log("链上信息查询");
    console.log("=".repeat(80));

    // 合约信息
    const contractAddress = await stackContractImpl.getAddress();
    console.log("合约地址:", contractAddress);
    
    // 网络信息
    const network = await ethers.provider.getNetwork();
    console.log("网络名称:", network.name);
    console.log("链ID:", network.chainId.toString());
    
    // 区块信息
    const blockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNumber);
    console.log("当前区块号:", blockNumber);
    console.log("区块时间戳:", new Date(block!.timestamp * 1000).toLocaleString());
    console.log("区块哈希:", block!.hash);
    
    // 账户信息
    console.log("部署者地址:", deployerAddress);
    const balance = await ethers.provider.getBalance(deployerAddress);
    console.log("部署者余额:", ethers.formatEther(balance), "ETH");
    
    // 合约代码验证
    const code = await ethers.provider.getCode(contractAddress);
    console.log("合约代码长度:", code.length, "字节");
    console.log("合约已部署:", code !== "0x" ? "✓ 是" : "✗ 否");

    // Gas价格信息
    const feeData = await ethers.provider.getFeeData();
    console.log("当前Gas价格:", ethers.formatUnits(feeData.gasPrice || 0, "gwei"), "gwei");
    
    console.log("=".repeat(80));
  });
});