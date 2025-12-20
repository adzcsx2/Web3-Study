import React, { useState } from "react";
import { Card, Space, Typography, Divider } from "antd";
import { SwapToken } from "@/types/";
import TokenSelectButton from "@/components/ui/button/TokenSelectButton";

/**
 * 代币选择器使用示例
 */
const TokenSelectorExample: React.FC = () => {
  const [selectedToken, setSelectedToken] = useState<SwapToken | undefined>();
  const [baseToken, setBaseToken] = useState<SwapToken | undefined>();

  // 处理代币选择
  const handleTokenSelect = (token: SwapToken) => {
    console.log("选择的代币:", token);
    setSelectedToken(token);
  };

  const handleBaseTokenSelect = (token: SwapToken) => {
    console.log("选择的基准代币:", token);
    setBaseToken(token);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Typography.Title level={2}>代币选择器示例</Typography.Title>

      <Space direction="vertical" size="large" className="w-full">
        {/* 基础使用示例 */}
        <Card title="基础使用" size="small">
          <Space direction="vertical" className="w-full">
            <Typography.Text>选择一个代币进行交换：</Typography.Text>
            <TokenSelectButton
              token={selectedToken}
              onTokenSelect={handleTokenSelect}
            />
            {selectedToken && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <Typography.Text strong>已选择的代币信息：</Typography.Text>
                <pre className="mt-2 text-xs bg-white p-2 rounded border">
                  {JSON.stringify(selectedToken, null, 2)}
                </pre>
              </div>
            )}
          </Space>
        </Card>

        <Divider />

        {/* 交换界面示例 */}
        <Card title="交换界面示例" size="small">
          <Space direction="vertical" className="w-full">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Typography.Text className="block mb-2">你支付</Typography.Text>
                <TokenSelectButton
                  token={selectedToken}
                  onTokenSelect={handleTokenSelect}
                />
              </div>

              <div className="text-2xl">⇄</div>

              <div className="flex-1">
                <Typography.Text className="block mb-2">你获得</Typography.Text>
                <TokenSelectButton
                  token={baseToken}
                  onTokenSelect={handleBaseTokenSelect}
                />
              </div>
            </div>

            {(selectedToken || baseToken) && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <Typography.Text strong>交换对信息：</Typography.Text>
                <div className="mt-2 text-sm">
                  {selectedToken && (
                    <div>支付: {selectedToken.tokenSymbol} ({selectedToken.tokenAddress.slice(0, 6)}...)</div>
                  )}
                  {baseToken && (
                    <div>获得: {baseToken.tokenSymbol} ({baseToken.tokenAddress.slice(0, 6)}...)</div>
                  )}
                </div>
              </div>
            )}
          </Space>
        </Card>

        <Divider />

        {/* 使用说明 */}
        <Card title="使用说明" size="small">
          <Space direction="vertical">
            <Typography.Text>
              • 输入有效的以太坊代币地址（0x开头的42位字符）
            </Typography.Text>
            <Typography.Text>
              • 系统会自动验证地址格式并查询代币信息
            </Typography.Text>
            <Typography.Text>
              • 选择的代币会被缓存在浏览器中，下次使用时会显示在"最近使用"列表中
            </Typography.Text>
            <Typography.Text>
              • 最多缓存10个最近使用的代币
            </Typography.Text>
            <Typography.Text>
              • 搜索过程中会显示骨架屏动画
            </Typography.Text>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default TokenSelectorExample;