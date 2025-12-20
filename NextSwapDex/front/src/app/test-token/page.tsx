"use client";

import React, { useState } from "react";
import { Tabs, Typography } from "antd";
import TokenTestHelper from "@/examples/TokenTestHelper";
import ChainAwareTokenSelector from "@/examples/ChainAwareTokenSelector";

/**
 * 代币测试页面
 * 用于测试代币搜索和链感知功能
 */
const TestTokenPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("helper");

  const tabItems = [
    {
      key: "helper",
      label: "测试助手",
      children: <TokenTestHelper />,
    },
    {
      key: "selector",
      label: "代币选择器",
      children: <ChainAwareTokenSelector />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <Typography.Title level={1} className="text-center mb-8">
          代币功能测试中心
        </Typography.Title>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="w-full"
          size="large"
        />

        <div className="mt-8 text-center text-gray-500 text-sm">
          <Typography.Text type="secondary">
            💡 提示：请先连接钱包，然后切换到对应的区块链网络进行测试
          </Typography.Text>
        </div>
      </div>
    </div>
  );
};

export default TestTokenPage;