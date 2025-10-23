/**
 * Viem 合约服务与钱包客户端集成示例
 * 演示如何在合约操作中使用已连接的钱包客户端
 *
 * @author Hoyn
 * @version 1.0.0
 * @lastModified 2025-10-24
 */

"use client";

import React, { useState } from "react";
import { useWallet } from "@/hooks/useWalletClient";
import {
  ViemContractService,
  createViemContractWrapper,
} from "@/utils/viemContractUtils";
import { parseEther, formatEther, type Address, type Abi } from "viem";
// 假设您有合约 ABI
import contractABI from "@/app/abi/MultiStakePledgeContract.json";

// 示例合约地址（请替换为实际地址）
const CONTRACT_ADDRESS =
  "0x1234567890123456789012345678901234567890" as Address;

/**
 * 使用钱包客户端的合约操作示例
 */
export default function ContractWithWalletExample() {
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  // 创建合约包装器
  const contract = React.useMemo(() => {
    return createViemContractWrapper({
      contractAddress: CONTRACT_ADDRESS,
      contractAbi: contractABI.abi as Abi, // 类型断言以解决 ABI 类型问题
      contractName: "MultiStakePledgeContract",
    });
  }, []);

  // 读取合约数据示例
  const handleReadContract = async () => {
    setLoading(true);
    try {
      // 读取操作不需要钱包客户端
      const poolCount = await contract.read<bigint>("poolCount");
      setResult(`池子数量: ${poolCount?.toString() || "0"}`);
    } catch (error) {
      console.error("读取合约失败:", error);
      setResult(
        `读取失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    } finally {
      setLoading(false);
    }
  };

  // 写入合约数据示例（需要钱包客户端）
  const handleWriteContract = async () => {
    if (!wallet.isReady || !wallet.walletClient) {
      alert("请先连接钱包");
      return;
    }

    setLoading(true);
    try {
      // 使用已连接的钱包客户端进行写入操作
      const writeResult = await contract.write("stake", [0n], {
        account: wallet.walletClient.account,
        value: parseEther("0.01"), // 质押 0.01 ETH
        estimateGas: true,
      });

      if (writeResult.isSuccess) {
        setResult(`✅ 质押成功! 交易哈希: ${writeResult.hash}`);
      } else {
        setResult(`❌ 质押失败: ${writeResult.error?.message || "未知错误"}`);
      }
    } catch (error) {
      console.error("写入合约失败:", error);
      setResult(
        `写入失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    } finally {
      setLoading(false);
    }
  };

  // 使用 ViemContractService 的示例
  const handleUseService = async () => {
    if (!wallet.isReady || !wallet.walletClient) {
      alert("请先连接钱包");
      return;
    }

    setLoading(true);
    try {
      // 直接使用 ViemContractService
      const writeResult = await ViemContractService.write({
        contractAddress: CONTRACT_ADDRESS,
        contractAbi: contractABI.abi as Abi,
        functionName: "stake",
        args: [0n],
        account: wallet.walletClient.account,
        value: parseEther("0.01"),
        estimateGas: true,
        // 传入钱包客户端
        walletClient: wallet.walletClient,
      });

      if (writeResult.isSuccess) {
        setResult(`✅ 服务调用成功! 交易哈希: ${writeResult.hash}`);
      } else {
        setResult(
          `❌ 服务调用失败: ${writeResult.error?.message || "未知错误"}`
        );
      }
    } catch (error) {
      console.error("服务调用失败:", error);
      setResult(
        `服务调用失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Gas 估算示例
  const handleEstimateGas = async () => {
    setLoading(true);
    try {
      const gasEstimation = await contract.estimateGas("stake", [0n], {
        value: parseEther("0.01"),
      });

      setResult(`
        📊 Gas 估算结果:
        Gas Limit: ${gasEstimation.gasLimit.toString()}
        预估费用: ${gasEstimation.estimatedCost} ETH
        ${gasEstimation.maxFeePerGas ? `Max Fee: ${formatEther(gasEstimation.maxFeePerGas)} ETH` : ""}
      `);
    } catch (error) {
      console.error("Gas 估算失败:", error);
      setResult(
        `Gas 估算失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-center mb-8">
        合约操作 + 钱包客户端集成示例
      </h1>

      {/* 钱包状态 */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">钱包状态</h3>
        {wallet.isConnected ? (
          <div className="text-sm space-y-1">
            <p>
              <strong>地址:</strong> {wallet.address}
            </p>
            <p>
              <strong>网络:</strong> {wallet.chainName} ({wallet.chainId})
            </p>
            <p>
              <strong>状态:</strong> {wallet.isReady ? "✅ 就绪" : "⏳ 加载中"}
            </p>
          </div>
        ) : (
          <p className="text-yellow-600">❌ 钱包未连接</p>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <button
          onClick={handleReadContract}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "读取中..." : "读取合约"}
        </button>

        <button
          onClick={handleWriteContract}
          disabled={loading || !wallet.isReady}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? "写入中..." : "写入合约"}
        </button>

        <button
          onClick={handleUseService}
          disabled={loading || !wallet.isReady}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {loading ? "调用中..." : "服务调用"}
        </button>

        <button
          onClick={handleEstimateGas}
          disabled={loading}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? "估算中..." : "Gas 估算"}
        </button>
      </div>

      {/* 结果显示 */}
      {result && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">操作结果</h3>
          <pre className="text-sm bg-white p-3 rounded border overflow-auto whitespace-pre-wrap">
            {result}
          </pre>
        </div>
      )}

      {/* 代码示例 */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">代码示例</h3>
        <div className="text-sm space-y-4">
          <div>
            <h4 className="font-medium mb-1">1. 获取钱包客户端:</h4>
            <code className="block bg-white p-2 rounded border text-xs">
              {`const wallet = useWallet();
// wallet.walletClient 就是已连接的钱包客户端`}
            </code>
          </div>

          <div>
            <h4 className="font-medium mb-1">2. 在合约包装器中使用:</h4>
            <code className="block bg-white p-2 rounded border text-xs">
              {`const result = await contract.write('stake', [poolId], {
  account: wallet.walletClient.account,
  value: parseEther('0.01'),
  estimateGas: true,
});`}
            </code>
          </div>

          <div>
            <h4 className="font-medium mb-1">
              3. 在 ViemContractService 中使用:
            </h4>
            <code className="block bg-white p-2 rounded border text-xs">
              {`const result = await ViemContractService.write({
  contractAddress: CONTRACT_ADDRESS,
  contractAbi: abi,
  functionName: 'stake',
  args: [poolId],
  account: wallet.walletClient.account,
  walletClient: wallet.walletClient, // 传入钱包客户端
  value: parseEther('0.01'),
});`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
