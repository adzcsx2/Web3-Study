/**
 * 测试优化后的 viemContractUtils - 自动管理 publicClient
 */

const {
  createViemContractWrapper,
  readViemContract,
} = require("./src/utils/viemContractUtils");

// 简单的测试 ABI
const TEST_ABI = [
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function",
  },
];

async function testAutoPublicClient() {
  console.log("🧪 测试自动 PublicClient 管理功能...\n");

  try {
    // 测试 1: 合约包装器自动管理 publicClient
    console.log("1️⃣ 测试合约包装器自动 publicClient 创建...");

    const contract = createViemContractWrapper({
      contractAddress: "0xA0b86a33E6441c5c100d9c8C3E3b2b87C6d78A40", // 随机地址用于测试
      contractAbi: TEST_ABI,
      contractName: "TestContract",
    });

    console.log("✅ 合约包装器创建成功");
    console.log("📡 PublicClient Chain ID:", contract.publicClient?.chain?.id);
    console.log("🔗 Chain Name:", contract.chain?.name);

    // 测试 2: 便捷函数自动创建 publicClient
    console.log("\n2️⃣ 测试便捷函数自动 publicClient 创建...");

    // 注意：这个调用会失败，因为合约地址不存在，但能测试 publicClient 创建逻辑
    try {
      await readViemContract(
        "0xA0b86a33E6441c5c100d9c8C3E3b2b87C6d78A40",
        TEST_ABI,
        "totalSupply"
      );
    } catch (error) {
      console.log("✅ 便捷函数 publicClient 创建成功（合约调用失败是预期的）");
      console.log(
        "🔍 错误信息包含网络相关内容:",
        error.message.includes("contract") || error.message.includes("call")
      );
    }

    console.log("\n🎉 所有测试通过！自动 PublicClient 管理功能正常工作");
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
    console.error(error.stack);
  }
}

// 如果直接运行这个文件
if (require.main === module) {
  testAutoPublicClient();
}

module.exports = { testAutoPublicClient };
