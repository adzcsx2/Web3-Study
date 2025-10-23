/**
 * 使用新的通用 useEthersContract Hook 的示例
 *
 * 展示如何在不依赖默认合约的情况下进行各种合约操作
 */

import { useEthersContract } from "@/hooks/useEthersContract";
import MultiStakePledgeContract from "@/app/abi/MultiStakePledgeContract.json";
import { ethers } from "ethers";
import { useEffect, useState, useCallback } from "react";

// 合约配置
const CONTRACT_ADDRESS = MultiStakePledgeContract.address;
const CONTRACT_ABI = MultiStakePledgeContract.abi;

// ERC20 ABI（用于演示调用其他合约）
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
];

export function ContractExamples() {
  const { read, batchRead, write, isConnected } = useEthersContract();
  const [poolCount, setPoolCount] = useState<bigint>(BigInt(0));
  const [totalStaked, setTotalStaked] = useState<string>("0");
  const [loading, setLoading] = useState(false);

  /**
   * 🎯 示例 1: 单个读取调用
   */
  const getPoolCount = useCallback(async () => {
    try {
      setLoading(true);
      const count = await read<bigint>(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        "poolCounter"
      );

      if (count) {
        setPoolCount(count);
        console.log(`池子数量: ${count.toString()}`);
      }
    } catch (error) {
      console.error("获取池子数量失败:", error);
    } finally {
      setLoading(false);
    }
  }, [read]);

  /**
   * 🎯 示例 2: 循环中调用合约（这是重点！）
   */
  const calculateTotalStaked = async () => {
    try {
      setLoading(true);

      // 1. 先获取池子数量
      const count = await read<bigint>(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        "poolCounter"
      );

      if (!count) {
        console.log("获取池子数量失败");
        return;
      }

      console.log(`开始计算 ${count.toString()} 个池子的总质押量...`);

      // 2. 在循环中调用合约（这在 wagmi hooks 中是不可能的！）
      let total = BigInt(0);
      for (let i = 0; i < Number(count); i++) {
        const poolInfo = await read(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          "getPoolInfo",
          [BigInt(i)]
        );

        if (poolInfo && Array.isArray(poolInfo) && poolInfo[2]) {
          const stakedAmount = poolInfo[2] as bigint;
          total += stakedAmount;
          console.log(`池子 ${i}: ${ethers.formatEther(stakedAmount)} WETH`);
        }
      }

      setTotalStaked(total.toString());
      console.log(`✅ 总质押量: ${ethers.formatEther(total)} WETH`);
    } catch (error) {
      console.error("计算总质押量失败:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🎯 示例 3: 批量并行调用（性能更好）
   */
  const calculateTotalStakedFast = async () => {
    try {
      setLoading(true);

      // 1. 获取池子数量
      const count = await read<bigint>(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        "poolCounter"
      );

      if (!count) return;

      // 2. 构建批量调用
      const calls = [];
      for (let i = 0; i < Number(count); i++) {
        calls.push({
          functionName: "getPoolInfo",
          args: [BigInt(i)],
        });
      }

      // 3. 批量并行执行
      const results = await batchRead(CONTRACT_ADDRESS, CONTRACT_ABI, calls);

      // 4. 计算总和
      let total = BigInt(0);
      results.forEach((poolInfo, index) => {
        if (poolInfo && Array.isArray(poolInfo) && poolInfo[2]) {
          const stakedAmount = poolInfo[2] as bigint;
          total += stakedAmount;
          console.log(
            `池子 ${index}: ${ethers.formatEther(stakedAmount)} WETH`
          );
        }
      });

      setTotalStaked(total.toString());
      console.log(`🚀 快速批量计算完成: ${ethers.formatEther(total)} WETH`);
    } catch (error) {
      console.error("批量计算失败:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🎯 示例 4: 调用其他合约（比如 ERC20 代币）
   */
  const getTokenInfo = async (tokenAddress: string) => {
    try {
      const [name, symbol, totalSupply] = await Promise.all([
        read<string>(tokenAddress, ERC20_ABI, "name"),
        read<string>(tokenAddress, ERC20_ABI, "symbol"),
        read<bigint>(tokenAddress, ERC20_ABI, "totalSupply"),
      ]);

      console.log("代币信息:", {
        name,
        symbol,
        totalSupply: totalSupply?.toString(),
      });
      return { name, symbol, totalSupply };
    } catch (error) {
      console.error("获取代币信息失败:", error);
    }
  };

  /**
   * 🎯 示例 5: 写入操作（需要连接钱包）
   */
  const stakeTokens = async (amount: string) => {
    if (!isConnected) {
      alert("请先连接钱包");
      return;
    }

    try {
      const tx = await write(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        "stake",
        [ethers.parseEther(amount)],
        {
          value: ethers.parseEther(amount),
        }
      );

      console.log("质押交易发送:", tx.hash);

      // 等待交易确认
      const receipt = await tx.wait();
      console.log("质押成功:", receipt?.hash);

      return receipt;
    } catch (error) {
      console.error("质押失败:", error);
      throw error;
    }
  };

  useEffect(() => {
    // 组件加载时获取基本信息
    getPoolCount();
  }, [getPoolCount]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">通用合约 Hook 使用示例</h1>

      {/* 基本信息 */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">合约信息</h2>
        <p>
          <strong>地址:</strong>{" "}
          <code className="bg-white px-2 py-1 rounded">{CONTRACT_ADDRESS}</code>
        </p>
        <p>
          <strong>池子数量:</strong> {poolCount.toString()}
        </p>
        <p>
          <strong>总质押量:</strong> {ethers.formatEther(totalStaked)} WETH
        </p>
      </div>

      {/* 操作按钮 */}
      <div className="space-y-4">
        <div>
          <h3 className="text-md font-semibold mb-2">读取操作</h3>
          <div className="space-x-2">
            <button
              onClick={getPoolCount}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              获取池子数量
            </button>
            <button
              onClick={calculateTotalStaked}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              循环计算总质押量
            </button>
            <button
              onClick={calculateTotalStakedFast}
              disabled={loading}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              🚀 批量快速计算
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-md font-semibold mb-2">写入操作</h3>
          <div className="space-x-2">
            <button
              onClick={() => stakeTokens("0.01")}
              disabled={loading || !isConnected}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
            >
              质押 0.01 WETH
            </button>
            <span className="text-sm text-gray-600">
              {isConnected ? "✅ 钱包已连接" : "❌ 请连接钱包"}
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-md font-semibold mb-2">其他合约</h3>
          <button
            onClick={() =>
              getTokenInfo("0xA0b86a33E6441c8e95E24104B9505A9A8E29F6A8")
            } // 示例代币地址
            disabled={loading}
            className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 disabled:opacity-50"
          >
            获取代币信息
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-4 p-4 bg-yellow-100 rounded-lg">
          <p className="text-yellow-800">⏳ 正在执行操作...</p>
        </div>
      )}

      {/* 使用说明 */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">🎯 关键优势</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>
            <strong>可以在循环中调用:</strong> 解决了 React Hooks 的限制
          </li>
          <li>
            <strong>完全通用:</strong> 可以调用任意合约，不依赖默认配置
          </li>
          <li>
            <strong>支持批量操作:</strong> 并行执行提高性能
          </li>
          <li>
            <strong>类型安全:</strong> 完整的 TypeScript 支持
          </li>
          <li>
            <strong>错误处理:</strong> 内置错误捕获和日志
          </li>
        </ul>
      </div>
    </div>
  );
}

export default ContractExamples;
