import { ethers, network } from "hardhat";
import {
  getNetworkConfig,
  stringToBytes32,
  getNetworkName,
} from "../config/network-config";

/**
 * 部署 NonfungibleTokenPositionDescriptor 合约
 *
 * 使用方法：
 * npx hardhat run scripts/deploy_NonfungibleTokenPositionDescriptor.ts --network sepolia
 * npx hardhat run scripts/deploy_NonfungibleTokenPositionDescriptor.ts --network mainnet
 */
async function main() {
  console.log("\n🚀 开始部署 NonfungibleTokenPositionDescriptor 合约...\n");

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("📝 部署账户:", deployer.address);

  // 获取账户余额
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 账户余额:", ethers.formatEther(balance), "ETH\n");

  // 获取当前网络的 chainId
  const chainId = (await ethers.provider.getNetwork()).chainId;
  console.log("🌐 当前网络:", getNetworkName(Number(chainId)));
  console.log("🔗 Chain ID:", chainId.toString());

  // 获取网络配置
  const config = getNetworkConfig(Number(chainId));
  console.log("\n📋 网络配置:");
  console.log("  WETH9:", config.WETH9);
  console.log("  DAI:", config.DAI);
  console.log("  USDC:", config.USDC);
  console.log("  USDT:", config.USDT);
  console.log("  TBTC:", config.TBTC);
  console.log("  WBTC:", config.WBTC);
  console.log("  原生币标签:", config.nativeCurrencyLabel);

  // 将原生币标签转换为 bytes32
  const nativeCurrencyLabelBytes = stringToBytes32(config.nativeCurrencyLabel);
  console.log("  标签 (bytes32):", nativeCurrencyLabelBytes);

  // 检查是否有零地址（警告）
  const addresses = [
    config.DAI,
    config.USDC,
    config.USDT,
    config.TBTC,
    config.WBTC,
  ];
  const zeroAddressCount = addresses.filter(
    (addr) => addr === "0x0000000000000000000000000000000000000000"
  ).length;

  if (zeroAddressCount > 0) {
    console.log(
      `\n⚠️  警告: 发现 ${zeroAddressCount} 个零地址，这些代币在当前网络可能不存在`
    );
  }

  // 部署合约
  console.log("\n⏳ 正在部署合约...");
  const NonfungibleTokenPositionDescriptor = await ethers.getContractFactory(
    "NonfungibleTokenPositionDescriptor"
  );

  const descriptor = await NonfungibleTokenPositionDescriptor.deploy(
    config.WETH9,
    nativeCurrencyLabelBytes,
    config.DAI,
    config.USDC,
    config.USDT,
    config.TBTC,
    config.WBTC
  );

  await descriptor.waitForDeployment();
  const descriptorAddress = await descriptor.getAddress();

  console.log("\n✅ 合约部署成功!");
  console.log("📍 合约地址:", descriptorAddress);

  // 验证部署（读取合约状态）
  console.log("\n🔍 验证部署结果:");
  const deployedWETH9 = await descriptor.WETH9();
  const deployedDAI = await descriptor.DAI();
  const deployedUSDC = await descriptor.USDC();
  const nativeLabel = await descriptor.nativeCurrencyLabel();

  console.log("  WETH9:", deployedWETH9);
  console.log("  DAI:", deployedDAI);
  console.log("  USDC:", deployedUSDC);
  console.log("  原生币标签:", nativeLabel);

  // 保存部署信息到文件
  const fs = require("fs");
  const path = require("path");

  const deploymentInfo = {
    network: network.name,
    chainId: chainId.toString(),
    contractAddress: descriptorAddress,
    deployerAddress: deployer.address,
    timestamp: new Date().toISOString(),
    config: {
      WETH9: config.WETH9,
      DAI: config.DAI,
      USDC: config.USDC,
      USDT: config.USDT,
      TBTC: config.TBTC,
      WBTC: config.WBTC,
      nativeCurrencyLabel: config.nativeCurrencyLabel,
    },
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(
    deploymentsDir,
    `${network.name}-NonfungibleTokenPositionDescriptor.json`
  );
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n💾 部署信息已保存到:", deploymentFile);

  // 如果是测试网，提供 Etherscan 验证命令
  if (
    [
      "sepolia",
      "goerli",
      "mainnet",
      "polygon",
      "arbitrum",
      "optimism",
      "base",
    ].includes(network.name)
  ) {
    console.log("\n📝 验证合约命令 (Etherscan):");
    console.log(
      `npx hardhat verify --network ${network.name} ${descriptorAddress} "${config.WETH9}" "${nativeCurrencyLabelBytes}" "${config.DAI}" "${config.USDC}" "${config.USDT}" "${config.TBTC}" "${config.WBTC}"`
    );
  }

  console.log("\n🎉 部署流程完成!\n");
}

// 执行部署并处理错误
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ 部署失败:", error);
    process.exit(1);
  });
