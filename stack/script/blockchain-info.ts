import { ethers } from "hardhat";

async function main() {
  console.log("=".repeat(80));
  console.log("区块链信息查询工具");
  console.log("=".repeat(80));

  // 获取网络信息
  const network = await ethers.provider.getNetwork();
  console.log("网络信息:");
  console.log("  - 网络名称:", network.name);
  console.log("  - 链ID:", network.chainId.toString());
  
  // 获取当前区块信息
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  console.log("\n当前区块信息:");
  console.log("  - 区块号:", blockNumber);
  console.log("  - 区块哈希:", block!.hash);
  console.log("  - 时间戳:", new Date(block!.timestamp * 1000).toLocaleString());
  console.log("  - 交易数量:", block!.transactions.length);

  // 合约地址
  const stackContractAddress = "0x7F2ACE73294E8b5868d40051dbe81b2438eA17cE";
  const metaNodeTokenProxyAddress = "0xB712806586ef3c3f4d9F28aCBC11179875202Aa4";
  
  console.log("\n合约信息:");
  console.log("  - StackPledgeContract:", stackContractAddress);
  console.log("  - MetaNodeToken Proxy:", metaNodeTokenProxyAddress);

  // 检查合约代码
  const stackCode = await ethers.provider.getCode(stackContractAddress);
  const tokenCode = await ethers.provider.getCode(metaNodeTokenProxyAddress);
  
  console.log("\n合约部署状态:");
  console.log("  - StackPledgeContract:", stackCode !== "0x" ? "✓ 已部署" : "✗ 未部署");
  console.log("  - MetaNodeToken Proxy:", tokenCode !== "0x" ? "✓ 已部署" : "✗ 未部署");

  // 获取账户信息
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);
  
  console.log("\n账户信息:");
  console.log("  - 地址:", deployerAddress);
  console.log("  - 余额:", ethers.formatEther(balance), "ETH");

  // Gas价格信息
  const feeData = await ethers.provider.getFeeData();
  console.log("\nGas信息:");
  console.log("  - 当前Gas价格:", ethers.formatUnits(feeData.gasPrice || 0, "gwei"), "gwei");
  if (feeData.maxFeePerGas) {
    console.log("  - 最大费用:", ethers.formatUnits(feeData.maxFeePerGas, "gwei"), "gwei");
  }
  if (feeData.maxPriorityFeePerGas) {
    console.log("  - 优先费用:", ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei"), "gwei");
  }

  // 查询最近的交易 (如果有交易哈希)
  console.log("\n最近区块的交易:");
  if (block!.transactions.length > 0) {
    const recentTxs = block!.transactions.slice(-3); // 最近3笔交易
    for (let i = 0; i < recentTxs.length; i++) {
      const tx = await ethers.provider.getTransaction(recentTxs[i]);
      console.log(`  ${i + 1}. ${tx!.hash.substring(0, 20)}... -> ${tx!.to || 'Contract Creation'}`);
    }
  } else {
    console.log("  当前区块无交易");
  }

  console.log("\n" + "=".repeat(80));
}

// 专门查询指定交易的详细信息
async function queryTransaction(txHash: string) {
  console.log("=".repeat(80));
  console.log("交易详细信息查询");
  console.log("=".repeat(80));

  try {
    const tx = await ethers.provider.getTransaction(txHash);
    const receipt = await ethers.provider.getTransactionReceipt(txHash);

    if (!tx || !receipt) {
      console.log("交易未找到或未确认");
      return;
    }

    console.log("基本信息:");
    console.log("  - 交易哈希:", tx.hash);
    console.log("  - 发送者:", tx.from);
    console.log("  - 接收者:", tx.to || "合约创建");
    console.log("  - 金额:", ethers.formatEther(tx.value), "ETH");
    console.log("  - Nonce:", tx.nonce);

    console.log("\nGas信息:");
    console.log("  - Gas限制:", tx.gasLimit.toString());
    console.log("  - Gas使用:", receipt.gasUsed.toString());
    console.log("  - Gas价格:", ethers.formatUnits(tx.gasPrice || 0, "gwei"), "gwei");
    console.log("  - Gas效率:", ((Number(receipt.gasUsed) / Number(tx.gasLimit)) * 100).toFixed(2), "%");

    const gasCost = receipt.gasUsed * (tx.gasPrice || BigInt(0));
    console.log("  - 总Gas费用:", ethers.formatEther(gasCost), "ETH");

    console.log("\n区块信息:");
    console.log("  - 区块号:", receipt.blockNumber);
    console.log("  - 区块哈希:", receipt.blockHash);
    console.log("  - 交易索引:", receipt.index);

    console.log("\n状态:");
    console.log("  - 状态:", receipt.status === 1 ? "✓ 成功" : "✗ 失败");
    console.log("  - 确认数:", await ethers.provider.getBlockNumber() - receipt.blockNumber);

    if (receipt.logs.length > 0) {
      console.log("\n事件日志:");
      console.log("  - 事件数量:", receipt.logs.length);
      receipt.logs.forEach((log, index) => {
        console.log(`  ${index + 1}. 地址: ${log.address}, 主题数: ${log.topics.length}`);
      });
    }

  } catch (error: any) {
    console.log("查询出错:", error.message);
  }

  console.log("=".repeat(80));
}

// 如果提供了交易哈希作为参数，查询该交易
if (process.argv.length > 2) {
  const txHash = process.argv[2];
  queryTransaction(txHash).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
} else {
  // 否则显示一般信息
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}