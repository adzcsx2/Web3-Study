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
} from "antd";
import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useMemo,
  useCallback,
} from "react";
import { useWagmiWalletClient } from "@/hooks/useWalletClient";
import { formatEther, formatUnits, parseEther, parseUnits } from "viem";
import { multiStakeViemContract } from "@/services/MultiStakeViemService";
import { USDC_ADDRESS, WETH_ADDRESS } from "@/utils/constants";
import { useBalance, usePublicClient } from "wagmi";
import { useStakeContract } from "@/hooks/useStakeContract";
import deploymentInfo from "@/app/abi/deployment-info.json";
import { useSmartWithdraw } from "@/hooks/useSmartWithdraw";
import { clearAllViemContractCache } from "@/utils/viemContractUtils";

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
  refreshPools: (isForce?: boolean) => Promise<void>;
  totalStaked: {
    wethTotal: string;
    usdcTotal: string;
  };
  totalRewards: bigint;
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

// Pool Provider 组件
function PoolProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  const [poolCount, setPoolCount] = useState<number>(0);
  const [poolInfos, setPoolInfos] = useState<(PoolInfo | null)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRewards, setTotalRewards] = useState<bigint>(0n);

  const [api, contextHolder] = notification.useNotification();

  const [totalStaked, setTotalStaked] = useState<{
    wethTotal: string;
    usdcTotal: string;
  }>({ wethTotal: "0", usdcTotal: "0" });

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

  const fetchPoolData = useCallback(async (isForce: boolean = false) => {
    try {
      setIsLoading(true);

      // 获取池子数量
      const count = await multiStakeViemContract.getPoolCount(isForce);
      const countNumber = Number(count);
      setPoolCount(countNumber);

      if (countNumber === 0) {
        setPoolInfos([]);
        setTotalStaked({ wethTotal: "0", usdcTotal: "0" });
        return;
      }

      // 批量获取所有池子信息
      const pools: number[] = Array.from({ length: countNumber }, (_, i) => i);
      const infos = await multiStakeViemContract.batchGetPoolInfo(
        pools,
        isForce
      );
      setPoolInfos(infos);

      // 一次性计算总质押量
      let wethTotal = BigInt(0);
      let usdcTotal = BigInt(0);

      // 获取总奖励发放量
      let _totalRewards = BigInt(0);

      for (const poolInfo of infos) {
        if (poolInfo) {
          const tokenType = poolInfo.stakeToken;
          if (tokenType === WETH_ADDRESS) {
            wethTotal += poolInfo.totalStaked;
          } else if (tokenType === USDC_ADDRESS) {
            usdcTotal += poolInfo.totalStaked;
          }
          _totalRewards += poolInfo.totalRewardsIssued;
        }
      }
      setTotalRewards(_totalRewards);

      setTotalStaked({
        wethTotal: formatEther(wethTotal),
        usdcTotal: formatUnits(usdcTotal, 6),
      });

      console.log(
        `✅ 全局加载池子数据成功: 共 ${countNumber} 个池子, WETH=${formatEther(wethTotal)}, USDC=${formatUnits(usdcTotal, 6)}`
      );
    } catch (error) {
      console.error("获取池子数据失败:", error);
      setPoolCount(0);
      setPoolInfos([]);
      setTotalStaked({ wethTotal: "0", usdcTotal: "0" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPoolData();
  }, [fetchPoolData]);

  const value: PoolContextType = useMemo(
    () => ({
      poolCount,
      poolInfos,
      isLoading,
      refreshPools: fetchPoolData,
      totalStaked,
      totalRewards,
      openNotification,
    }),
    [
      poolCount,
      poolInfos,
      isLoading,
      fetchPoolData,
      totalStaked,
      totalRewards,
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

// 总发放奖励显示组件 - 使用全局 Pool Context
function TotalReward(): React.ReactNode {
  const { totalRewards, isLoading } = usePoolContext();

  if (isLoading) return <>加载中...</>;

  return <>{formatEther(totalRewards)}</>;
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
              <TotalReward />
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
  const { openNotification, refreshPools } = usePoolContext(); // 确保 PoolContext 可用
  const { poolCount } = useContext(PoolContext)!;
  const wallet = useWagmiWalletClient();
  const publicClient = usePublicClient({ chainId: 11155111 });

  const { isProcessing, isRequesting, isWithdrawing, smartWithdraw } =
    useSmartWithdraw();

  // 存储用户在各个池子的实际余额和奖励
  const [userPoolsData, setUserPoolsData] = useState<
    Map<
      string,
      {
        stakedBalance: bigint; // 总质押量
        availableBalance: bigint; // 可提取（未申请解质押的部分）
        frozenBalance: bigint; // 已冻结（已申请但还在冷却期的部分）
        unfrozenBalance: bigint; // 已解冻（可立即提取的部分）
        pendingRewards: bigint; // 可领取奖励（当前累积的奖励）
        totalRewardsEarned: bigint; // 总共可领取奖励（历史总奖励）
        frozenRewards: bigint; // 已冻结奖励（与冻结质押对应的奖励）
        totalRewardsClaimed: bigint; // 已领取奖励（历史已领取的奖励）
        stakeToken: string;
        hasUnstakeRequest: boolean;
        canWithdraw: boolean;
        remainingBlocks?: bigint;
        estimatedTime?: string;
      }
    >
  >(new Map());
  const [isLoadingData, setIsLoadingData] = useState(false);

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

  // 获取用户在所有池子的真实余额和奖励
  useEffect(() => {
    if (!visible || !wallet.address || poolCount === 0) {
      return;
    }

    const fetchUserPoolsData = async () => {
      setIsLoadingData(true);
      const dataMap = new Map<
        string,
        {
          stakedBalance: bigint; // 总质押量
          availableBalance: bigint; // 可提取（未申请解质押的部分）
          frozenBalance: bigint; // 已冻结（已申请但还在冷却期的部分）
          unfrozenBalance: bigint; // 已解冻（可立即提取的部分）
          pendingRewards: bigint; // 可领取奖励（当前累积的奖励）
          totalRewardsEarned: bigint; // 总共可领取奖励（历史总奖励）
          frozenRewards: bigint; // 已冻结奖励（与冻结质押对应的奖励）
          totalRewardsClaimed: bigint; // 已领取奖励（历史已领取的奖励）
          stakeToken: string;
          hasUnstakeRequest: boolean;
          canWithdraw: boolean;
          remainingBlocks?: bigint;
          estimatedTime?: string;
        }
      >();

      try {
        // 遍历所有池子，获取用户的实际质押信息
        for (let poolId = 0; poolId < poolCount; poolId++) {
          const userPoolInfo = await multiStakeViemContract.getUserPoolInfo(
            poolId,
            wallet.address!,
            true // 强制刷新获取最新数据
          );

          // 只添加有质押余额的池子
          if (userPoolInfo.stakedBalance > 0n) {
            // 获取池子信息以获取 stakeToken
            const poolInfo = await multiStakeViemContract.getPoolInfo(
              poolId,
              true
            );

            // 检查是否有解质押请求和状态
            const pendingRequests = userPoolInfo.pendingUnstakeRequests || [];
            const hasUnstakeRequest = pendingRequests.length > 0;

            let canWithdraw = false;
            let remainingBlocks: bigint | undefined;
            let estimatedTime: string | undefined;
            let frozenBalance = 0n; // 已冻结（冷却期中）
            let unfrozenBalance = 0n; // 已解冻（可立即提取）

            if (hasUnstakeRequest) {
              // 获取当前区块号
              const currentBlock = await publicClient?.getBlockNumber();

              if (currentBlock) {
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
            }

            // 计算可提取余额（未申请解质押的部分）
            const totalRequestedAmount = frozenBalance + unfrozenBalance;
            const availableBalance =
              userPoolInfo.stakedBalance - totalRequestedAmount;

            // 计算已冻结奖励（按冻结质押占总质押的比例计算）
            let frozenRewards = 0n;
            if (frozenBalance > 0n && userPoolInfo.stakedBalance > 0n) {
              // frozenRewards = pendingRewards * frozenBalance / stakedBalance
              frozenRewards =
                (userPoolInfo.pendingRewards * frozenBalance) /
                userPoolInfo.stakedBalance;
            }

            dataMap.set(poolId.toString(), {
              stakedBalance: userPoolInfo.stakedBalance, // 总质押量
              availableBalance, // 可提取（未申请解质押的部分）
              frozenBalance, // 已冻结（已申请但还在冷却期的部分）
              unfrozenBalance, // 已解冻（可立即提取的部分）
              pendingRewards: userPoolInfo.pendingRewards, // 可领取奖励（当前累积的奖励）
              totalRewardsEarned: userPoolInfo.totalRewardsEarned, // 总共可领取奖励（历史总奖励）
              frozenRewards, // 已冻结奖励（与冻结质押对应的奖励）
              totalRewardsClaimed: userPoolInfo.totalRewardsClaimed, // 已领取奖励（历史已领取的奖励）
              stakeToken: poolInfo.stakeToken,
              hasUnstakeRequest,
              canWithdraw,
              remainingBlocks,
              estimatedTime,
            });

            console.log(`池子 ${poolId} 用户实际数据:`, {
              总质押量: formatEther(userPoolInfo.stakedBalance),
              可提取: formatEther(availableBalance),
              已冻结: formatEther(frozenBalance),
              已解冻: formatEther(unfrozenBalance),
              可领取奖励: formatEther(userPoolInfo.pendingRewards),
              总共可领取奖励: formatEther(userPoolInfo.totalRewardsEarned),
              已冻结奖励: formatEther(frozenRewards),
              已领取奖励: formatEther(userPoolInfo.totalRewardsClaimed),
              有解质押请求: hasUnstakeRequest,
              可以提取: canWithdraw,
              剩余区块: remainingBlocks?.toString(),
              预估时间: estimatedTime,
            });
          }
        }

        setUserPoolsData(dataMap);
      } catch (error) {
        console.error("获取用户池子数据失败:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchUserPoolsData();
  }, [visible, wallet.address, poolCount, publicClient]);

  const handleWithdraw = useCallback(
    async (poolId: string, stakeToken: string, amount: bigint) => {
      console.log(
        `准备提取 - 池子ID: ${poolId}, 质押代币: ${stakeToken}, 质押数量: ${
          formatTokenInfo(stakeToken, amount).formatted
        }`
      );

      try {
        await smartWithdraw(
          {
            poolId: parseInt(poolId),
            amount,
          },
          {
            // 申请解质押成功
            onRequestSuccess: (hash) => {
              openNotification(
                "申请解质押成功",
                `申请解质押交易已提交，交易哈希: ${hash}\n请等待冷却期结束后再次点击提取按钮完成提取`
              );

              // 更新本地状态，标记为有解质押请求
              setTimeout(async () => {
                try {
                  const userPoolInfo =
                    await multiStakeViemContract.getUserPoolInfo(
                      parseInt(poolId),
                      wallet.address!,
                      true
                    );

                  const pendingRequests =
                    userPoolInfo.pendingUnstakeRequests || [];
                  const currentBlock = await publicClient?.getBlockNumber();

                  let remainingBlocks: bigint | undefined;
                  let estimatedTime: string | undefined;

                  if (pendingRequests.length > 0 && currentBlock) {
                    const nearestUnlock = pendingRequests.reduce((min, req) =>
                      req.unlockBlock < min.unlockBlock ? req : min
                    );
                    remainingBlocks = nearestUnlock.unlockBlock - currentBlock;

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

                  setUserPoolsData((prev) => {
                    const newMap = new Map(prev);
                    const existing = newMap.get(poolId);
                    if (existing) {
                      // 重新计算各个余额
                      const totalRequestedAmount =
                        remainingBlocks && remainingBlocks > 0n
                          ? existing.frozenBalance + amount
                          : existing.frozenBalance;
                      const newAvailableBalance =
                        existing.stakedBalance - totalRequestedAmount;

                      // 重新计算已冻结奖励
                      let newFrozenRewards = 0n;
                      if (
                        totalRequestedAmount > 0n &&
                        existing.stakedBalance > 0n
                      ) {
                        newFrozenRewards =
                          (existing.pendingRewards * totalRequestedAmount) /
                          existing.stakedBalance;
                      }

                      newMap.set(poolId, {
                        ...existing,
                        availableBalance: newAvailableBalance,
                        frozenBalance: totalRequestedAmount,
                        frozenRewards: newFrozenRewards,
                        hasUnstakeRequest: true,
                        canWithdraw: false,
                        remainingBlocks,
                        estimatedTime,
                      });
                    }
                    return newMap;
                  });
                } catch (err) {
                  console.error("更新申请状态失败:", err);
                }
              }, 2000);
            },
            // 申请解质押失败 - 静默处理
            onRequestError: () => {
              // 静默处理，不记录日志，错误会被外层 catch 捕获
            },
            // 执行提取成功
            onWithdrawSuccess: (hash) => {
              openNotification(
                "提取成功",
                `提取交易已提交，交易哈希: ${hash}\n资金和奖励已到账！`
              );
              //清空缓存
              clearAllViemContractCache();
              // 提取成功后，重新获取数据
              if (!wallet.address) return;

              refreshPools(true);

              // 重新获取池子数据
              setTimeout(async () => {
                try {
                  const userPoolInfo =
                    await multiStakeViemContract.getUserPoolInfo(
                      parseInt(poolId),
                      wallet.address!,
                      true
                    );

                  // 提前获取当前区块号
                  const currentBlock = await publicClient?.getBlockNumber();

                  setUserPoolsData((prev) => {
                    const newMap = new Map(prev);
                    if (userPoolInfo.stakedBalance === 0n) {
                      // 如果余额为0，移除该池子
                      newMap.delete(poolId);
                    } else {
                      // 否则更新数据
                      const existing = newMap.get(poolId);
                      if (existing) {
                        // 重新计算各个余额
                        const pendingRequests =
                          userPoolInfo.pendingUnstakeRequests || [];

                        let frozenBalance = 0n;
                        let unfrozenBalance = 0n;

                        if (currentBlock) {
                          const cooldownRequests = pendingRequests.filter(
                            (req) => req.unlockBlock > currentBlock
                          );
                          frozenBalance = cooldownRequests.reduce(
                            (sum, req) => sum + req.amount,
                            0n
                          );

                          const executableRequests = pendingRequests.filter(
                            (req) => req.unlockBlock <= currentBlock
                          );
                          unfrozenBalance = executableRequests.reduce(
                            (sum, req) => sum + req.amount,
                            0n
                          );
                        }

                        const totalRequestedAmount =
                          frozenBalance + unfrozenBalance;
                        const availableBalance =
                          userPoolInfo.stakedBalance - totalRequestedAmount;

                        // 重新计算已冻结奖励
                        let frozenRewards = 0n;
                        if (
                          frozenBalance > 0n &&
                          userPoolInfo.stakedBalance > 0n
                        ) {
                          frozenRewards =
                            (userPoolInfo.pendingRewards * frozenBalance) /
                            userPoolInfo.stakedBalance;
                        }

                        newMap.set(poolId, {
                          ...existing,
                          stakedBalance: userPoolInfo.stakedBalance,
                          availableBalance,
                          frozenBalance,
                          unfrozenBalance,
                          pendingRewards: userPoolInfo.pendingRewards,
                          totalRewardsEarned: userPoolInfo.totalRewardsEarned,
                          frozenRewards,
                          totalRewardsClaimed: userPoolInfo.totalRewardsClaimed,
                          hasUnstakeRequest: pendingRequests.length > 0,
                          canWithdraw: unfrozenBalance > 0n,
                          remainingBlocks: undefined,
                          estimatedTime: undefined,
                        });
                      }
                    }
                    return newMap;
                  });
                } catch (err) {
                  console.error("更新本地数据失败:", err);
                }
              }, 2000);
            },
            // 执行提取失败 - 静默处理
            onWithdrawError: () => {
              // 静默处理，不记录日志，错误会被外层 catch 捕获
            },
            // 仍在冷却期
            onCooldownRemaining: (remainingBlocks, estimatedTime) => {
              openNotification(
                "仍在冷却期",
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
            // 用户拒绝交易，完全静默处理
            console.log("用户取消了交易");
            openNotification("提取失败", `用户取消了交易`);
          } else {
            // 真实的错误才记录和通知
            console.error("提取操作失败:", error);
            openNotification(
              "提取失败",
              `池子 ${poolId} 提取失败: ${error.message}`
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
      publicClient,
    ]
  );

  const poolsContent = useMemo(() => {
    if (isLoadingData) {
      return <Typography.Text>加载中...</Typography.Text>;
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

            // 确定按钮文本和可用性
            const canRequestUnstake = availableBalance > 0n;
            const canWithdrawUnfrozen = unfrozenBalance > 0n;

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

                {/* 质押数据展示 */}
                <div className="space-y-2 mb-3 p-3 bg-gray-50 rounded">
                  <div className="flex justify-between">
                    <Typography.Text>质押数量（总质押量）:</Typography.Text>
                    <Typography.Text strong>
                      {formatted} {symbol}
                    </Typography.Text>
                  </div>
                  <div className="flex justify-between">
                    <Typography.Text>可提取{symbol}:</Typography.Text>
                    <Typography.Text strong className="text-green-600">
                      {availableFormatted.formatted} {symbol}
                    </Typography.Text>
                  </div>
                  {frozenBalance > 0n && (
                    <div className="flex justify-between">
                      <Typography.Text>已冻结{symbol}:</Typography.Text>
                      <Typography.Text strong className="text-orange-600">
                        {frozenFormatted.formatted} {symbol}
                      </Typography.Text>
                    </div>
                  )}
                  {unfrozenBalance > 0n && (
                    <div className="flex justify-between">
                      <Typography.Text>已解冻{symbol}:</Typography.Text>
                      <Typography.Text strong className="text-blue-600">
                        {unfrozenFormatted.formatted} {symbol}
                      </Typography.Text>
                    </div>
                  )}
                </div>

                {/* 奖励数据展示 */}
                <div className="space-y-2 mb-3 p-3 bg-blue-50 rounded">
                  <div className="flex justify-between">
                    <Typography.Text>总共可领取奖励:</Typography.Text>
                    <Typography.Text strong className="text-blue-600">
                      {formatEther(totalRewardsEarned)} MTK
                    </Typography.Text>
                  </div>
                  <div className="flex justify-between">
                    <Typography.Text>可领取奖励（当前）:</Typography.Text>
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
                <div className="flex gap-2">
                  {/* 申请提取按钮 - 只针对"可提取"的部分 */}
                  <Button
                    type="primary"
                    onClick={() => {
                      handleWithdraw(poolId, stakeToken, availableBalance);
                    }}
                    disabled={!canRequestUnstake || isProcessing}
                    loading={isProcessing && isRequesting}
                    className="flex-1"
                  >
                    {isProcessing && isRequesting ? "申请中..." : "申请提取"}
                  </Button>

                  {/* 立即提取按钮 - 只针对已解冻的部分 */}
                  <Button
                    type="primary"
                    onClick={() => {
                      handleWithdraw(poolId, stakeToken, unfrozenBalance);
                    }}
                    disabled={!canWithdrawUnfrozen || isProcessing}
                    loading={isProcessing && isWithdrawing}
                    className="flex-1"
                    style={{
                      backgroundColor: canWithdrawUnfrozen
                        ? "#52c41a"
                        : undefined,
                    }}
                  >
                    {isProcessing && isWithdrawing ? "提取中..." : "立即提取"}
                  </Button>
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
  return (
    <Modal
      title={<Typography.Title level={4}>查看交易历史</Typography.Title>}
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
      查看交易历史功能开发中，敬请期待！
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

      <StakeModal
        visible={stakeModalVisible}
        onClose={() => setStakeModalVisible(false)}
        onNotification={openNotification}
      />
      <WithdrawModal
        visible={withdrawModalVisible}
        onClose={() => setWithdrawModalVisible(false)}
      />
      <HistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
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
