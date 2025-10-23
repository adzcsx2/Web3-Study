/**
 * 🎯 Viem 合约包装器使用示例（集成默认 publicClient）
 *
 * 展示优化后的 API，自动管理 publicClient，用户无需手动传入
 */

import {
  createViemContractWrapper,
  readViemContract,
} from "@/utils/viemContractUtils";
import { type Address, type Abi } from "viem";

// 示例合约配置
const CONTRACT_ADDRESS =
  "0x1234567890123456789012345678901234567890" as Address;
const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "_poolId", "type": "uint256" },
    ],
    "name": "getPoolInfo",
    "outputs": [
      { "internalType": "uint256", "name": "totalStaked", "type": "uint256" },
    ],
    "stateMutability": "view",
    "type": "function",
  },
  {
    "inputs": [],
    "name": "poolCounter",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function",
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_count", "type": "uint256" },
    ],
    "name": "setPoolCount",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function",
  },
] as Abi;

/**
 * 🌟 使用合约包装器类（推荐方式）
 * 自动管理 publicClient，复用连接，性能更好
 */
export async function useContractWrapperExample() {
  console.log("=== 🎯 合约包装器示例 (自动管理 publicClient) ===");

  // ✅ 创建合约包装器 - 自动管理 publicClient
  const contract = createViemContractWrapper({
    contractAddress: CONTRACT_ADDRESS,
    contractAbi: CONTRACT_ABI,
    contractName: "MultiStakePledgeContract",
  });

  try {
    // ✅ 读取操作 - 自动使用内置 publicClient
    console.log("📖 读取池子数量...");
    const poolCount = await contract.read<bigint>("poolCounter");
    console.log(`池子数量: ${poolCount}`);

    // ✅ 批量读取 - 复用同一个 publicClient
    console.log("📚 批量读取池子信息...");
    const calls = [];
    for (let i = 0; i < Number(poolCount || 0); i++) {
      calls.push({
        functionName: "getPoolInfo",
        args: [BigInt(i)],
      });
    }
    const poolInfos = await contract.batchRead(calls);
    console.log("池子信息:", poolInfos);

    // ✅ 获取网络状态 - 使用内置 publicClient
    const networkStats = await contract.getNetworkStats();
    console.log("网络状态:", networkStats);

    // ✅ 访问内置的 publicClient 和链信息
    console.log("链信息:", contract.chain.name);
    console.log("PublicClient Chain ID:", contract.publicClient.chain?.id);

    // ✅ 写入操作示例（需要钱包客户端）
    // const result = await contract.write('setPoolCount', [5n], {
    //   account: walletAccount,
    //   estimateGas: true
    // });
  } catch (error) {
    console.error("合约操作失败:", error);
  }
}

/**
 * 🔧 使用便捷函数（简单场景）
 * 每次调用自动创建 publicClient，适合单次调用
 */
export async function useConvenienceFunctionsExample() {
  console.log("=== 🔧 便捷函数示例 (自动管理 publicClient) ===");

  try {
    // ✅ 单次读取 - 自动创建 publicClient
    console.log("📖 读取池子数量...");
    const poolCount = await readViemContract<bigint>(
      CONTRACT_ADDRESS,
      CONTRACT_ABI,
      "poolCounter"
      // 不需要传入 publicClient，会自动创建
    );
    console.log(`池子数量: ${poolCount}`);

    // ✅ 写入操作 - 自动创建 publicClient
    // const result = await writeViemContract(
    //   CONTRACT_ADDRESS,
    //   CONTRACT_ABI,
    //   "setPoolCount",
    //   [5n],
    //   {
    //     account: walletAccount,
    //     estimateGas: true
    //     // publicClient 会自动创建
    //   }
    // );
  } catch (error) {
    console.error("便捷函数调用失败:", error);
  }
}

/**
 * 🚀 性能对比示例
 * 展示合约包装器 vs 便捷函数的性能差异
 */
export async function performanceComparisonExample() {
  console.log("=== 🚀 性能对比示例 ===");

  // ✅ 合约包装器方式（推荐 - 复用 publicClient）
  console.time("合约包装器 - 复用 publicClient");
  const contract = createViemContractWrapper({
    contractAddress: CONTRACT_ADDRESS,
    contractAbi: CONTRACT_ABI,
    contractName: "PerformanceTest",
  });

  // 多次调用复用同一个 publicClient
  for (let i = 0; i < 10; i++) {
    await contract.read("poolCounter");
  }
  console.timeEnd("合约包装器 - 复用 publicClient");

  // ❌ 便捷函数方式（每次创建新的 publicClient）
  console.time("便捷函数 - 每次创建新 publicClient");
  for (let i = 0; i < 10; i++) {
    await readViemContract(CONTRACT_ADDRESS, CONTRACT_ABI, "poolCounter");
  }
  console.timeEnd("便捷函数 - 每次创建新 publicClient");

  console.log(
    "💡 结论: 多次调用时，合约包装器性能更好，因为复用了 publicClient"
  );
}

/**
 * 🎨 实际应用示例
 * React 组件中的使用方式
 */
export function ReactUsageExample() {
  /* 
  // 在 React 组件中使用
  
  function MyComponent() {
    const [contract] = useState(() => 
      createViemContractWrapper({
        contractAddress: CONTRACT_ADDRESS,
        contractAbi: CONTRACT_ABI,
        contractName: "MyContract"
      })
    );

    useEffect(() => {
      const fetchData = async () => {
        // ✅ 自动使用内置 publicClient
        const poolCount = await contract.read('poolCounter');
        const networkStats = await contract.getNetworkStats();
        
        console.log('池子数量:', poolCount);
        console.log('网络状态:', networkStats);
      };
      
      fetchData();
    }, [contract]); // contract 是稳定的，不会重新创建

    const handleWriteOperation = async () => {
      try {
        // ✅ 写入操作，自动处理 gas 估算
        const result = await contract.write('setPoolCount', [5n], {
          account: walletAccount,
          estimateGas: true
        });
        
        if (result.isSuccess) {
          console.log('✅ 交易成功:', result.hash);
        }
      } catch (error) {
        console.error('❌ 交易失败:', error);
      }
    };

    return (
      <div>
        <button onClick={handleWriteOperation}>
          设置池子数量为 5
        </button>
      </div>
    );
  }
  */
}

// 导出示例函数供测试使用
export const examples = {
  useContractWrapperExample,
  useConvenienceFunctionsExample,
  performanceComparisonExample,
  ReactUsageExample,
};
