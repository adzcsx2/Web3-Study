import { ethers } from "hardhat";
import deployment_localhost from "../deployments/localhost-deployment.json";

describe("调试挖矿时间", function () {
  it("查看挖矿时间配置", async function () {
    const deployment = deployment_localhost;
    const liquidityMiningAddr =
      deployment.contracts.LiquidityMiningReward.proxyAddress;

    const liquidityMining = await ethers.getContractAt(
      "LiquidityMiningReward",
      liquidityMiningAddr
    );

    const startTime = await liquidityMining.startTime();
    const endTime = await liquidityMining.endTime();
    const claimDeadline = await liquidityMining.claimDeadline();

    const currentTime =
      (await ethers.provider.getBlock("latest"))?.timestamp || 0;

    console.log("\n====== 挖矿时间配置 ======");
    console.log(
      "当前时间:",
      new Date(currentTime * 1000).toLocaleString(),
      `(${currentTime})`
    );
    console.log(
      "开始时间:",
      new Date(Number(startTime) * 1000).toLocaleString(),
      `(${startTime})`
    );
    console.log(
      "结束时间 (4年后):",
      new Date(Number(endTime) * 1000).toLocaleString(),
      `(${endTime})`
    );
    console.log(
      "领取截止 (5年后):",
      new Date(Number(claimDeadline) * 1000).toLocaleString(),
      `(${claimDeadline})`
    );
    console.log("\n====== 时间差 ======");
    console.log(
      "距离开始:",
      Math.floor((Number(startTime) - currentTime) / 86400),
      "天"
    );
    console.log(
      "距离结束:",
      Math.floor((Number(endTime) - currentTime) / 86400),
      "天"
    );
    console.log(
      "距离截止:",
      Math.floor((Number(claimDeadline) - currentTime) / 86400),
      "天"
    );
  });
});
