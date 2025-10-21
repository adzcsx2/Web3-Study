"use client";
import { WalletConnectComponent } from "@/components/WalletConnectComponent";
import { Layout as AntdLayout, Divider, Image, Typography, Button } from "antd";
import React from "react";
// 主页面头部
function MainHeaderComponent(): React.ReactNode {
  return (
    <AntdLayout.Header className="!bg-[#F9FAFB] !h-32 sm:h-20   px-4 sm:px-6 w-full">
      <div className="flex-1 min-w-0">
        <Typography.Title
          level={2}
          className="!m-0 text-lg sm:text-xl md:text-2xl truncate"
        >
          Stake质押平台
        </Typography.Title>
        <Typography.Text className="!block !m-0 text-xs sm:text-sm italic truncate">
          安全、透明的以太坊质押服务
        </Typography.Text>
      </div>
      <div className="!block ml-2 sm:ml-4">
        <WalletConnectComponent />
      </div>
    </AntdLayout.Header>
  );
}

// 平台统计组件
function StatisticsComponent(): React.ReactNode {
  return (
    <main>
      <div className="w-full bg-white rounded-lg p-4 sm:p-6 lg:p-7 shadow-sm">
        <Typography.Title
          level={3}
          className="text-center !mb-4 sm:!mb-6 lg:!mb-7 text-xl sm:text-2xl"
        >
          平台统计
        </Typography.Title>
        <Divider />
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mt-6">
          <div className="text-center">
            <Typography.Title
              className="!text-blue-500 !mb-2"
              level={4}
              style={{ fontSize: "1.5rem", fontWeight: "bold" }}
            >
              1%+
            </Typography.Title>
            <Typography.Text type="secondary" className="text-sm sm:text-base">
              平均APY
            </Typography.Text>
          </div>
          <div className="text-center">
            <Typography.Title
              className="!text-green-700 !mb-2"
              level={4}
              style={{ fontSize: "1.5rem", fontWeight: "bold" }}
            >
              1234
            </Typography.Title>
            <Typography.Text type="secondary" className="text-sm sm:text-base">
              总锁仓量
            </Typography.Text>
          </div>
          <div className="text-center">
            <Typography.Title
              className="!text-purple-500 !mb-2"
              level={4}
              style={{ fontSize: "1.5rem", fontWeight: "bold" }}
            >
              444
            </Typography.Title>
            <Typography.Text type="secondary" className="text-sm sm:text-base">
              活跃用户
            </Typography.Text>
          </div>
          <div className="text-center">
            <Typography.Title
              className="!text-red-400 !mb-2"
              level={4}
              style={{ fontSize: "1.5rem", fontWeight: "bold" }}
            >
              3
            </Typography.Title>
            <Typography.Text type="secondary" className="text-sm sm:text-base">
              质押池数量
            </Typography.Text>
          </div>
        </div>
      </div>
    </main>
  );
}

// 欢迎组件
function WelComeComponent(): React.ReactNode {
  return (
    <div className="mt-6 sm:mt-8 lg:mt-10 mx-auto rounded-lg p-4 sm:p-6 lg:p-8 bg-white shadow-sm max-w-2xl">
      <Typography.Title
        level={3}
        className="text-center !mb-6 sm:!mb-8 text-xl sm:text-2xl"
      >
        欢迎来到 Stake 质押平台
      </Typography.Title>
      {/* //居中显示 */}
      <Typography.Text className="block text-center !mb-6 sm:!mb-8 !w-full text-sm sm:text-base">
        连接您的钱包开始质押，获得稳定的收益回报
      </Typography.Text>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <Typography.Text className="text-center sm:text-left !mb-2 sm:!mb-0 !text-base sm:!text-lg">
            ✨ 高收益率
          </Typography.Text>
          <Typography.Text className="text-center sm:text-right !text-blue-500 !text-base sm:!text-lg !font-bold">
            最高 15% APY
          </Typography.Text>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <Typography.Text className="text-center sm:text-left !mb-2 sm:!mb-0 !text-base sm:!text-lg">
            🔒 安全可靠
          </Typography.Text>
          <Typography.Text className="text-center sm:text-right !text-green-700 !text-base sm:!text-lg !font-bold">
            智能合约保护
          </Typography.Text>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <Typography.Text className="text-center sm:text-left !mb-2 sm:!mb-0 !text-base sm:!text-lg">
            ⚡ 随时提取
          </Typography.Text>
          <Typography.Text className="text-center sm:text-right !text-purple-500 !text-base sm:!text-lg !font-bold">
            灵活操作
          </Typography.Text>
        </div>
      </div>
    </div>
  );
}
//主页面
function Main(): React.ReactNode {
  return (
    <AntdLayout className="w-screen h-screen flex flex-col">
      <MainHeaderComponent />

      <AntdLayout.Content className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 flex-1 overflow-y-auto bg-gray-50">
        {/* 平台统计组件 */}
        <StatisticsComponent />
        {/* 内容  */}
        <WelComeComponent />
      </AntdLayout.Content>
    </AntdLayout>
  );
}
export default function MainPage() {
  return Main();
}
