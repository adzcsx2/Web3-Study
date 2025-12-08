import { ethers } from "hardhat";

import deployInfo = require("../deployments/sepolia-deployment.json");
import { MyNFT } from "../typechain-types";

async function main() {
  const tokenId = 4; // 要转移的NFT的tokenId

  const [signer] = await ethers.getSigners();
  const ownerAddress = await signer.getAddress();
  console.log("ownerAddress:", ownerAddress);

  const myNFTContract = (await ethers.getContractAt(
    "MyNFT",
    deployInfo.contracts["MyNFT"].proxyAddress
  )) as MyNFT;
  //向0xa70025124a21070b3a025188f5c26440fc9fe0ab地址转移tokenId的NFT

  //判断当前signer是否为tokenId的拥有者
  const currentOwner = await myNFTContract.ownerOf(tokenId);
  if (currentOwner.toLowerCase() !== ownerAddress.toLowerCase()) {
    console.error(`❌ 当前账户不是tokenId ${tokenId} 的拥有者，无法转移！`);
    return;
  }
  // 转账

  const tx = await myNFTContract.transferFrom(
    ownerAddress,
    "0xa70025124a21070b3a025188f5c26440fc9fe0ab",
    tokenId
  );
  const receipt = await tx.wait();
  if (receipt && receipt.status === 1) {
    console.log(`✅ Transaction successful! TX Hash: ${tx.hash}`);
    console.log(`📦 Block Number: ${receipt.blockNumber}`);
    console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
  } else {
    console.log("❌ Transaction failed!");
    console.log(receipt);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
