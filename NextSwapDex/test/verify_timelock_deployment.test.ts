import { ethers } from "hardhat";
import { expect } from "chai";
import deployment_localhost from "../deployments/localhost-deployment.json";

/**
 * 验证时间锁部署配置
 * 确保所有合约都使用 NextswapTimelock 作为唯一的时间锁地址
 */
describe("验证时间锁部署配置", function () {
  let deployment: any;
  let timelockAddress: string;

  before(async () => {
    const chainId = Number((await ethers.provider.getNetwork()).chainId);
    deployment = deployment_localhost;

    console.log(`\n🔍 验证网络: chainId ${chainId}`);

    // 获取 NextswapTimelock 地址
    timelockAddress = deployment.contracts.NextswapTimelock?.proxyAddress;

    if (!timelockAddress) {
      throw new Error("NextswapTimelock 未部署");
    }

    console.log(`\n📋 NextswapTimelock 合约地址: ${timelockAddress}\n`);
  });

  describe("验证所有合约的时间锁配置", function () {
    it("NextswapToken 应该使用 NextswapTimelock 地址", async function () {
      const tokenAddress = deployment.contracts.NextswapToken?.proxyAddress;

      if (!tokenAddress) {
        console.log("⏭️  跳过: NextswapToken 未部署");
        this.skip();
        return;
      }

      const tokenContract = await ethers.getContractAt(
        "NextswapToken",
        tokenAddress
      );

      const configuredTimelock = await tokenContract.timelock();

      console.log(`✅ NextswapToken: ${tokenAddress}`);
      console.log(`   配置的时间锁: ${configuredTimelock}`);
      console.log(`   预期时间锁: ${timelockAddress}`);
      console.log(
        `   状态: ${
          configuredTimelock === timelockAddress ? "✅ 正确" : "❌ 错误"
        }\n`
      );

      expect(configuredTimelock).to.equal(
        timelockAddress,
        "NextswapToken 的时间锁地址不正确"
      );
    });

    it("LiquidityMiningReward 应该使用 NextswapTimelock 地址", async function () {
      const lmAddress =
        deployment.contracts.LiquidityMiningReward?.proxyAddress;

      if (!lmAddress) {
        console.log("⏭️  跳过: LiquidityMiningReward 未部署");
        this.skip();
        return;
      }

      const lmContract = await ethers.getContractAt(
        "LiquidityMiningReward",
        lmAddress
      );

      const configuredTimelock = await lmContract.timelock();

      console.log(`✅ LiquidityMiningReward: ${lmAddress}`);
      console.log(`   配置的时间锁: ${configuredTimelock}`);
      console.log(`   预期时间锁: ${timelockAddress}`);
      console.log(
        `   状态: ${
          configuredTimelock === timelockAddress ? "✅ 正确" : "❌ 错误"
        }\n`
      );

      expect(configuredTimelock).to.equal(
        timelockAddress,
        "LiquidityMiningReward 的时间锁地址不正确"
      );
    });

    it("LpPoolManager 应该授予 NextswapTimelock TIMELOCK_ROLE", async function () {
      const lpmAddress = deployment.contracts.LpPoolManager?.proxyAddress;

      if (!lpmAddress) {
        console.log("⏭️  跳过: LpPoolManager 未部署");
        this.skip();
        return;
      }

      const lpmContract = await ethers.getContractAt(
        "LpPoolManager",
        lpmAddress
      );

      const TIMELOCK_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("TIMELOCK_ROLE")
      );
      const hasRole = await lpmContract.hasRole(TIMELOCK_ROLE, timelockAddress);

      console.log(`✅ LpPoolManager: ${lpmAddress}`);
      console.log(`   NextswapTimelock 拥有 TIMELOCK_ROLE: ${hasRole}`);
      console.log(`   状态: ${hasRole ? "✅ 正确" : "❌ 错误"}\n`);

      expect(hasRole).to.be.true;
    });
  });

  describe("验证 NextswapToken 的角色配置", function () {
    it("NextswapTimelock 应该拥有 TIMELOCK_ROLE", async function () {
      const tokenAddress = deployment.contracts.NextswapToken?.proxyAddress;

      if (!tokenAddress) {
        this.skip();
        return;
      }

      const tokenContract = await ethers.getContractAt(
        "NextswapToken",
        tokenAddress
      );

      const TIMELOCK_ROLE = ethers.keccak256(
        ethers.toUtf8Bytes("TIMELOCK_ROLE")
      );
      const hasRole = await tokenContract.hasRole(
        TIMELOCK_ROLE,
        timelockAddress
      );

      console.log(`✅ NextswapTimelock 拥有 TIMELOCK_ROLE: ${hasRole}`);

      expect(hasRole).to.be.true;
    });

    it("NextswapTimelock 应该拥有 DEFAULT_ADMIN_ROLE", async function () {
      const tokenAddress = deployment.contracts.NextswapToken?.proxyAddress;

      if (!tokenAddress) {
        this.skip();
        return;
      }

      const tokenContract = await ethers.getContractAt(
        "NextswapToken",
        tokenAddress
      );

      const DEFAULT_ADMIN_ROLE = await tokenContract.DEFAULT_ADMIN_ROLE();
      const hasRole = await tokenContract.hasRole(
        DEFAULT_ADMIN_ROLE,
        timelockAddress
      );

      console.log(
        `✅ NextswapTimelock 不能拥有 DEFAULT_ADMIN_ROLE: ${hasRole}`
      );

      expect(hasRole).to.be.false;
    });
  });

  describe("总结报告", function () {
    it("生成时间锁配置总结", async function () {
      console.log("\n" + "=".repeat(80));
      console.log("📊 时间锁配置总结报告");
      console.log("=".repeat(80));
      console.log(`\n🔒 NextswapTimelock 合约地址: ${timelockAddress}\n`);

      const results: { contract: string; status: string; detail: string }[] =
        [];

      // 检查 NextswapToken
      if (deployment.contracts.NextswapToken?.proxyAddress) {
        const tokenContract = await ethers.getContractAt(
          "NextswapToken",
          deployment.contracts.NextswapToken.proxyAddress
        );
        const timelock = await tokenContract.timelock();
        const isCorrect = timelock === timelockAddress;

        results.push({
          contract: "NextswapToken",
          status: isCorrect ? "✅" : "❌",
          detail: isCorrect
            ? "时间锁地址正确"
            : `错误: ${timelock.substring(0, 10)}...`,
        });
      }

      // 检查 LiquidityMiningReward
      if (deployment.contracts.LiquidityMiningReward?.proxyAddress) {
        const lmContract = await ethers.getContractAt(
          "LiquidityMiningReward",
          deployment.contracts.LiquidityMiningReward.proxyAddress
        );
        const timelock = await lmContract.timelock();
        const isCorrect = timelock === timelockAddress;

        results.push({
          contract: "LiquidityMiningReward",
          status: isCorrect ? "✅" : "❌",
          detail: isCorrect
            ? "时间锁地址正确"
            : `错误: ${timelock.substring(0, 10)}...`,
        });
      }

      // 检查 LpPoolManager
      if (deployment.contracts.LpPoolManager?.proxyAddress) {
        const lpmContract = await ethers.getContractAt(
          "LpPoolManager",
          deployment.contracts.LpPoolManager.proxyAddress
        );
        const TIMELOCK_ROLE = ethers.keccak256(
          ethers.toUtf8Bytes("TIMELOCK_ROLE")
        );
        const hasRole = await lpmContract.hasRole(
          TIMELOCK_ROLE,
          timelockAddress
        );

        results.push({
          contract: "LpPoolManager",
          status: hasRole ? "✅" : "❌",
          detail: hasRole ? "拥有 TIMELOCK_ROLE" : "未授予 TIMELOCK_ROLE",
        });
      }

      // 打印结果表格
      console.log("合约配置状态:");
      console.log("-".repeat(80));
      results.forEach((r) => {
        console.log(`${r.status} ${r.contract.padEnd(25)} | ${r.detail}`);
      });
      console.log("-".repeat(80));

      const allCorrect = results.every((r) => r.status === "✅");
      console.log(
        `\n${
          allCorrect ? "✅ 所有配置正确！" : "⚠️  存在配置问题，请检查上述错误"
        }\n`
      );

      expect(allCorrect).to.be.true;
    });
  });
});
