import React, { useState } from "react";
import { Card, Space, Typography, Alert, Divider } from "antd";
import { SwapToken } from "@/types/";
import TokenSelectButton from "@/components/ui/button/TokenSelectButton";
import { useAccount } from "wagmi";

/**
 * 链感知代币选择器演示组件
 * 展示如何在不同链上搜索代币
 */
const ChainAwareTokenSelector: React.FC = () => {
  const { chain, isConnected } = useAccount();
  const [selectedToken, setSelectedToken] = useState<SwapToken | undefined>();

  // 处理代币选择
  const handleTokenSelect = (token: SwapToken) => {
    setSelectedToken(token);
    console.log("选择的代币:", token);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Typography.Title level={2}>链感知代币选择器</Typography.Title>

      <Space direction="vertical" size="large" className="w-full">
        {/* 链状态显示 */}
        <Card title="钱包连接状态" size="small">
          {isConnected ? (
            <Space direction="vertical" className="w-full">
              <Alert
                message="钱包已连接"
                description={`当前网络: ${chain?.name || "未知"} (Chain ID: ${chain?.id})`}
                type="success"
                showIcon
              />
              <Typography.Text>
                代币搜索将在 <Typography.Text strong>{chain?.name}</Typography.Text> 网络上进行
              </Typography.Text>
            </Space>
          ) : (
            <Alert
              message="钱包未连接"
              description="请连接钱包以使用代币搜索功能"
              type="warning"
              showIcon
            />
          )}
        </Card>

        <Divider />

        {/* 代币选择演示 */}
        <Card title="代币选择演示" size="small">
          <Space direction="vertical" className="w-full">
            <Typography.Text>
              点击下方按钮选择代币（支持当前链上的任何ERC20代币）：
            </Typography.Text>

            <TokenSelectButton
              token={selectedToken}
              onTokenSelect={handleTokenSelect}
            />

            {selectedToken && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <Typography.Text strong>已选择的代币信息：</Typography.Text>
                <div className="mt-2 space-y-1 text-sm">
                  <div><strong>符号:</strong> {selectedToken.tokenSymbol}</div>
                  <div><strong>地址:</strong> {selectedToken.tokenAddress}</div>
                  <div><strong>链ID:</strong> {selectedToken.chainId}</div>
                  <div><strong>精度:</strong> {selectedToken.tokenDecimals}</div>
                  <div><strong>余额:</strong> {selectedToken.balance}</div>
                </div>
              </div>
            )}
          </Space>
        </Card>

        <Divider />

        {/* 使用说明 */}
        <Card title="链感知功能说明" size="small">
          <Space direction="vertical">
            <Typography.Text strong>✨ 新功能特性：</Typography.Text>

            <Typography.Text>
              • <strong>自动链检测:</strong> 自动使用当前连接钱包的区块链网络
            </Typography.Text>

            <Typography.Text>
              • <strong>链切换响应:</strong> 当您切换网络时，搜索结果会自动清空
            </Typography.Text>

            <Typography.Text>
              • <strong>网络显示:</strong> 模态框标题显示当前网络名称
            </Typography.Text>

            <Typography.Text>
              • <strong>安全提示:</strong> 确保在正确的网络上搜索代币，避免资金损失
            </Typography.Text>

            <Typography.Text type="secondary" className="text-sm">
              💡 提示：试试在不同网络（如以太坊主网、Sepolia测试网、Polygon等）上搜索代，
              观察组件如何自动适配当前网络。
            </Typography.Text>
          </Space>
        </Card>

        <Divider />

        {/* 测试代币地址 */}
        <Card title="测试用代币地址" size="small">
          <Space direction="vertical" className="w-full">
            <Typography.Text strong>以太坊主网 (Chain ID: 1):</Typography.Text>
            <div className="font-mono text-xs bg-gray-100 p-2 rounded">
              • USDT: 0xdAC17F958D2ee523a2206206994597C13D831ec7<br/>
              • USDC: 0xA0b86a33E6412b0c8e0D0D0D9B3c3c0C0C0c0C0c<br/>
              • WETH: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
            </div>

            <Typography.Text strong>Sepolia测试网 (Chain ID: 11155111):</Typography.Text>
            <div className="font-mono text-xs bg-gray-100 p-2 rounded">
              • Test USDC: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238<br/>
              • Test WETH: 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14
            </div>

            <Typography.Text type="secondary" className="text-sm">
              ⚠️ 注意：确保在对应的网络上使用正确的代币地址
            </Typography.Text>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default ChainAwareTokenSelector;