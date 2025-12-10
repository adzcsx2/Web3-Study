import { DeployHelper } from "../utils/DeployHelper";
import { MyNFT, MyNFT2 } from "../../typechain-types";
import { ethers } from "hardhat";
import hre from "hardhat";

async function main() {
  const deployHelper = new DeployHelper();

  // 读取部署信息获取代理地址
  const networkName = hre.network.name;
  const deploymentFilePath = `./deployments/${networkName}-deployment.json`;

  // 检查网络
  if (networkName === "hardhat") {
    console.log("⚠️  警告：hardhat 网络是临时网络，每次重启都会重置");
    console.log("建议：");
    console.log("1. 使用 'npx hardhat node' 启动本地节点");
    console.log("2. 使用 '--network localhost' 部署和升级");
    console.log("");
  }

  // 要升级到的新合约名称
  const newContractName = "MyNFT2";

  const deploymentInfo = require(`../deployments/${networkName}-deployment.json`);
  const proxyAddress = deploymentInfo.contracts["MyNFT"].proxyAddress;
  // 验证代理合约是否存在
  try {
    const code = await ethers.provider.getCode(proxyAddress);
    if (code === "0x") {
      console.error(`❌ 错误：地址 ${proxyAddress} 上没有合约`);
      console.error("");
      console.error("可能原因：");
      console.error("1. 使用 hardhat 网络时，需要在同一个会话中部署和升级");
      console.error("2. 或者使用持久化的本地节点：");
      console.error("   - 终端1: npx hardhat node");
      console.error(
        "   - 终端2: npx hardhat run script/deploy_NFT.ts --network localhost"
      );
      console.error(
        "   - 终端2: npx hardhat run script/deploy_upgrade.ts --network localhost"
      );
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ 无法连接到网络: ${error}`);
    process.exit(1);
  }

  // 升级合约（自动保存）
  const { contract, versionInfo, newImplementation } =
    await deployHelper.upgradeProxy<MyNFT2>(proxyAddress, newContractName);

  console.log("✅ 升级完成！");
  console.log("📦 新版本:", await (contract as MyNFT).getVersion());
  console.log("📍 新实现地址:", newImplementation);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
