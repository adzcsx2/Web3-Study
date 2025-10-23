"use client";
import { WalletConnectComponent } from "@/components/WalletConnectComponent";
import { Layout as AntdLayout, Divider, Typography, Button } from "antd";
import React from "react";
// 旧的 Hook 已被移除，请使用新的 useEthersContract Hook
import MultiStakePledgeContract from "@/app/abi/MultiStakePledgeContract.json";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useConnectedWalletClient, useWallet } from "@/hooks/useWalletClient";
import {
  readViemContract,
  readViemContractBatch,
  writeViemContract,
} from "@/utils/viemContractUtils";
import { type Abi } from "viem";
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

// 池数量显示组件 - 使用 Viem 工具
function PoolCountDisplay(): React.ReactNode {
  const [isLoading, setIsLoading] = useState(true);
  const [poolCount, setPoolCount] = useState<number>(0);
     const CONTRACT_ADDRESS =
          MultiStakePledgeContract.address as `0x${string}`;
        const CONTRACT_ABI = MultiStakePledgeContract.abi as Abi;

  const connectedWalletClient = useConnectedWalletClient();

  useEffect(() => {
    const fetchPoolCount = async () => {
      try {
        setIsLoading(true);

        //使用 Viem 读取合约   
        const count = await readViemContract<bigint>(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          "poolCounter"
        );

        //使用 Viem 设置池子数量
        await writeViemContract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          "setPoolCount",
          [count]
        );

        setPoolCount(count ? Number(count) : 0);
      } catch (error) {
        console.error("获取池子数量失败:", error);
        setPoolCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPoolCount();
  }, []);

  if (isLoading) return <>加载中...</>;

  return <>{poolCount}</>;
}

// 总锁仓量显示组件 - 使用 Viem 工具
function TotalStakedDisplay(): React.ReactNode {
  const [totalStakedData, setTotalStakedData] = React.useState<{
    wethTotal: string;
    usdcTotal: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const wallet = useWallet();

  // 定义 PoolInfo 类型
  interface PoolInfo {
    rewardToken: string;
    totalRewards: bigint;
    // 添加其他需要的属性
  }

  // 使用 useEffect 来处理异步操作
  useEffect(() => {
    const fetchTotalStaked = async () => {
      // 合约配置
      const CONTRACT_ADDRESS =
        MultiStakePledgeContract.address as `0x${string}`;
      const CONTRACT_ABI = MultiStakePledgeContract.abi as Abi;
      if (!wallet.isConnected) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // 1. 获取池子数量
        const allPools = await readViemContract<bigint>(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          "poolCounter"
        );
        console.log("allPools:", allPools);

        if (!allPools || allPools === 0n) {
          console.log("没有池子或获取池子数量失败");
          setTotalStakedData({ wethTotal: "0", usdcTotal: "0" });
          return;
        }

        // 2. 批量获取所有池子信息
        const calls = [];
        for (let i = 0; i < Number(allPools); i++) {
          calls.push({
            functionName: "getPoolInfo",
            args: [BigInt(i)],
          });
        }

        const poolInfos = (await readViemContractBatch(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          calls
        )) as PoolInfo[];

        poolInfos.forEach((info: PoolInfo, index: number) => {
          console.log(`池子 ${index} 信息:`, info);
        });

        // 3. 计算总质押量
        let wethTotal = BigInt(0);
        let usdcTotal = BigInt(0);

        poolInfos.forEach((poolInfo: PoolInfo) => {
          if (poolInfo && poolInfo.rewardToken && poolInfo.totalRewards) {
            const tokenType = poolInfo.rewardToken;
            if (tokenType === "WETH") {
              wethTotal += poolInfo.totalRewards;
            } else if (tokenType === "USDC") {
              usdcTotal += poolInfo.totalRewards;
            }
          }
        });

        console.log(
          `✅ 计算总质押量成功: WETH=${wethTotal}, USDC=${usdcTotal}`
        );

        setTotalStakedData({
          wethTotal: ethers.formatEther(wethTotal),
          usdcTotal: ethers.formatEther(usdcTotal),
        });
      } catch (error) {
        console.error("获取总质押量失败:", error);
        setTotalStakedData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTotalStaked();
  }, [wallet.isConnected]);

  if (isLoading) return <>加载中...</>;
  if (!wallet.isConnected) return <>请连接钱包</>;
  if (!totalStakedData) return <>数据加载失败</>;

  return (
    <>
      {totalStakedData.wethTotal} WETH + {totalStakedData.usdcTotal} USDC
    </>
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
              className="!text-green-700 !mb-2"
              level={4}
              style={{ fontSize: "1.5rem", fontWeight: "bold" }}
            >
              <TotalStakedDisplay />
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
              <PoolCountDisplay />
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
  // TODO: 迁移到新的 useEthersContract Hook
  // const { write, isPending, isSuccess, hash, error } = useContractDataWrite("stake", {...});

  // 临时占位变量
  const write = (args?: unknown[]) => {
    console.log("请迁移到新的 useEthersContract Hook", args);
  };
  const isPending = false;
  const isSuccess = false;
  const hash = undefined as string | undefined;
  const error = null as Error | null;

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
              交易哈希:{" "}
              {hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : "N/A"}
            </Typography.Text>
          </div>
        )}

        {error && (
          <div className="text-center">
            <Typography.Text className="text-red-600">
              ❌ 质押失败: {error?.message || "未知错误"}
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
