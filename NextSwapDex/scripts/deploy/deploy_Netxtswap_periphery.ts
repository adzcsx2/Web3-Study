import { ethers } from "hardhat";
import { DeployHelper } from "../utils/DeployHelper";
import { getNetworkConfig, stringToBytes32 } from "../config/network-config";
import {
  NonfungibleTokenPositionDescriptor,
} from "../../typechain-types";

import deployment from "../../deployments/sepolia-deployment.json";

const deployHelper = new DeployHelper();

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
  const NonfungibleTokenPositionDescriptorName =
    "NonfungibleTokenPositionDescriptor";

  const { name, address, fullPath, transactionHash } =
    await deployHelper.deployLibrary("NFTDescriptor");

  const { contract, versionInfo } =
    await deployHelper.deployContract<NonfungibleTokenPositionDescriptor>(
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
          [fullPath]: address,
        },
      }
    );
  console.log("✅ 部署完成！");
  console.log("📍 地址:", versionInfo.address);
  console.log("📍 contract:", contract);

  await deployHelper.verifyContract(
    versionInfo.address,
    [
      config.WETH9,
      stringToBytes32("ETH"),
      config.DAI,
      config.USDC,
      config.USDT,
      config.TBTC,
      config.WBTC,
    ],
    NonfungibleTokenPositionDescriptorName
  );
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
