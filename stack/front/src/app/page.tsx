"use client";
import { WalletConnectComponent } from "@/components/WalletConnectComponent";
import {
  Layout as AntdLayout,
  Divider,
  Typography,
  Button,
  notification,
  Modal,
  Select,
  Input,
  InputNumber,
} from "antd";
import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useMemo,
} from "react";
import { useConnectedWalletClient } from "@/hooks/useWalletClient";
import { formatEther, formatUnits, parseEther } from "viem";
import { multiStakeViemContract } from "@/services/MultiStakeViemService";
import { USDC_ADDRESS, WETH_ADDRESS } from "@/utils/constants";
import { useBalance } from "wagmi";

// 定义 Pool 数据类型
interface PoolInfo {
  stakeToken: string;
  totalStaked: bigint;
  isActive: boolean;
  rewardToken?: string;
  minStake?: bigint;
  maxStake?: bigint;
}

interface PoolContextType {
  poolCount: number;
  poolInfos: (PoolInfo | null)[];
  isLoading: boolean;
  refreshPools: () => Promise<void>;
  totalStaked: {
    wethTotal: string;
    usdcTotal: string;
  };
}

// 创建 Context
const PoolContext = createContext<PoolContextType | undefined>(undefined);

// 自定义 Hook 用于访问 Pool Context
function usePoolContext() {
  const context = useContext(PoolContext);
  if (!context) {
    throw new Error("usePoolContext must be used within PoolProvider");
  }
  return context;
}

// Pool Provider 组件
function PoolProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  const [poolCount, setPoolCount] = useState<number>(0);
  const [poolInfos, setPoolInfos] = useState<(PoolInfo | null)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalStaked, setTotalStaked] = useState<{
    wethTotal: string;
    usdcTotal: string;
  }>({ wethTotal: "0", usdcTotal: "0" });

  const fetchPoolData = async () => {
    try {
      setIsLoading(true);

      // 获取池子数量
      const count = await multiStakeViemContract.getPoolCount();
      const countNumber = Number(count);
      setPoolCount(countNumber);

      if (countNumber === 0) {
        setPoolInfos([]);
        setTotalStaked({ wethTotal: "0", usdcTotal: "0" });
        return;
      }

      // 批量获取所有池子信息
      const pools: number[] = Array.from({ length: countNumber }, (_, i) => i);
      const infos = await multiStakeViemContract.batchGetPoolInfo(pools);
      setPoolInfos(infos);

      // 一次性计算总质押量
      let wethTotal = BigInt(0);
      let usdcTotal = BigInt(0);

      for (const poolInfo of infos) {
        if (poolInfo) {
          const tokenType = poolInfo.stakeToken;
          if (tokenType === WETH_ADDRESS) {
            wethTotal += poolInfo.totalStaked;
          } else if (tokenType === USDC_ADDRESS) {
            usdcTotal += poolInfo.totalStaked;
          }
        }
      }

      setTotalStaked({
        wethTotal: formatEther(wethTotal),
        usdcTotal: formatEther(usdcTotal),
      });

      console.log(
        `✅ 全局加载池子数据成功: 共 ${countNumber} 个池子, WETH=${formatEther(wethTotal)}, USDC=${formatEther(usdcTotal)}`
      );
    } catch (error) {
      console.error("获取池子数据失败:", error);
      setPoolCount(0);
      setPoolInfos([]);
      setTotalStaked({ wethTotal: "0", usdcTotal: "0" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPoolData();
  }, []);

  const value: PoolContextType = {
    poolCount,
    poolInfos,
    isLoading,
    refreshPools: fetchPoolData,
    totalStaked,
  };

  return <PoolContext.Provider value={value}>{children}</PoolContext.Provider>;
}
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

// 池数量显示组件 - 使用全局 Pool Context
function PoolCountDisplay(): React.ReactNode {
  const { poolCount, isLoading } = usePoolContext();

  if (isLoading) return <>加载中...</>;

  return <>{poolCount}</>;
}

// 总锁仓量显示组件 - 使用全局 Pool Context
function TotalStakedDisplay({
  stakeType,
}: {
  stakeType: string;
}): React.ReactNode {
  const { totalStaked, isLoading } = usePoolContext();

  if (isLoading) return <>加载中...</>;

  if (stakeType === "WETH") {
    return <>{totalStaked.wethTotal} WETH</>;
  } else if (stakeType === "USDC") {
    return <>{totalStaked.usdcTotal} USDC</>;
  }

  return <>0</>;
}

//获取活跃用户显示组件
function GetActiveUsersDisplay(): React.ReactNode {
  const [activeUsers, setActiveUsers] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActiveUsers = async () => {
      const users = await multiStakeViemContract.getActiveUsers();
      setActiveUsers(users.length);
      console.log("活跃用户列表:", users);
      setIsLoading(false);
    };

    fetchActiveUsers();
  }, []);

  if (isLoading) return <>加载中...</>;
  if (activeUsers === null) return <>数据加载失败</>;

  return <>{activeUsers}</>;
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
              <TotalStakedDisplay stakeType="WETH" />
            </Typography.Title>
            <Typography.Text type="secondary" className="text-sm sm:text-base">
              总锁仓量(WETH)
            </Typography.Text>
          </div>
          <div className="text-center">
            <Typography.Title
              className="!text-green-700 !mb-2"
              level={4}
              style={{ fontSize: "1.5rem", fontWeight: "bold" }}
            >
              <TotalStakedDisplay stakeType="USDC" />
            </Typography.Title>
            <Typography.Text type="secondary" className="text-sm sm:text-base">
              总锁仓量(USDC)
            </Typography.Text>
          </div>
          <div className="text-center">
            <Typography.Title
              className="!text-purple-500 !mb-2"
              level={4}
              style={{ fontSize: "1.5rem", fontWeight: "bold" }}
            >
              <GetActiveUsersDisplay />
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

