// scripts/deploy-meta-node-token.ts

import { ethers } from "hardhat";

async function main() {
  // 输出部署地址
  console.log("🚀 Starting MetaNodeToken Deployment...\n");
}

export default main;

// 执行主函数
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
