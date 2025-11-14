import { ethers } from "hardhat";
import { DeployHelper } from "./utils/DeployHelper";
import { MyNFT } from "../typechain-types";

async function main() {
  const deployHelper = new DeployHelper();
  const [signer] = await ethers.getSigners();
  const ownerAddress = await signer.getAddress();
  console.log("Deploying contracts with the account:", ownerAddress);

  const tokenName = "MyNFT";
  const tokenSymbol = "MNFT";
  const decimals = 0;

  // 部署合约（自动保存）
  const { contract, versionInfo } = await deployHelper.deployProxy<MyNFT>(
    "MyNFT",
    [tokenName, tokenSymbol, ownerAddress, 500, ownerAddress],
    {
      kind: "uups",
      initializer: "initialize",
      tokenMetadata: {
        name: tokenName,
        symbol: tokenSymbol,
        decimals: decimals,
      }
    }
  );

  console.log("✅ 部署完成！");
  console.log("📦 代币名称:", tokenName);
  console.log("📦 版本:", await (contract as MyNFT).getVersion());
  console.log("📍 地址:", versionInfo.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
