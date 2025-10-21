"use client";
import { WalletConnectComponent } from "@/components/WalletConnectComponent";
import { Layout as AntdLayout, Divider, Image, Typography, Button } from "antd";
import React from "react";
import { useContractData, useContractDataWrite } from "@/hooks/useContract";
import contract from "./abi/MultiStakePledgeContract.json";

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
          安全、透明的以太坊质押服务( Sepolia 测试网 )
        </Typography.Text>
      </div>
      <div className="!block ml-2 sm:ml-4">
        <WalletConnectComponent />
      </div>
    </AntdLayout.Header>
  );
}

function useContractVersion(): React.ReactNode {
  const { data: version, isLoading } = useContractData("getVersion");

  if (isLoading) return <>加载中...</>;

  return <>v{version || "未知"}</>;
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
              1%+{useContractVersion()} ETH
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

// 质押示例组件 - 演示写合约Hook的使用
function StakeExampleComponent(): React.ReactNode {
  // 这里假设有一个stake函数，参数为(amount)
  const { write, isPending, isSuccess, hash, error } = useContractDataWrite("stake", {
    onSuccess: (txHash) => {
      console.log("质押成功，交易哈希:", txHash);
    },
    onError: (err) => {
      console.error("质押失败:", err);
    }
  });

  const handleStake = () => {
    // 质押 0.1 ETH (转换为 wei: 100000000000000000)
    const stakeAmount = "100000000000000000";
    write([stakeAmount]);
  };

  return (
    <div className="mt-6 sm:mt-8 mx-auto rounded-lg p-4 sm:p-6 lg:p-8 bg-white shadow-sm max-w-2xl">
      <Typography.Title
        level={3}
        className="text-center !mb-6 text-xl sm:text-2xl"
      >
        质押示例
      </Typography.Title>

      <div className="space-y-4">
        <Typography.Text className="block text-center !w-full text-sm sm:text-base">
          点击下方按钮体验合约写入操作
        </Typography.Text>

        <div className="text-center">
          <Button
            type="primary"
            size="large"
            onClick={handleStake}
            loading={isPending}
            disabled={isPending}
            className="min-w-[120px]"
          >
            {isPending ? "质押中..." : "质押 0.1 ETH"}
          </Button>
        </div>

        {isSuccess && (
          <div className="text-center">
            <Typography.Text className="text-green-600">
              ✅ 质押成功！
            </Typography.Text>
            <Typography.Text className="text-xs text-gray-500 block mt-2">
              交易哈希: {hash?.slice(0, 10)}...{hash?.slice(-8)}
            </Typography.Text>
          </div>
        )}

        {error && (
          <div className="text-center">
            <Typography.Text className="text-red-600">
              ❌ 质押失败: {error.message}
            </Typography.Text>
          </div>
        )}

        <Typography.Text className="text-xs text-gray-400 text-center block">
          注意：这是演示功能，实际使用需要确保钱包已连接且有足够的ETH
        </Typography.Text>
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
        {/* 质押示例 */}
        <StakeExampleComponent />
      </AntdLayout.Content>
    </AntdLayout>
  );
}
export default function MainPage() {
  return Main();
}
