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
  InputNumber,
  List,
  Skeleton,
} from "antd";
import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useWagmiWalletClient } from "@/hooks/useWalletClient";
import { formatEther, formatUnits, parseEther, parseUnits } from "viem";
import type { Abi } from "viem";
import { USDC_ADDRESS, WETH_ADDRESS } from "@/utils/constants";
import { useBalance, usePublicClient, useReadContracts } from "wagmi";
import { useStakeContract } from "@/hooks/useStakeContract";
import deploymentInfo from "@/app/abi/deployment-info.json";
import contract from "@/app/abi/MultiStakePledgeContractV2.json";
import { useSmartWithdraw } from "@/hooks/useSmartWithdraw";
import { useStakeExchangeHistory } from "@/hooks/useStakeExchangeHistory";
import { clearAllViemContractCache } from "@/utils/viemContractUtils";
import { TransactionType, TransactionStatus } from "@/types/TransactionHistory";
import { useStatistics } from "@/hooks/useStatistics";
import type { PoolInfo } from "@/types/StakePledgeContractStructs";
import type { UserPoolData } from "@/types/UserPoolData";

// 定义 Pool 数据类型（本地使用）
interface LocalPoolInfo {
  stakeToken: string;
  totalStaked: bigint;
  isOpenForStaking: boolean;
  endTime: bigint; // 池子结束时间戳
  rewardToken?: string;
  minStake?: bigint;
  maxStake?: bigint;
  totalRewardsIssued?: bigint;
}

interface PoolContextType {
  poolCount: number; // 活跃池子数量（开放且未过期）
  totalPoolCount: number; // 🔧 合约中实际存在的总池子数
  poolInfos: (LocalPoolInfo | null)[];
  isLoading: boolean;
  refreshPools: (isForce?: boolean) => Promise<void>;
  totalStaked: {
    wethTotal: string;
    usdcTotal: string;
  };
  totalRewards: bigint;
  activeUsers: number;
  openNotification: (title: string, description: string) => void;
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

// Pool Provider 组件 - 复用 useStatistics Hook
function PoolProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  const [poolInfos, setPoolInfos] = useState<(LocalPoolInfo | null)[]>([]);

  const [api, contextHolder] = notification.useNotification();

  // 复用 useStatistics Hook 获取统计数据和池子详情
  const { statistics, poolsData, isLoading, refetch } = useStatistics();

  const openNotification = useCallback(
    (title: string, description: string) => {
      api.info({
        message: title,
        description: description,
        placement: "top",
        pauseOnHover: false,
        showProgress: true,
      });
    },
    [api]
  );

  // 处理池子数据，转换为本地格式
  // 🔧 使用 totalPoolCount（合约中实际存在的总池子数）而不是 poolCount（活跃池子数）
  // 因为用户可能在任何池子中有质押，包括已过期的池子
  useEffect(() => {
    if (statistics.totalPoolCount === 0) {
      setPoolInfos([]);
      return;
    }

    if (isLoading || !poolsData) {
      return;
    }

    try {
      const infos: (LocalPoolInfo | null)[] = [];

      poolsData.forEach((pool) => {
        if (pool.status === "success" && pool.result) {
          const poolInfo = pool.result as PoolInfo;

          // 转换为本地格式
          const localPoolInfo: LocalPoolInfo = {
            stakeToken: poolInfo.stakeToken,
            totalStaked: poolInfo.totalStaked,
            isOpenForStaking: poolInfo.isOpenForStaking,
            endTime: poolInfo.endTime, // 添加结束时间
            rewardToken: poolInfo.rewardToken,
            minStake: poolInfo.minDepositAmount,
            totalRewardsIssued: poolInfo.totalRewardsIssued,
          };

          infos.push(localPoolInfo);
        } else {
          infos.push(null);
        }
      });
      console.log("转换后的池子详情:", infos);
      setPoolInfos(infos);

      console.log(
        `✅ PoolProvider 加载池子详情成功: 共 ${statistics.totalPoolCount} 个池子（其中 ${statistics.poolCount} 个活跃）`
      );
    } catch (error) {
      console.error("处理池子数据失败:", error);
      setPoolInfos([]);
    }
  }, [statistics.totalPoolCount, statistics.poolCount, poolsData, isLoading]);

  const fetchPoolData = useCallback(
    async (isForce: boolean = false) => {
      if (isForce) {
        await refetch();
      }
    },
    [refetch]
  );

  const value: PoolContextType = useMemo(
    () => ({
      poolCount: statistics.poolCount,
      totalPoolCount: statistics.totalPoolCount, // 🔧 添加总池子数
      poolInfos,
      isLoading,
      refreshPools: fetchPoolData,
      totalStaked: {
        wethTotal: statistics.wethTotal,
        usdcTotal: statistics.usdcTotal,
      },
      totalRewards: BigInt(parseFloat(statistics.totalRewards) * 1e18), // 将字符串转回 bigint
      activeUsers: statistics.activeUsers,
      openNotification,
    }),
    [
      statistics.poolCount,
      statistics.totalPoolCount, // 🔧 添加依赖
      statistics.wethTotal,
      statistics.usdcTotal,
      statistics.totalRewards,
      statistics.activeUsers,
      poolInfos,
      isLoading,
      fetchPoolData,
      openNotification,
    ]
  );

