import React, { useState } from "react";
import { Card, Space, Typography, Button, List, Tag, Divider, App } from "antd";
import { SwapToken } from "@/types/";
import { TEST_TOKENS, getTestTokensByChain, getChainNameById } from "@/constants/testTokens";
import { useAccount } from "wagmi";

/**
 * 代币测试助手组件
 * 提供测试代币地址和一键测试功能
 */
const TokenTestHelper: React.FC = () => {
  const { message } = App.useApp();
  const { chain, isConnected } = useAccount();
  const [selectedToken, setSelectedToken] = useState<SwapToken | undefined>();

  // 获取当前链的测试代币
  const currentChainTokens = chain ? getTestTokensByChain(chain.id) : [];

  // 处理测试代币选择
  const handleTestTokenSelect = (testToken: typeof TEST_TOKENS[0]) => {
    const swapToken: SwapToken = {
      chainId: testToken.chainId,
      tokenSymbol: testToken.symbol,
      tokenAddress: testToken.address,
      tokenDecimals: testToken.decimals,
      tokenLogoURI: `https://tokens.1inch.io/${testToken.address}`,
      balance: "0",
    };

    setSelectedToken(swapToken);
    message.success(`已选择测试代币: ${testToken.symbol}`);
  };

  // 复制地址到剪贴板
  const copyToClipboard = (address: string) => {
    navigator.clipboard.writeText(address);
    message.success("地址已复制到剪贴板");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Typography.Title level={2}>代币测试助手</Typography.Title>

      <Space direction="vertical" size="large" className="w-full">
        {/* 当前网络状态 */}
        <Card title="当前网络状态" size="small">
          {isConnected && chain ? (
            <Space direction="vertical" className="w-full">
              <Tag color="blue" className="text-sm">
                {getChainNameById(chain.id)} (Chain ID: {chain.id})
              </Tag>
              <Typography.Text>
                当前网络上有 <Typography.Text strong>{currentChainTokens.length}</Typography.Text> 个测试代币可用
              </Typography.Text>
            </Space>
          ) : (
            <Typography.Text type="secondary">请连接钱包以查看当前网络的测试代币</Typography.Text>
          )}
        </Card>

        <Divider />

        {/* 当前网络的测试代币 */}
        {isConnected && currentChainTokens.length > 0 && (
          <Card title={`当前网络 (${getChainNameById(chain?.id || 0)}) 测试代币`} size="small">
            <List
              dataSource={currentChainTokens}
              renderItem={(token) => (
                <List.Item
                  actions={[
                    <Button
                      key="copy"
                      size="small"
                      onClick={() => copyToClipboard(token.address)}
                    >
                      复制地址
                    </Button>,
                    <Button
                      key="test"
                      type="primary"
                      size="small"
                      onClick={() => handleTestTokenSelect(token)}
                    >
                      选择测试
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <span>{token.symbol}</span>
                        <Tag color="green">{token.name}</Tag>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size="small" className="w-full">
                        <div className="font-mono text-xs bg-gray-100 p-2 rounded">
                          {token.address}
                        </div>
                        <Typography.Text type="secondary" className="text-xs">
                          精度: {token.decimals} | {token.description}
                        </Typography.Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        )}

        <Divider />

        {/* 所有测试代币列表 */}
        <Card title="所有测试代币列表" size="small">
          <Typography.Text type="secondary" className="block mb-4">
            以下是所有支持的测试代币，请确保在对应的网络上使用正确的地址：
          </Typography.Text>

          <List
            dataSource={TEST_TOKENS}
            renderItem={(token) => (
              <List.Item
                actions={[
                  <Button
                    key="copy"
                    size="small"
                    onClick={() => copyToClipboard(token.address)}
                  >
                    复制
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span>{token.symbol}</span>
                      <Tag>{token.chainName}</Tag>
                      <Tag color="blue">Chain ID: {token.chainId}</Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size="small" className="w-full">
                      <div>
                        <Typography.Text strong>{token.name}</Typography.Text>
                        <Typography.Text type="secondary"> - {token.description}</Typography.Text>
                      </div>
                      <div className="font-mono text-xs bg-gray-100 p-2 rounded">
                        {token.address}
                      </div>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>

        <Divider />

        {/* 使用说明 */}
        <Card title="使用说明" size="small">
          <Space direction="vertical">
            <Typography.Text strong>🔧 测试步骤：</Typography.Text>

            <Typography.Text>
              1. <strong>连接钱包</strong> - 确保钱包已连接到目标测试网络
            </Typography.Text>

            <Typography.Text>
              2. <strong>选择网络</strong> - 在钱包中切换到对应的测试网络
            </Typography.Text>

            <Typography.Text>
              3. <strong>复制地址</strong> - 点击"复制地址"按钮复制代币合约地址
            </Typography.Text>

            <Typography.Text>
              4. <strong>搜索测试</strong> - 在代币选择器中粘贴地址进行搜索测试
            </Typography.Text>

            <Typography.Text>
              5. <strong>快速测试</strong> - 点击"选择测试"按钮直接加载测试代币信息
            </Typography.Text>

            <Typography.Text type="secondary" className="text-sm mt-2">
              💡 提示：如果在本地测试网上遇到问题，请确认代币合约已正确部署到当前网络。
            </Typography.Text>
          </Space>
        </Card>

        {/* 已选择的代币信息 */}
        {selectedToken && (
          <>
            <Divider />
            <Card title="已选择的测试代币" size="small">
              <Space direction="vertical" className="w-full">
                <Typography.Text strong>
                  {selectedToken.tokenSymbol} ({selectedToken.tokenAddress.slice(0, 6)}...{selectedToken.tokenAddress.slice(-4)})
                </Typography.Text>
                <div className="bg-gray-50 p-3 rounded">
                  <pre className="text-xs">
                    {JSON.stringify(selectedToken, null, 2)}
                  </pre>
                </div>
              </Space>
            </Card>
          </>
        )}
      </Space>
    </div>
  );
};

export default TokenTestHelper;