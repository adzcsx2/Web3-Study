/**
 * 钱包客户端使用示例组件
 * 演示如何获取和使用已连接的钱包客户端
 *
 * @author Hoyn
 * @version 1.0.0
 * @lastModified 2025-10-24
 */

"use client";

import React, { useState } from "react";
import {
  useWallet,
  useWagmiWalletClient,
  useWalletClientSync,
  getConnectedWalletClient,
  isWalletConnected,
} from "@/hooks/useWalletClient";
import { parseEther } from "viem";

/**
 * 钱包信息显示组件
 */
function WalletInfo() {
  const wallet = useWallet();

  if (!wallet.isConnected) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">钱包状态</h3>
        <p className="text-yellow-700">请先连接钱包</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">钱包信息</h3>
      <div className="space-y-2 text-sm">
        <p>
          <strong>地址:</strong> {wallet.address}
        </p>
        <p>
          <strong>网络:</strong> {wallet.chainName} (ID: {wallet.chainId})
        </p>
        <p>
          <strong>连接器:</strong> {wallet.connector?.name}
        </p>
        <p>
          <strong>状态:</strong> {wallet.isReady ? "✅ 就绪" : "⏳ 加载中"}
        </p>
      </div>
    </div>
  );
}

/**
 * 钱包客户端操作示例组件
 */
function WalletClientOperations() {
  const { data: walletClient, isConnected } = useWagmiWalletClient();
  const [signResult, setSignResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // 签名消息示例
  const handleSignMessage = async () => {
    if (!walletClient || !walletClient.account) {
      alert("钱包未连接");
      return;
    }

    setIsLoading(true);
    try {
      const signature = await walletClient.signMessage({
        message: "Hello from Web3 Stake Platform!",
        account: walletClient.account,
      });
      setSignResult(signature);
    } catch (error) {
      console.error("签名失败:", error);
      alert(
        "签名失败: " + (error instanceof Error ? error.message : "未知错误")
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 发送交易示例
  const handleSendTransaction = async () => {
    if (!walletClient || !walletClient.account) {
      alert("钱包未连接");
      return;
    }

    setIsLoading(true);
    try {
      const hash = await walletClient.sendTransaction({
        account: walletClient.account,
        to: walletClient.account.address, // 发送给自己
        value: parseEther("0.001"), // 0.001 ETH
      });
      alert(`交易已发送! Hash: ${hash}`);
    } catch (error) {
      console.error("交易失败:", error);
      alert(
        "交易失败: " + (error instanceof Error ? error.message : "未知错误")
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-600">连接钱包后可进行操作</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">钱包操作示例</h3>

      <div className="space-y-4">
        {/* 签名操作 */}
        <div>
          <button
            onClick={handleSignMessage}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? "签名中..." : "签名消息"}
          </button>

          {signResult && (
            <div className="mt-2">
              <p className="text-sm font-medium">签名结果:</p>
              <p className="text-xs bg-gray-100 p-2 rounded break-all">
                {signResult}
              </p>
            </div>
          )}
        </div>

        {/* 发送交易操作 */}
        <div>
          <button
            onClick={handleSendTransaction}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {isLoading ? "发送中..." : "发送测试交易 (0.001 ETH)"}
          </button>
          <p className="text-xs text-gray-500 mt-1">
            ⚠️ 这会发送真实交易到当前网络
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * 非 Hook 方式使用示例
 */
function NonHookExample() {
  const [status, setStatus] = useState<string>("");

  const handleCheckWallet = () => {
    const connected = isWalletConnected();
    const walletClient = getConnectedWalletClient();

    if (connected && walletClient) {
      setStatus(`✅ 钱包已连接: ${walletClient.account?.address}`);
    } else {
      setStatus("❌ 钱包未连接");
    }
  };

  return (
    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">非 Hook 方式示例</h3>

      <button
        onClick={handleCheckWallet}
        className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
      >
        检查钱包状态（非 Hook）
      </button>

      {status && <p className="mt-2 text-sm">{status}</p>}

      <p className="text-xs text-gray-500 mt-2">
        这种方式可以在服务层或非组件中使用
      </p>
    </div>
  );
}

/**
 * 钱包客户端完整示例组件
 */
export default function WalletClientExample() {
  // 同步钱包客户端到管理器（重要！）
  useWalletClientSync();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center mb-8">
        钱包客户端使用示例
      </h1>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {/* 钱包信息 */}
        <WalletInfo />

        {/* 钱包操作 */}
        <WalletClientOperations />

        {/* 非 Hook 示例 */}
        <div className="md:col-span-1 lg:col-span-2">
          <NonHookExample />
        </div>
      </div>

      {/* 使用说明 */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">使用说明</h3>
        <div className="text-sm space-y-2">
          <p>
            <strong>1. useWallet():</strong>{" "}
            最便捷的方式，包含完整的钱包信息和状态
          </p>
          <p>
            <strong>2. useWagmiWalletClient():</strong> 直接使用 Wagmi 的
            useWalletClient Hook
          </p>
          <p>
            <strong>3. useConnectedWalletClient():</strong> 使用
            useConnectorClient 的方式
          </p>
          <p>
            <strong>4. getConnectedWalletClient():</strong> 非 Hook
            方式，用于服务层
          </p>
        </div>
      </div>
    </div>
  );
}