  return (
    <PoolContext.Provider value={value}>
      {contextHolder}
      {children}
    </PoolContext.Provider>
  );
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
          {process.env.NEXT_PUBLIC_APP_TITLE || "标题"}
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

// 平台统计组件 - 使用全局 Pool Context 数据
function StatisticsComponent(): React.ReactNode {
  const { totalStaked, totalRewards, poolCount, isLoading, refreshPools } =
    usePoolContext();

  const handleRefresh = async () => {
    await refreshPools(true);
  };

  return (
    <main>
      <div className="w-full bg-white rounded-lg p-4 sm:p-6 lg:p-7 shadow-sm">
        <div className="flex justify-between items-center mb-4 sm:mb-6 lg:mb-7">
          <Typography.Title
            level={3}
            className="text-center !mb-0 text-xl sm:text-2xl flex-1"
          >
            平台统计
          </Typography.Title>
        </div>
        <Divider className="!mt-0" />
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mt-6">
          <div className="text-center">
            <Typography.Title
              className="!text-green-700 !mb-2 text-2xl font-bold"
              level={4}
            >
              {isLoading ? "加载中..." : `${totalStaked.wethTotal} WETH`}
            </Typography.Title>
            <Typography.Text type="secondary" className="text-sm sm:text-base">
              总锁仓量(WETH)
            </Typography.Text>
          </div>
          <div className="text-center">
            <Typography.Title
              className="!text-green-700 !mb-2 text-2xl font-bold"
              level={4}
            >
              {isLoading ? "加载中..." : `${totalStaked.usdcTotal} USDC`}
            </Typography.Title>
            <Typography.Text type="secondary" className="text-sm sm:text-base">
              总锁仓量(USDC)
            </Typography.Text>
          </div>
          <div className="text-center">
            <Typography.Title
              className="!text-purple-500 !mb-2 text-2xl font-bold"
              level={4}
            >
              {isLoading ? "加载中..." : poolCount}
            </Typography.Title>
            <Typography.Text type="secondary" className="text-sm sm:text-base">
              可用质押池
            </Typography.Text>
          </div>
          <div className="text-center">
            <Typography.Title
              className="!text-red-400 !mb-2 text-2xl font-bold"
              level={4}
            >
              {isLoading ? "加载中..." : formatEther(totalRewards)}
            </Typography.Title>
            <Typography.Text type="secondary" className="text-sm sm:text-base">
              已发放奖励
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
interface ModalProps {
  visible: boolean;
  onClose: () => void;
  onNotification: (title: string, description: string) => void;
}

// 新建质押 Modal 组件
function StakeModal({
  visible,
  onClose,
  onNotification,
}: ModalProps): React.ReactNode {
  interface ItemProps {
    label: string;
    value: string;
    address: string;
  }

  const { poolInfos, isLoading: poolsLoading, refreshPools } = usePoolContext();
  const [poolOptions, setPoolOptions] = useState<ItemProps[]>([]);
  const [currentSelectOption, setCurrentSelectOption] =
    useState<ItemProps | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputStakeAmount, setInputStakeAmount] = useState<string>("0");

  const wallet = useWagmiWalletClient();
  const { executeStake, isProcessing: isStakeProcessing } = useStakeContract();

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

        // 获取当前时间戳（秒）
        const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

        for (const [index, poolInfo] of poolInfos.entries()) {
          if (!poolInfo) continue;

          console.log(`池子 ${index} 判断条件:`, {
            isOpenForStaking: poolInfo.isOpenForStaking,
            endTime: poolInfo.endTime.toString(),
            currentTime: currentTimestamp.toString(),
            未过期: currentTimestamp < poolInfo.endTime,
          });

          // 质押 Modal: 需要判断 isOpenForStaking 和当前时间是否 < endTime
          if (!poolInfo.isOpenForStaking) {
            console.log(`池子 ${index} 跳过: 池子未激活`);
            continue;
          }

          if (currentTimestamp >= poolInfo.endTime) {
            console.log(`池子 ${index} 跳过: 池子已过期`);
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
    if (!wallet.isConnected || !wallet.data) {
      onNotification("错误", "请先连接钱包");
      return;
    }

    console.log("质押池信息:", currentSelectOption);

    // 检查余额  如果是WETH,parseEther转换，如果是USDC,parseUnits转换
    let stakeAmountBigInt = 0n;
    if (currentSelectOption.address === WETH_ADDRESS) {
      console.log("使用WETH进行质押，数量转换");
      stakeAmountBigInt = parseEther(inputStakeAmount);
    } else if (currentSelectOption.address === USDC_ADDRESS) {
      console.log("使用USDC进行质押，数量转换");
      stakeAmountBigInt = parseUnits(inputStakeAmount, 6);
    }

    console.log("质押数量(BigInt):", stakeAmountBigInt);

    if (balance.data && balance.data.value < stakeAmountBigInt) {
      onNotification("错误", "余额不足，无法完成质押");
      return;
    }

    try {
      const poolId = parseInt(currentSelectOption.value);
      const contractAddress = deploymentInfo.contracts
        .MultiStakePledgeContractV2.address as `0x${string}`;
      const tokenAddress = currentSelectOption.address as `0x${string}`;

      // 使用 Hook 执行授权和质押
      await executeStake(
        {
          poolId,
          tokenAddress,
          stakeAmount: stakeAmountBigInt,
          contractAddress,
        },
        {
          onApprovalStart: () => {
            onNotification(
              "授权提示",
              "需要先授权代币使用权限，请在钱包中确认授权交易"
            );
          },
          onApprovalSuccess: (hash) => {
            onNotification("授权成功", `授权交易已提交: ${hash}`);
          },
          onApprovalError: (error) => {
            onNotification("授权失败", `请确认授权交易: ${error.message}`);
          },
          onStakeStart: () => {
            console.log("开始质押...");
          },
          onStakeSuccess: (hash) => {
            onNotification("质押成功", `质押交易已提交，交易哈希: ${hash}`);
            // 还原质押状态
            //将Select选项恢复成未选中
            setCurrentSelectOption(null);

            setInputStakeAmount("0");
            //清除缓存
            clearAllViemContractCache();

            //主页数据重新强制请求
            refreshPools(true);

            onClose();
          },
          onStakeError: (error) => {
            onNotification("质押失败", `质押交易失败: ${error.message}`);
          },
        }
      );
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
          <Button
            type="default"
            className="mr-3"
            onClick={onClose}
            disabled={isStakeProcessing}
          >
            取消
          </Button>
          <Button
            type="primary"
            onClick={handleStake}
            disabled={isProcessing || isStakeProcessing}
            loading={isStakeProcessing}
          >
            {isStakeProcessing ? "处理中..." : "确定"}
          </Button>
        </div>
      }
      open={visible}
      onCancel={onClose}
      closable={!isStakeProcessing}
      maskClosable={!isStakeProcessing}
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
          value={currentSelectOption?.value || undefined}
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
        {currentSelectOption && (
          <div className="col-span-12 grid grid-cols-12  mt-3 items-center">
            <div className="col-span-4 flex items-center">
              <Typography.Text>
                选择质押:
                {currentSelectOption?.address === WETH_ADDRESS
                  ? "WETH"
                  : currentSelectOption?.address === USDC_ADDRESS
                    ? "USDC"
                    : "未知代币"}
              </Typography.Text>
            </div>

            <div className="col-span-8">
              <InputNumber
                className="!w-full"
                defaultValue={0}
                onChange={(value) => {
                  setInputStakeAmount(value?.toString() || "0");
                  console.log("质押数量:", value);
                }}
              />
            </div>

            <div className="col-span-12 flex items-center justify-end">
              {" "}
              总余额 :
              <Typography.Text className="text-sm">
                {currentSelectOption?.address === WETH_ADDRESS
                  ? formatEther(balance.data?.value ?? 0n) + " WETH"
                  : currentSelectOption?.address === USDC_ADDRESS
                    ? formatUnits(balance.data?.value ?? 0n, 6) + " USDC"
                    : ""}
              </Typography.Text>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// 提取代币和奖励组件
function WithdrawModal({
  visible,
  onClose,
}: Omit<ModalProps, "onNotification">): React.ReactNode {
  const {
    openNotification,
    refreshPools,
    poolInfos,
    poolCount,
    totalPoolCount,
  } = usePoolContext();
  const wallet = useWagmiWalletClient();
  const publicClient = usePublicClient({ chainId: 11155111 });

  // 添加调试日志
  useEffect(() => {
    if (visible) {
      console.log("🔍 WithdrawModal 打开时的状态:", {
        poolCount,
        poolInfosLength: poolInfos.length,
        poolInfos,
      });
    }
  }, [visible, poolCount, poolInfos]);

  const { isProcessing, isRequesting, isWithdrawing, smartWithdraw } =
    useSmartWithdraw();

  const contractAddress = deploymentInfo.contracts.MultiStakePledgeContractV2
    .address as `0x${string}`;
  const contractAbi = contract.abi as Abi;

  // 存储用户在各个池子的实际余额和奖励
  const [userPoolsData, setUserPoolsData] = useState<Map<string, UserPoolData>>(
    new Map()
  );
  const [isLoadingData, setIsLoadingData] = useState(false);
  const processedDataRef = useRef<string>("");
  const isInitialLoadRef = useRef<boolean>(true); // 标记是否是初始加载

  // 生成所有有效池子的ID列表（提取Modal不应该过滤时间，用户需要能提取已结束池子的资金）
  const validPoolIds = useMemo(() => {
    const ids: number[] = [];

    console.log(`🔍 提取 Modal poolInfos 检查:`, {
      totalPoolCount,
      activePoolCount: poolCount,
      poolInfosLength: poolInfos.length,
      poolInfos: poolInfos.map((p, i) => ({
        index: i,
        exists: !!p,
        stakeToken: p?.stakeToken,
        endTime: p?.endTime?.toString(),
      })),
    });

    for (let i = 0; i < totalPoolCount; i++) {
      const poolInfo = poolInfos[i];
      // 只要池子信息存在就加入列表，不过滤时间
      if (poolInfo) {
        ids.push(i);
      }
    }

    console.log(
      `🔍 提取 Modal: 总池子数 ${totalPoolCount}, 活跃池子数 ${poolCount}, 有池子信息的数量 ${ids.length}, 池子ID:`,
      ids
    );
    return ids;
  }, [totalPoolCount, poolCount, poolInfos]);

  // 只读取有效池子的用户信息
  const { data: userPoolsReadData, refetch: refetchUserPools } =
    useReadContracts({
      contracts: validPoolIds.map((poolId) => ({
        address: contractAddress,
        abi: contractAbi,
        functionName: "getUserPoolInfo",
        args: [poolId, wallet.address],
        chainId: 11155111,
      })),
      query: {
        enabled: visible && !!wallet.address && validPoolIds.length > 0,
        refetchInterval: 3000, // 每3秒自动刷新一次，使 pendingRewards 实时更新
      },
    });

  // 格式化代币信息的辅助函数
  const formatTokenInfo = useCallback(
    (tokenAddress: string, amount: bigint) => {
      if (tokenAddress === WETH_ADDRESS) {
        return { symbol: "WETH", formatted: formatEther(amount) };
      } else if (tokenAddress === USDC_ADDRESS) {
        return { symbol: "USDC", formatted: formatUnits(amount, 6) };
      }
      return { symbol: "Unknown", formatted: "0" };
    },
    []
  );

  // 处理读取到的用户池子数据
  useEffect(() => {
    if (
      !visible ||
      !wallet.address ||
      validPoolIds.length === 0 ||
      !userPoolsReadData
    ) {
      return;
    }

    // 生成数据指纹，避免重复处理相同数据
    const dataFingerprint = JSON.stringify(
      userPoolsReadData.map((d) => ({
        status: d?.status,
        result: d?.result?.toString(),
      }))
    );

    // 如果数据没有变化，跳过处理
    if (processedDataRef.current === dataFingerprint) {
      return;
    }

    processedDataRef.current = dataFingerprint;

    const processUserPoolsData = async () => {
      // 只在初始加载时显示 Loading
      if (isInitialLoadRef.current) {
        setIsLoadingData(true);
      }

      const dataMap = new Map<string, UserPoolData>();

      try {
        const currentBlock = await publicClient?.getBlockNumber();

        // 遍历有效池子ID
        for (let idx = 0; idx < validPoolIds.length; idx++) {
          const poolId = validPoolIds[idx];
          const userData = userPoolsReadData[idx];
          const poolInfo = poolInfos[poolId]; // 使用实际的池子ID获取池子信息

          if (userData?.status !== "success" || !poolInfo) {
            console.log(`⏭️ 池子 ${poolId} 跳过: 数据读取失败或池子信息缺失`);
            continue;
          }

          // 提取 Modal: 不过滤时间，只要用户有质押就应该显示
          // 因为即使池子结束了，用户也需要能够提取资金

          // userData.result 是数组格式: [stakedBalance, pendingRewards, totalRewardsEarned, totalRewardsClaimed, pendingUnstakeRequests]
          const [
            stakedBalance,
            pendingRewards,
            totalRewardsEarned,
            totalRewardsClaimed,
            pendingUnstakeRequests,
          ] = userData.result as [
            bigint,
            bigint,
            bigint,
            bigint,
            Array<{ amount: bigint; unlockBlock: bigint }>,
          ];

          // 检查是否有解质押请求和状态
          const pendingRequests = pendingUnstakeRequests || [];
          const hasUnstakeRequest = pendingRequests.length > 0;
          console.log(poolCount);
          console.log(`🔍 池子 ${poolId} 初步检查:`, {
            stakedBalance: formatEther(stakedBalance),
            hasUnstakeRequest,
            pendingRequestsCount: pendingRequests.length,
          });

          // 🔧 修复：只在既没有活跃质押，也没有解质押请求时才跳过
          // 因为用户可能已经把所有余额都申请解质押了（stakedBalance=0），但还有冻结或已解冻的余额
          if (stakedBalance === 0n && !hasUnstakeRequest) {
            console.log(
              `⏭️ 池子 ${poolId} 跳过: 既没有活跃质押也没有解质押请求`
            );
            continue;
          }

          let canWithdraw = false;
          let remainingBlocks: bigint | undefined;
          let estimatedTime: string | undefined;
          let frozenBalance: bigint = 0n;
          let unfrozenBalance: bigint = 0n;

          if (hasUnstakeRequest && currentBlock) {
            // 分离已解冻和冷却期中的请求
            const executableRequests = pendingRequests.filter(
              (req) => req.unlockBlock <= currentBlock
            );
            const cooldownRequests = pendingRequests.filter(
              (req) => req.unlockBlock > currentBlock
            );

            canWithdraw = executableRequests.length > 0;

            // 计算已解冻总额
            unfrozenBalance = executableRequests.reduce(
              (sum, req) => sum + req.amount,
              0n
            );

            // 计算冷却期中总额
            frozenBalance = cooldownRequests.reduce(
              (sum, req) => sum + req.amount,
              0n
            );

            // 如果有冷却期中的请求，计算最近的解锁时间
            if (cooldownRequests.length > 0) {
              const nearestUnlock = cooldownRequests.reduce((min, req) =>
                req.unlockBlock < min.unlockBlock ? req : min
              );
              remainingBlocks = nearestUnlock.unlockBlock - currentBlock;

              // 计算预估时间（Sepolia 约 12 秒一个块）
              const blocks = Number(remainingBlocks);
              const seconds = blocks * 12;
              if (seconds < 60) {
                estimatedTime = `${seconds} 秒`;
              } else if (seconds < 3600) {
                estimatedTime = `${Math.ceil(seconds / 60)} 分钟`;
              } else {
                estimatedTime = `${Math.ceil(seconds / 3600)} 小时`;
              }
            }
          }

          // 🔧 修复：合约中的 stakedBalance 已经是扣除了申请解质押后的余额
          // stakedBalance (balances) = 活跃质押余额（可以继续申请解质押的部分）
          // 不需要再减去 frozenBalance 和 unfrozenBalance
          const availableBalance: bigint = stakedBalance;

          // 计算用户的总质押（包括活跃 + 冻结 + 已解冻）
          const totalUserStaked: bigint =
            stakedBalance + frozenBalance + unfrozenBalance;

          // 计算已冻结奖励（按冻结质押占总质押的比例计算）
          let frozenRewards = 0n;
          if (frozenBalance > 0n && stakedBalance > 0n) {
            frozenRewards = (pendingRewards * frozenBalance) / stakedBalance;
          }

          dataMap.set(poolId.toString(), {
            stakedBalance,
            availableBalance,
            frozenBalance,
            unfrozenBalance,
            pendingRewards,
            totalRewardsEarned,
            frozenRewards,
            totalRewardsClaimed,
            stakeToken: poolInfo.stakeToken,
            hasUnstakeRequest,
            canWithdraw,
            remainingBlocks,
            estimatedTime,
          });

          console.log(`池子 ${poolId} 用户实际数据:`, {
            活跃质押余额: formatEther(stakedBalance),
            可再次申请解质押: formatEther(availableBalance),
            冻结中: formatEther(frozenBalance),
            已解冻可提取: formatEther(unfrozenBalance),
            总质押: formatEther(totalUserStaked),
            可领取奖励: formatEther(pendingRewards),
            历史累计总奖励: formatEther(totalRewardsEarned),
            已冻结奖励: formatEther(frozenRewards),
            已领取奖励: formatEther(totalRewardsClaimed),
            有解质押请求: hasUnstakeRequest,
            可以提取: canWithdraw,
            剩余区块: remainingBlocks?.toString(),
            预估时间: estimatedTime,
          });

          // 添加数据一致性检查
          const calculatedTotal = totalRewardsClaimed + pendingRewards;
          if (totalRewardsEarned > 0n && calculatedTotal > 0n) {
            const difference = totalRewardsEarned - calculatedTotal;
            const percentDiff =
              (Number(difference) / Number(calculatedTotal)) * 100;

            if (Math.abs(percentDiff) > 1) {
              // 差异超过1%
              console.warn(
                `⚠️ 池子 ${poolId} 奖励数据不一致:`,
                `历史累计总奖励(${formatEther(totalRewardsEarned)}) ≠ `,
                `已领取(${formatEther(totalRewardsClaimed)}) + `,
                `待领取(${formatEther(pendingRewards)}) = ${formatEther(calculatedTotal)}`
              );
            }
          } else if (totalRewardsEarned === 0n && pendingRewards > 0n) {
            console.warn(
              `⚠️ 池子 ${poolId} 合约问题: 历史累计总奖励为0，但有${formatEther(pendingRewards)} MTK待领取`
            );
            console.info(
              `💡 提示: 这可能是合约版本问题，执行一次领取操作后，历史累计总奖励会开始记录`
            );
          }
        }

        console.log(`✅ 提取 Modal 数据处理完成:`, {
          总池子数: poolCount,
          有效池子数: validPoolIds.length,
          可显示的池子数: dataMap.size,
          池子ID列表: Array.from(dataMap.keys()),
        });

        setUserPoolsData(dataMap);
      } catch (error) {
        console.error("处理用户池子数据失败:", error);
      } finally {
        // 处理完成后，关闭 Loading 并标记初始加载已完成
        if (isInitialLoadRef.current) {
          setIsLoadingData(false);
          isInitialLoadRef.current = false;
        }
      }
    };

    processUserPoolsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, wallet.address, validPoolIds.length, userPoolsReadData]);

  const handleWithdraw = useCallback(
    async (
      poolId: string,
      stakeToken: string,
      amount: bigint,
      isDirectWithdraw: boolean = false
    ) => {
      // 🔧 只在开始时记录用户操作，不记录技术细节
      console.log(
        `🎯 [用户操作] ${isDirectWithdraw ? "立即提取" : "申请解质押"} - 池子ID: ${poolId}, 数量: ${
          formatTokenInfo(stakeToken, amount).formatted
        } ${formatTokenInfo(stakeToken, amount).symbol}`
      );

      try {
        await smartWithdraw(
          {
            poolId: parseInt(poolId),
            amount,
            forceExecute: isDirectWithdraw, // 🔧 传入 forceExecute 参数
          },
          {
            // 申请解质押成功（交易已提交）
            onRequestSuccess: (hash) => {
              openNotification(
                "申请解质押交易已提交",
                `交易哈希: ${hash}\n正在等待区块确认，请稍候...`
              );
            },
            // 申请解质押确认（交易已上链）
            onRequestConfirmed: (hash) => {
              openNotification(
                "申请解质押成功",
                `交易已确认: ${hash}\n请等待冷却期结束后再次点击提取按钮完成提取`
              );

              // 交易确认后刷新数据
              refetchUserPools();
            },
            // 申请解质押失败 - 静默处理
            onRequestError: () => {
              // 静默处理，不记录日志，错误会被外层 catch 捕获
            },
            // 执行提取成功（交易已提交）
            onWithdrawSuccess: (hash) => {
              openNotification(
                "提取交易已提交",
                `交易哈希: ${hash}\n正在等待区块确认，请稍候...`
              );
            },
            // 执行提取确认（交易已上链）
            onWithdrawConfirmed: (hash) => {
              openNotification(
                "提取成功",
                `交易已确认: ${hash}\n资金和奖励已到账！`
              );

              //清空缓存
              clearAllViemContractCache();
              // 提取成功后，重新获取数据
              if (!wallet.address) return;

              refreshPools(true);

              // 交易确认后刷新用户池子数据
              refetchUserPools();
            },
            // 执行提取失败 - 静默处理
            onWithdrawError: () => {
              // 静默处理，不记录日志，错误会被外层 catch 捕获
            },
            // 仍在冷却期
            onCooldownRemaining: (remainingBlocks, estimatedTime) => {
              openNotification(
                "申请成功，等待冷却期",
                `还需等待约 ${estimatedTime}（${remainingBlocks} 个区块）后才能提取`
              );
            },
          }
        );
      } catch (error) {
        // 只有在错误不是用户拒绝时才显示通知和记录日志
        if (error instanceof Error) {
          // 检查是否是用户拒绝的错误
          const isUserRejection =
            error.message.includes("User rejected") ||
            error.message.includes("User denied") ||
            error.message.includes("用户拒绝") ||
            error.message.includes("用户取消");

          if (isUserRejection) {
            // 用户拒绝交易，静默处理
            console.log("ℹ️ [用户操作] 用户取消了交易");
            openNotification("操作取消", "用户取消了交易");
          } else {
            // ❌ UI 层不再记录错误日志，只显示通知（日志已在 Hook 层记录）
            openNotification(
              `${isDirectWithdraw ? "提取" : "申请解质押"}失败`,
              error.message
            );
          }
        }
      }
    },
    [
      smartWithdraw,
      wallet.address,
      openNotification,
      refreshPools,
      formatTokenInfo,
      refetchUserPools,
    ]
  );

  const poolsContent = useMemo(() => {
    // 初始加载时显示 Loading
    if (isLoadingData) {
      return (
        <div className="text-center py-8">
          <Typography.Text type="secondary">正在加载数据...</Typography.Text>
        </div>
      );
    }

    if (userPoolsData.size === 0) {
      return (
        <div className="text-center py-8">
          <Typography.Text type="secondary">
            暂无质押记录或所有质押已提取
          </Typography.Text>
        </div>
      );
    }

    return (
      <div>
        {Array.from(userPoolsData.entries()).map(
          ([
            poolId,
            {
              stakedBalance,
              availableBalance,
              frozenBalance,
              unfrozenBalance,
              pendingRewards,
              totalRewardsEarned,
              frozenRewards,
              totalRewardsClaimed,
              stakeToken,
              remainingBlocks,
              estimatedTime,
            },
          ]) => {
            const { symbol, formatted } = formatTokenInfo(
              stakeToken,
              stakedBalance
            );
            const availableFormatted = formatTokenInfo(
              stakeToken,
              availableBalance
            );
            const frozenFormatted = formatTokenInfo(stakeToken, frozenBalance);
            const unfrozenFormatted = formatTokenInfo(
              stakeToken,
              unfrozenBalance
            );

            return (
              <div key={poolId} className="mt-3 p-4 border rounded-lg">
                <div className="mb-3">
                  <Typography.Title level={5} className="!mb-2">
                    池子ID: {poolId}
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    质押代币: {symbol}
                  </Typography.Text>
                </div>

                {/* 🔧 移除错误的数据异常警告 */}
                {/* 在新的逻辑下，stakedBalance 只是活跃质押，unfrozenBalance 可以大于它 */}

                {/* 质押数据展示 */}
                <div className="space-y-2 mb-3 p-3 bg-gray-50 rounded">
                  <div className="flex justify-between">
                    <Typography.Text>活跃质押余额:</Typography.Text>
                    <Typography.Text strong>
                      {formatted} {symbol}
                    </Typography.Text>
                  </div>
                  <div className="flex justify-between">
                    <Typography.Text>可申请解质押:</Typography.Text>
                    <Typography.Text strong className="text-green-600">
                      {availableFormatted.formatted} {symbol}
                    </Typography.Text>
                  </div>
                  {frozenBalance > 0n && (
                    <div className="flex justify-between">
                      <Typography.Text>冻结中（冷却期）:</Typography.Text>
                      <Typography.Text strong className="text-orange-600">
                        {frozenFormatted.formatted} {symbol}
                      </Typography.Text>
                    </div>
                  )}
                  {unfrozenBalance > 0n && (
                    <div className="flex justify-between">
                      <Typography.Text>可提取（已解冻）:</Typography.Text>
                      <Typography.Text strong className="text-blue-600">
                        {unfrozenFormatted.formatted} {symbol}
                      </Typography.Text>
                    </div>
                  )}
                </div>

                {/* 奖励数据展示 */}
                <div className="space-y-2 mb-3 p-3 bg-blue-50 rounded">
                  <div className="flex justify-between">
                    <div>
                      <Typography.Text>历史累计总奖励: </Typography.Text>
                      <Typography.Text className="text-xs text-gray-400">
                        (自质押开始)
                      </Typography.Text>
                    </div>
                    <Typography.Text strong className="text-blue-600">
                      {formatEther(totalRewardsEarned)} MTK
                    </Typography.Text>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <Typography.Text>可领取奖励（实时）: </Typography.Text>
                      <Typography.Text className="text-xs text-gray-400">
                        (动态更新)
                      </Typography.Text>
                    </div>
                    <Typography.Text strong className="text-green-600">
                      {formatEther(pendingRewards)} MTK
                    </Typography.Text>
                  </div>
                  {frozenRewards > 0n && (
                    <div className="flex justify-between">
                      <Typography.Text>已冻结奖励:</Typography.Text>
                      <Typography.Text strong className="text-orange-600">
                        {formatEther(frozenRewards)} MTK
                      </Typography.Text>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <Typography.Text>已领取奖励:</Typography.Text>
                    <Typography.Text strong className="text-gray-600">
                      {formatEther(totalRewardsClaimed)} MTK
                    </Typography.Text>
                  </div>
                </div>

                {/* 冷却期状态提示 */}
                {frozenBalance > 0n && estimatedTime && (
                  <div className="mb-3 p-2 bg-orange-50 rounded">
                    <Typography.Text className="text-orange-600">
                      ⏳ 冷却期中，还需等待 {estimatedTime} (
                      {remainingBlocks?.toString()} 个区块)
                    </Typography.Text>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex flex-col gap-2">
                  {/* 第一行：申请提取按钮 - 只在有可提取余额时显示 */}
                  {availableBalance > 0n && (
                    <Button
                      type="primary"
                      onClick={() => {
                        handleWithdraw(
                          poolId,
                          stakeToken,
                          availableBalance,
                          false
                        );
                      }}
                      disabled={isProcessing}
                      loading={isProcessing && isRequesting}
                      className="w-full"
                    >
                      {isProcessing && isRequesting
                        ? "申请中..."
                        : `申请解质押 ${availableFormatted.formatted} ${symbol}`}
                    </Button>
                  )}

                  {/* 第二行：立即提取按钮 - 只在有已解冻余额时显示 */}
                  {unfrozenBalance > 0n && (
                    <Button
                      type="primary"
                      onClick={() => {
                        handleWithdraw(
                          poolId,
                          stakeToken,
                          unfrozenBalance,
                          true
                        );
                      }}
                      disabled={isProcessing}
                      loading={isProcessing && isWithdrawing}
                      className="w-full"
                      style={{
                        backgroundColor: "#52c41a",
                      }}
                    >
                      {isProcessing && isWithdrawing
                        ? "提取中..."
                        : `立即提取 ${unfrozenFormatted.formatted} ${symbol} + 奖励`}
                    </Button>
                  )}

                  {/* 没有可操作的余额时的提示 */}
                  {availableBalance === 0n && unfrozenBalance === 0n && (
                    <div className="text-center p-3 bg-gray-50 rounded text-gray-500 text-sm">
                      {frozenBalance > 0n
                        ? "所有余额都在冷却期中，请等待解冻后提取"
                        : "没有可提取的余额"}
                    </div>
                  )}
                </div>
              </div>
            );
          }
        )}
      </div>
    );
  }, [
    isLoadingData,
    userPoolsData,
    isProcessing,
    isRequesting,
    isWithdrawing,
    handleWithdraw,
    formatTokenInfo,
  ]);

  return (
    <Modal
      title={<Typography.Title level={4}>提取质押和奖励</Typography.Title>}
      open={visible}
      onCancel={onClose}
      footer={
        <div>
          <Button type="default" className="mr-3" onClick={onClose}>
            关闭
          </Button>
        </div>
      }
    >
      <div>{poolsContent}</div>
    </Modal>
  );
}

//查看交易历史组件
function HistoryModal({
  visible,
  onClose,
}: Omit<ModalProps, "onNotification">): React.ReactNode {
  const [initLoading, setInitLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);
  const hasInitialized = useRef(false);
  const wallet = useWagmiWalletClient();
  const {
    transactions,
    isLoading,
    hasMoreData,
    loadMoreData,
    refreshTransactionHistory,
    setPageSize: setHookPageSize,
  } = useStakeExchangeHistory();

  useEffect(() => {
    // 当 Modal 打开且钱包已连接时，初始化加载
    if (visible && wallet.address && !hasInitialized.current) {
      console.log("🚀 Modal 打开，初始化加载交易历史记录，设置页面大小为5");
      setInitLoading(true);
      setCurrentPage(1);

      // 设置页面大小并加载第一页数据
      setHookPageSize(pageSize).then(() => {
        setInitLoading(false);
        hasInitialized.current = true;
      });
    }

    // Modal 关闭时重置标志
    if (!visible) {
      hasInitialized.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, wallet.address]);

  const onLoadMore = async () => {
    console.log("🔘 点击加载更多按钮");
    const nextPage = currentPage + 1;
    const moreTransactions = await loadMoreData(currentPage, pageSize);
    if (moreTransactions.length > 0) {
      setCurrentPage(nextPage);
    }
    window.dispatchEvent(new Event("resize"));
  };

  console.log("🎮 渲染加载更多按钮状态:", {
    initLoading,
    isLoading,
    hasMoreData,
    transactionsLength: transactions.length,
  });

  const loadMore =
    !initLoading && !isLoading && hasMoreData ? (
      <div className="text-center my-4">
        <Button
          type="primary"
          onClick={onLoadMore}
          loading={isLoading}
          size="large"
          className="w-[200px] h-[40px] rounded-lg"
        >
          加载更多
        </Button>
      </div>
    ) : !hasMoreData && transactions.length > 0 ? (
      <div className="text-center my-4 p-3 bg-gray-50 rounded-lg text-gray-600 text-sm">
        已显示全部 {transactions.length} 条交易记录
      </div>
    ) : transactions.length === 0 && !initLoading && !isLoading ? (
      <div className="text-center my-10 p-10 bg-gray-50 rounded-lg text-gray-400 text-base">
        暂无交易历史记录
      </div>
    ) : (
      <div className="text-center my-4 p-3 bg-blue-50 rounded-lg text-blue-600 text-sm">
        加载中...
      </div>
    );

  function CheckedExchangeHistory(): React.ReactNode {
    // 格式化金额
    const formatAmount = (
      amount: bigint | undefined,
      tokenSymbol?: string
    ): string => {
      if (!amount) return "N/A";

      if (tokenSymbol === "USDC") {
        return formatUnits(amount, 6);
      } else {
        return formatEther(amount);
      }
    };

    // 格式化时间戳
    const formatTimestamp = (timestamp: number): string => {
      return new Date(timestamp).toLocaleString();
    };

    // 交易类型颜色映射
    const getTypeColor = (type: TransactionType): string => {
      switch (type) {
        case "Stake":
          return "#52c41a";
        case "Unstake":
          return "#faad14";
        case "Withdraw":
          return "#1890ff";
        case "ClaimRewards":
          return "#722ed1";
        default:
          return "#666666";
      }
    };

    // 交易状态颜色映射
    const getStatusColor = (status: TransactionStatus): string => {
      switch (status) {
        case "Success":
          return "#52c41a";
        case "Failed":
          return "#ff4d4f";
        case "Pending":
          return "#faad14";
        default:
          return "#666666";
      }
    };

    // 交易类型标签映射
    const getTypeLabel = (type: TransactionType): string => {
      switch (type) {
        case "Stake":
          return "质押";
        case "Unstake":
          return "解质押";
        case "Withdraw":
          return "提取";
        case "ClaimRewards":
          return "领取奖励";
        default:
          return "未知";
      }
    };

    // 交易状态标签映射
    const getStatusLabel = (status: TransactionStatus): string => {
      switch (status) {
        case "Success":
          return "成功";
        case "Failed":
          return "失败";
        case "Pending":
          return "待处理";
        default:
          return "未知";
      }
    };

    return (
      <List
        className="demo-loadmore-list"
        loading={initLoading}
        itemLayout="vertical"
        loadMore={loadMore}
        dataSource={transactions}
        renderItem={(item) => (
          <List.Item key={item.id}>
            <Skeleton
              avatar={false}
              title={false}
              loading={isLoading}
              active
              paragraph={{ rows: 4 }}
            >
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-2">
                {/* 头部信息：类型、状态、时间 */}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold text-white"
                      style={{ backgroundColor: getTypeColor(item.type) }}
                    >
                      {getTypeLabel(item.type)}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-xs text-white"
                      style={{ backgroundColor: getStatusColor(item.status) }}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                    {item.poolId !== undefined && (
                      <span className="px-2 py-0.5 rounded text-xs text-white bg-gray-600">
                        池子 #{item.poolId}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-600">
                    {formatTimestamp(item.timestamp)}
                  </span>
                </div>

                {/* 详细信息 */}
                <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3 text-sm">
                  {/* 交易金额 */}
                  {item.amount && (
                    <div>
                      <div className="text-xs text-gray-600 mb-1">金额</div>
                      <div className="font-bold">
                        {formatAmount(item.amount, item.tokenSymbol)}{" "}
                        {item.tokenSymbol}
                      </div>
                    </div>
                  )}

                  {/* 奖励金额 */}
                  {item.rewardAmount && (
                    <div>
                      <div className="text-xs text-gray-600 mb-1">奖励</div>
                      <div className="font-bold text-green-600">
                        {formatEther(item.rewardAmount)} MTK
                      </div>
                    </div>
                  )}

                  {/* 区块信息 */}
                  <div>
                    <div className="text-xs text-gray-600 mb-1">区块</div>
                    <div className="font-bold">
                      {Number(item.blockNumber).toLocaleString()}
                    </div>
                  </div>

                  {/* 确认数 */}
                  <div>
                    <div className="text-xs text-gray-600 mb-1">确认数</div>
                    <div className="font-bold">{item.confirmations}</div>
                  </div>

                  {/* 解锁区块（解质押请求） */}
                  {item.unlockBlock && (
                    <div>
                      <div className="text-xs text-gray-600 mb-1">解锁区块</div>
                      <div className="font-bold">
                        {Number(item.unlockBlock).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>

                {/* 交易哈希 */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-600 mb-1">交易哈希</div>
                  <div className="bg-gray-100 p-1 px-2 rounded text-xs font-mono break-all">
                    {item.transactionHash}
                  </div>
                </div>

                {/* 底部信息 */}
                <div className="mt-2 text-xs text-gray-400 flex justify-between">
                  <span>事件: {item.eventName}</span>
                  <span>
                    合约: {item.contractAddress.slice(0, 6)}...
                    {item.contractAddress.slice(-4)}
                  </span>
                </div>
              </div>
            </Skeleton>
          </List.Item>
        )}
      />
    );
  }

  return (
    <Modal
      title={
        <div className="flex justify-between items-center">
          <Typography.Title level={4} className="m-0">
            查看交易历史
          </Typography.Title>
          <Button
            type="text"
            size="small"
            onClick={() => refreshTransactionHistory()}
            loading={isLoading}
            className="text-blue-500"
          >
            刷新数据
          </Button>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button
          key="refresh"
          type="default"
          onClick={() => refreshTransactionHistory()}
          loading={isLoading}
        >
          刷新数据
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          关闭
        </Button>,
      ]}
      width={800}
      style={{ top: 20 }}
      styles={{
        body: {
          maxHeight: "calc(100vh - 200px)",
          overflow: "auto",
        },
      }}
    >
      <div className="min-h-[400px]">
        <CheckedExchangeHistory />
      </div>
    </Modal>
  );
}

//用户操作仪表盘组件
function UserDashboardComponent(): React.ReactNode {
  const { openNotification } = usePoolContext(); // 确保 PoolContext 可用
  const wallet = useWagmiWalletClient();
  //质押
  const [stakeModalVisible, setStakeModalVisible] = useState(false);
  //提取
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  //查看交易历史
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  return (
    <>
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
                setWithdrawModalVisible(true);
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
                setHistoryModalVisible(true);
              }}
            >
              查看交易历史
            </Button>
          </div>
        </div>
      </div>

      {stakeModalVisible && (
        <StakeModal
          visible={stakeModalVisible}
          onClose={() => setStakeModalVisible(false)}
          onNotification={openNotification}
        />
      )}

      {withdrawModalVisible && (
        <WithdrawModal
          visible={withdrawModalVisible}
          onClose={() => setWithdrawModalVisible(false)}
        />
      )}

      {historyModalVisible && (
        <HistoryModal
          visible={historyModalVisible}
          onClose={() => setHistoryModalVisible(false)}
        />
      )}
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
