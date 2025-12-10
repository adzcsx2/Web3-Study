import { ethers } from "hardhat";
import { DeployHelper } from "../utils/DeployHelper";
import { getNetworkConfig, stringToBytes32 } from "../config/network-config";
import {
  NextswapV3Factory,
  NextswapV3Pool,
  NonfungibleTokenPositionDescriptor,
} from "../../typechain-types";

async function main() {
  const deployHelper = new DeployHelper();
  const [signer] = await ethers.getSigners();
  const ownerAddress = await signer.getAddress();
  console.log("Deploying contracts with the account:", ownerAddress);

  // 部署合约（自动保存）

  const chainId = (await ethers.provider.getNetwork()).chainId;

  // 部署 NonfungibleTokenPositionDescriptor
  const config = getNetworkConfig(Number(chainId));
  const { contract, versionInfo } =
    await deployHelper.deployContract<NonfungibleTokenPositionDescriptor>(
      "NonfungibleTokenPositionDescriptor",
      [
        config.WETH9,
        stringToBytes32("ETH"),
        config.DAI,
        config.USDC,
        config.USDT,
        config.TBTC,
        config.WBTC,
      ]
    );
  console.log("✅ 部署完成！");
  console.log("📍 地址:", versionInfo.address);
  //部署SwapRouter
  const { contract: swapRouterContract, versionInfo: swapRouterVersionInfo } =
    await deployHelper.deployContract("SwapRouter", [
      config.UNISWAP_V3_FACTORY,
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
