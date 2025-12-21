import { ethers } from "hardhat";

async function main() {
  const accounts = await ethers.getSigners();
  for (let i = 0; i < 5; i++) {
    const privateKey = (await accounts[i].privateKey).toString();
    console.log(`Account ${i}:`);
    console.log(`  Address: ${accounts[i].address}`);
    console.log(`  Private Key: ${privateKey}`);
    console.log();
  }
}

main()
  .then(() => {})
  .catch((error) => {
    console.error(error);
  });
