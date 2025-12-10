import { ethers } from "hardhat";
import { DeployHelper } from "../utils/DeployHelper";
import { getNetworkConfig, stringToBytes32 } from "../config/network-config";
import { NonfungibleTokenPositionDescriptor } from "../../typechain-types";

import deployment from "../../deployments/sepolia-deployment.json";

const deployHelper = new DeployHelper();
let NFTDescriptorName = "NFTDescriptor";
let NonfungibleTokenPositionDescriptorName =
  "NonfungibleTokenPositionDescriptor";

async function main() {
  const [signer] = await ethers.getSigners();
  const ownerAddress = await signer.getAddress();
  console.log("Deploying contracts with the account:", ownerAddress);

  // 部署 NonfungibleTokenPositionDescriptor
  await deployNonfungibleTokenPositionDescriptor();
}
// 部署 NonfungibleTokenPositionDescriptor
async function deployNonfungibleTokenPositionDescriptor() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const config = getNetworkConfig(Number(chainId));

  const { name, address, transactionHash } = await deployHelper.deployLibrary(
    NFTDescriptorName
  );
  console.log("✅ 部署完成！");
  console.log("📍 地址:", address);
  // 确保库已部署

  let isSuccess = await deployHelper.verifyContract(
    deployment.contracts.NFTDescriptor.proxyAddress,
    [],
    NFTDescriptorName
  );
  if (isSuccess) {
    console.log("✅ NFTDescriptor测试通过：库验证流程完成！");
  } else {
    console.log("❌ NFTDescriptor库验证失败！");
  }

  const libFullPath = await deployHelper.getContractSourcePath(
    NFTDescriptorName
  );
  const { contract, versionInfo } = await deployHelper.deployContract(
    NonfungibleTokenPositionDescriptorName,
    [
      config.WETH9,
      stringToBytes32("ETH"),
      config.DAI,
      config.USDC,
      config.USDT,
      config.TBTC,
      config.WBTC,
    ],
    {
      libraries: {
        [libFullPath]: deployment.contracts.NFTDescriptor.proxyAddress,
      },
    }
  );
  console.log("✅ 部署完成！");
  console.log("📍 地址:", versionInfo.address);

  const contractAddress =
    deployment.contracts.NonfungibleTokenPositionDescriptor.proxyAddress;

  console.log("正在验证合约:", contractAddress);
  isSuccess = await deployHelper.verifyContract(
    contractAddress,
    [
      config.WETH9,
      stringToBytes32("ETH"),
      config.DAI,
      config.USDC,
      config.USDT,
      config.TBTC,
      config.WBTC,
    ],
    "NonfungibleTokenPositionDescriptor"
  );

  if (isSuccess) {
    console.log(
      "✅ $NonfungibleTokenPositionDescriptor测试通过：合约验证流程完成！"
    );
  } else {
    console.log("❌ NonfungibleTokenPositionDescriptor合约验证失败！");
  }
}

async function deploySwapRouter() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const config = getNetworkConfig(Number(chainId));
  //部署SwapRouter
  const { contract: swapRouterContract, versionInfo: swapRouterVersionInfo } =
    await deployHelper.deployContract("SwapRouter", [
      deployment.contracts.NextswapV3Factory.proxyAddress,
      config.WETH9,
    ]);
  console.log("✅ 部署完成！");
  console.log("📍 地址:", swapRouterVersionInfo.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
