import { ethers } from "hardhat";

import deployInfo = require("../deployments/sepolia-deployment.json");
import { MyNFT } from "../typechain-types";

async function main() {
  const [signer] = await ethers.getSigners();
  const ownerAddress = await signer.getAddress();
  console.log("Minting NFT with the account:", ownerAddress);

  const myNFTContract = (await ethers.getContractAt(
    "MyNFT",
    deployInfo.contracts["MyNFT"].proxyAddress
  )) as MyNFT;

  //
  const tx = await myNFTContract.batchMint(ownerAddress, 5);
  const receipt = await tx.wait();

  if (receipt && receipt.status === 1) {
    console.log(`✅ Transaction successful! TX Hash: ${tx.hash}`);
    console.log(`📦 Block Number: ${receipt.blockNumber}`);
    console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
  } else {
    console.log("❌ Transaction failed!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