// 新建质押Modal组件 - 使用全局 Pool Context
interface StakeModalProps {
  visible: boolean;
  onClose: () => void;
  onNotification: (title: string, description: string) => void;
}

function StakeModal({
  visible,
  onClose,
  onNotification,
}: StakeModalProps): React.ReactNode {
  interface ItemProps {
    label: string;
    value: string;
    address: string;
  }

  const { poolInfos, isLoading: poolsLoading } = usePoolContext();
  const [poolOptions, setPoolOptions] = useState<ItemProps[]>([]);
  const [currentSelectOption, setCurrentSelectOption] =
    useState<ItemProps | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const wallet = useConnectedWalletClient();
  const balance = useBalance({
    address: wallet.address as `0x${string}`,
    token: currentSelectOption?.address as `0x${string}`,
    chainId: 11155111,
    query: {
      enabled: !!wallet.address && !!currentSelectOption?.address,
    },
  });

  // 使用 useMemo 来记忆 poolInfos 的长度，避免不必要的重新计算
  const poolInfosLength = useMemo(() => poolInfos.length, [poolInfos.length]);

  // 当 Modal 打开且池子数据加载完成时，处理池子选项
  useEffect(() => {
    if (!visible) {
      setPoolOptions([]);
      setCurrentSelectOption(null);
      setIsProcessing(false);
      return;
    }

    if (poolsLoading || poolInfosLength === 0) return;

    async function processPoolOptions() {
      try {
        setIsProcessing(true); // 开始处理，显示加载状态
        const newPoolOptions = [];

        for (const [index, poolInfo] of poolInfos.entries()) {
          if (!poolInfo) continue;

          const validation =
            await multiStakeViemContract.validatePoolForStaking(index);
          if (!validation.canStake) {
            console.log(`池子 ${index} 跳过: ${validation.error}`);
            continue;
          }

          let token = "";
          if (poolInfo.stakeToken === WETH_ADDRESS) {
            token = "WETH";
          } else if (poolInfo.stakeToken === USDC_ADDRESS) {
            token = "USDC";
          }

          const showText = `池子 ${index} - 代币: ${token}`;
          newPoolOptions.push({
            label: showText,
            value: index.toString(),
            address: poolInfo.stakeToken,
          });
        }

        setPoolOptions(newPoolOptions);
      } catch (error) {
        console.error("处理质押池选项失败:", error);
      } finally {
        setIsProcessing(false); // 处理完成，结束加载状态
      }
    }

    processPoolOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, poolsLoading, poolInfosLength]);

  const handleStake = async () => {
    if (!currentSelectOption) {
      onNotification("错误", "请选择一个质押池");
      return;
    }

    // 检查钱包连接状态
    if (!wallet.isConnected) {
      onNotification("错误", "请先连接钱包");
      return;
    }

    console.log("质押池信息:", currentSelectOption);

    try {
      // 在质押前验证池子状态
      const poolId = parseInt(currentSelectOption.value);
      const validation =
        await multiStakeViemContract.validatePoolForStaking(poolId);

      if (!validation.canStake) {
        onNotification("错误", validation.error || "池子状态验证失败");
        return;
      }

      console.log("质押个数:", parseEther("0.01"));
      const result = await multiStakeViemContract.stakeInPool(
        parseInt(currentSelectOption?.value || "0"),
        parseEther("0.01"),
        {
          account: wallet.data?.account,
          walletClient: wallet.data,
          estimateGas: true,
        }
      );

      console.log("质押结果:", result);
      if (result.isSuccess) {
        onNotification("质押成功", `质押交易已提交，交易哈希: ${result.hash}`);
        onClose();
      } else {
        onNotification(
          "质押失败",
          `质押交易失败: ${result.error?.message || "未知错误"}`
        );
      }
    } catch (error) {
      console.error("质押操作失败:", error);
      onNotification(
        "质押错误",
        `操作失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    }
  };

  return (
    <Modal
      title={<Typography.Title level={4}>新建质押</Typography.Title>}
      footer={
        <div>
          <Button type="default" className="mr-3" onClick={onClose}>
            取消
          </Button>
          <Button type="primary" onClick={handleStake} disabled={isProcessing}>
            确定
          </Button>
        </div>
      }
      // loading={poolsLoading || isProcessing}
      open={visible}
      onCancel={onClose}
    >
      <div className="grid grid-cols-12 items-center">
        <Typography.Text className="col-span-4">
          选择当前可用质押池:
        </Typography.Text>
        <Select
          showSearch
          className=" col-span-8"
          options={poolOptions}
          placeholder="选择可质押池"
          filterOption={(input, option) =>
            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
          }
          onChange={(
            value: string,
            option?: ItemProps | ItemProps[] | undefined
          ) => {
            if (!option || Array.isArray(option)) {
              return;
            }
            setCurrentSelectOption(option);
          }}
        />
        {/* currentSelectOption && */}
        {
          <div className=" grid-cols-12 mt-3 items-center grid !w-full">
            <Typography.Text className="col-span-4 mt-3">
              选择质押:
              {currentSelectOption?.address === WETH_ADDRESS
                ? "WETH"
                : currentSelectOption?.address === USDC_ADDRESS
                  ? "USDC"
                  : "未知代币"}
            </Typography.Text>

            <InputNumber
              className="col-span-6"
              defaultValue={0}
              onChange={(value) => {
                console.log("质押数量:", value);
              }}
            ></InputNumber>

            <Typography.Text className="col-span-2 ">
              {currentSelectOption?.address === WETH_ADDRESS
                ? formatEther(balance.data?.value ?? 0n) + " WETH"
                : currentSelectOption?.address === USDC_ADDRESS
                  ? formatUnits(balance.data?.value ?? 0n, 6) + " USDC"
                  : ""}
            </Typography.Text>
          </div>
        }
      </div>
    </Modal>
  );
}

//用户操作仪表盘组件
function UserDashboardComponent(): React.ReactNode {
  const wallet = useConnectedWalletClient();
  const [api, contextHolder] = notification.useNotification();
  const [stakeModalVisible, setStakeModalVisible] = useState(false);

  const openNotification = (title: string, description: string) => {
    api.info({
      message: title,
      description: description,
      placement: "top",
      pauseOnHover: false,
      showProgress: true,
    });
  };

  return (
    <>
      {contextHolder}
      <div className="mt-6 sm:mt-8 mx-auto rounded-lg p-4 sm:p-6 lg:p-8 bg-white shadow-sm max-w-2xl">
        <Typography.Title
          level={3}
          className="text-center !mb-6 text-xl sm:text-2xl"
        >
          快速操作
        </Typography.Title>

        <div className="space-y-4">
          <div className="text-center">
            <Button
              type="primary"
              size="large"
              onClick={() => {
                if (!wallet.isConnected) {
                  openNotification(
                    "请连接钱包",
                    "请先连接钱包以进行质押操作！"
                  );
                  return;
                }
                setStakeModalVisible(true);
              }}
              className="min-w-full"
            >
              新建质押
            </Button>

            <Button
              size="large"
              className="min-w-full mt-3"
              color="cyan"
              variant="solid"
              onClick={() => {
                if (!wallet.isConnected) {
                  openNotification(
                    "请连接钱包",
                    "请先连接钱包以进行提取质押+奖励操作！"
                  );
                  return;
                }
              }}
            >
              提取质押+奖励
            </Button>
            <Button
              size="large"
              className="min-w-full mt-3"
              onClick={() => {
                if (!wallet.isConnected) {
                  openNotification(
                    "请连接钱包",
                    "请先连接钱包以查看交易历史！"
                  );
                  return;
                }
              }}
            >
              查看交易历史
            </Button>
          </div>
        </div>
      </div>

      <StakeModal
        visible={stakeModalVisible}
        onClose={() => setStakeModalVisible(false)}
        onNotification={openNotification}
      />
    </>
  );
}

//主页面
function Main(): React.ReactNode {
  return (
    <PoolProvider>
      <AntdLayout className="w-screen h-screen flex flex-col">
        <MainHeaderComponent />
        <AntdLayout.Content className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 flex-1 overflow-y-auto bg-gray-50">
          {/* 平台统计组件 */}
          <StatisticsComponent />
          {/* 内容  */}
          <WelComeComponent />
          {/* 质押示例 */}
          <UserDashboardComponent />
        </AntdLayout.Content>
      </AntdLayout>
    </PoolProvider>
  );
}
export default function MainPage() {
  return Main();
}
