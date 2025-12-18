import { ethers } from "hardhat";
import { expect } from "chai";
import deployment_sepolia from "../deployments/sepolia-deployment.json";
import deployment_localhost from "../deployments/localhost-deployment.json";
import { NextswapTimelock } from "../typechain-types";

/**
 * 测试时间锁合约地址有效性
 * Test NextswapTimelock contract address validity
 */
describe("检查时间锁地址是否有效", function () {
  let deployment: any;
  let chainId: number;

  before(async () => {
    // 获取当前网络的 chainId
    chainId = Number((await ethers.provider.getNetwork()).chainId);
    deployment =
      chainId === 11155111 ? deployment_sepolia : deployment_localhost;

    console.log(`\n🔍 当前网络 chainId: ${chainId}`);
    console.log(
      `📋 使用部署文件: ${chainId === 11155111 ? "sepolia" : "localhost"}\n`
    );
  });

  it("应该验证 NextswapTimelock 地址存在且有效", async function () {
    // 检查部署文件中是否包含 NextswapTimelock
    expect(deployment.contracts).to.have.property("NextswapTimelock");

    const timelockDeployment = deployment.contracts.NextswapTimelock;

    // 验证基本属性存在
    expect(timelockDeployment).to.have.property("proxyAddress");
    expect(timelockDeployment).to.have.property("contractName");
    expect(timelockDeployment.contractName).to.equal("NextswapTimelock");

    const timelockAddress = timelockDeployment.proxyAddress;

    console.log(`✅ 时间锁合约名称: ${timelockDeployment.contractName}`);
    console.log(`✅ 时间锁合约地址: ${timelockAddress}`);

    // 验证地址格式有效
    expect(ethers.isAddress(timelockAddress)).to.be.true;
    console.log(`✅ 地址格式验证通过`);

    // 验证地址不是零地址
    expect(timelockAddress).to.not.equal(ethers.ZeroAddress);
    console.log(`✅ 地址不是零地址`);
  });

  it("应该验证 NextswapTimelock 合约已部署且有代码", async function () {
    const timelockAddress = deployment.contracts.NextswapTimelock.proxyAddress;

    // 获取合约代码
    const code = await ethers.provider.getCode(timelockAddress);

    // 验证合约已部署（有字节码）
    expect(code).to.not.equal("0x");
    expect(code.length).to.be.greaterThan(2); // 至少有 "0x" + 实际代码

    console.log(`✅ 合约已部署，字节码长度: ${code.length} 字符`);
  });

  it("应该能够连接到 NextswapTimelock 合约实例", async function () {
    const timelockAddress = deployment.contracts.NextswapTimelock.proxyAddress;

    // 获取 ABI
    const timelockABI = deployment.contracts.NextswapTimelock.versions[0].abi;

    // 创建合约实例
    const timelockContract = await ethers.getContractAt(
      timelockABI,
      timelockAddress
    );

    expect(timelockContract).to.not.be.undefined;
    expect(await timelockContract.getAddress()).to.equal(timelockAddress);

    console.log(`✅ 成功连接到合约实例`);
    console.log(`✅ 合约地址: ${await timelockContract.getAddress()}`);
  });

  it("应该能够读取 NextswapTimelock 合约的最小延迟时间", async function () {
    const timelockAddress = deployment.contracts.NextswapTimelock.proxyAddress;

    // 创建合约实例 - 使用 typechain 类型
    const timelockContract = (await ethers.getContractAt(
      "NextswapTimelock",
      timelockAddress
    )) as NextswapTimelock;

    // 读取最小延迟时间
    const minDelay = await timelockContract.getMinDelay();

    expect(minDelay).to.be.a("bigint");
    expect(minDelay).to.be.greaterThanOrEqual(0n);

    const delayInSeconds = Number(minDelay);
    const delayInDays = delayInSeconds / 86400;

    console.log(`✅ 最小延迟时间: ${delayInSeconds} 秒`);
    console.log(`✅ 最小延迟时间: ${delayInDays.toFixed(2)} 天`);
  });

  it("应该能够验证 NextswapTimelock 的角色设置", async function () {
    const timelockAddress = deployment.contracts.NextswapTimelock.proxyAddress;

    // 创建合约实例 - 使用 typechain 类型
    const timelockContract = (await ethers.getContractAt(
      "NextswapTimelock",
      timelockAddress
    )) as NextswapTimelock;

    // 获取标准角色常量
    const PROPOSER_ROLE = await timelockContract.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelockContract.EXECUTOR_ROLE();
    const CANCELLER_ROLE = await timelockContract.CANCELLER_ROLE();
    const DEFAULT_ADMIN_ROLE = await timelockContract.DEFAULT_ADMIN_ROLE();

    console.log(`✅ PROPOSER_ROLE: ${PROPOSER_ROLE}`);
    console.log(`✅ EXECUTOR_ROLE: ${EXECUTOR_ROLE}`);
    console.log(`✅ CANCELLER_ROLE: ${CANCELLER_ROLE}`);
    console.log(`✅ DEFAULT_ADMIN_ROLE: ${DEFAULT_ADMIN_ROLE}`);

    // 验证角色值不为空
    expect(PROPOSER_ROLE).to.not.equal(ethers.ZeroHash);
    expect(EXECUTOR_ROLE).to.not.equal(ethers.ZeroHash);
    expect(CANCELLER_ROLE).to.not.equal(ethers.ZeroHash);
  });

  it("应该验证部署信息完整性", async function () {
    const timelockDeployment = deployment.contracts.NextswapTimelock;

    // 验证版本信息
    expect(timelockDeployment.versions).to.be.an("array");
    expect(timelockDeployment.versions.length).to.be.greaterThan(0);

    const latestVersion = timelockDeployment.versions[0];

    // 验证部署记录包含必要信息
    expect(latestVersion).to.have.property("address");
    expect(latestVersion).to.have.property("transactionHash");
    expect(latestVersion).to.have.property("blockNumber");
    expect(latestVersion).to.have.property("gasUsed");
    expect(latestVersion).to.have.property("deployer");
    expect(latestVersion).to.have.property("deployedAt");

    console.log(`✅ 合约地址: ${latestVersion.address}`);
    console.log(`✅ 交易哈希: ${latestVersion.transactionHash}`);
    console.log(`✅ 区块高度: ${latestVersion.blockNumber}`);
    console.log(`✅ Gas 消耗: ${latestVersion.gasUsed}`);
    console.log(`✅ 部署者: ${latestVersion.deployer}`);
    console.log(`✅ 部署时间: ${latestVersion.deployedAt}`);

    // 验证部署者地址有效
    expect(ethers.isAddress(latestVersion.deployer)).to.be.true;

    // 验证交易哈希格式
    expect(latestVersion.transactionHash).to.match(/^0x[a-fA-F0-9]{64}$/);
  });

  it("应该能够验证 NextswapTimelock 在链上的交易记录", async function () {
    const timelockDeployment = deployment.contracts.NextswapTimelock;
    const latestVersion = timelockDeployment.versions[0];

    // 获取部署交易
    const tx = await ethers.provider.getTransaction(
      latestVersion.transactionHash
    );

    expect(tx).to.not.be.null;

    if (tx) {
      console.log(`✅ 交易已找到`);
      console.log(`✅ 交易发送者: ${tx.from}`);
      console.log(`✅ 交易区块: ${tx.blockNumber}`);

      // 验证交易已确认
      expect(tx.blockNumber).to.be.greaterThan(0);

      // 获取交易收据
      const receipt = await ethers.provider.getTransactionReceipt(
        latestVersion.transactionHash
      );

      expect(receipt).to.not.be.null;

      if (receipt) {
        console.log(`✅ 交易状态: ${receipt.status === 1 ? "成功" : "失败"}`);
        console.log(`✅ Gas 实际消耗: ${receipt.gasUsed.toString()}`);

        // 验证交易成功
        expect(receipt.status).to.equal(1);

        // 验证合约地址匹配
        expect(receipt.contractAddress).to.not.be.null;
      }
    }
  });
});
