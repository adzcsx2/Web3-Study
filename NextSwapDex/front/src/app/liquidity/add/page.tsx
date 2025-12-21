"use client";
import React, { useState, useCallback, useEffect } from "react";
import { Typography, Divider, Card, Tabs, Switch, Steps, Button } from "antd";
import {
  SettingOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import TokenSelectButton from "@/components/ui/button/TokenSelectButton";
import LiquidityInput from "@/components/ui/LiquidityInput";
import LiquidityDetails from "@/components/ui/LiquidityDetails";
import AddLiquidityButton from "@/components/ui/AddLiquidityButton";
import FeeTierSelector from "@/components/ui/FeeTierSelector";
import PriceRangeSelector from "@/components/ui/PriceRangeSelector";
import CreatePoolWarning from "@/components/ui/CreatePoolWarning";
import { TokenPairDisplay } from "@/components/ui/LockedTokenDisplay";
import { useSwapTokenSelect } from "@/hooks/useSwaptokenSelect";
import { TAG_TOKEN_SELECT } from "@/types/Enum";
import { LiquidityPoolInfo, AddLiquidityParams } from "@/types/";
import { useInitToken } from "@/hooks/useInitToken";

const { Title, Text } = Typography;

const LiquidityAddPage: React.FC = () => {
  const [token0Amount, setToken0Amount] = useState("");
  const [token1Amount, setToken1Amount] = useState("");
  const [poolInfo, setPoolInfo] = useState<LiquidityPoolInfo | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [feeTier, setFeeTier] = useState<number>(3000); // 默认0.3%
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [isFullRange, setIsFullRange] = useState(true);
  const [isCreatingNewPool, setIsCreatingNewPool] = useState(false);
  const [initialPrice, setInitialPrice] = useState<string>("");
  const [tokensLocked, setTokensLocked] = useState(false); // 新增代币锁定状态

  const tokens = useSwapTokenSelect((state) => state.tokens);
  const token0 = tokens[0];
  const token1 = tokens[1];

  console.log(
    "LiquidityAddPage - tokens:",
    tokens,
    "token0:",
    token0,
    "token1:",
    token1
  );

  const initToken = useInitToken();

  // 步骤管理
  useEffect(() => {
    if (token0 && token1) {
      // 选择完两个代币后进入费用等级选择，并锁定代币
      if (currentStep === 0) {
        setCurrentStep(1);
        setTokensLocked(true); // 锁定代币选择
      }
      // 初始化默认初始价格,实际项目需要获取价格
      setInitialPrice("1");

      // 模拟检查是否存在流动性池
      // 这里可以调用API检查是否存在对应的池子
      // 使用固定的初始值避免hydration问题，客户端会更新
      setIsCreatingNewPool(false);
    } else {
      setCurrentStep(0);
      setTokensLocked(false); // 重置时解锁代币选择
    }
  }, [token0, token1, currentStep]);

  // 客户端检查是否存在流动性池（避免hydration问题）
  useEffect(() => {
    if (token0 && token1 && currentStep === 1) {
      // TODO: 这里应该调用API检查是否存在对应的池子
      // 暂时使用固定值，实际应该根据token0、token1和feeTier查询链上数据
      const checkPoolExists = async () => {
        // 模拟API调用
        await new Promise((resolve) => setTimeout(resolve, 100));
        // 默认假设池子不存在，需要创建新池
        setIsCreatingNewPool(true);
      };
      checkPoolExists();
    }
  }, [token0, token1, currentStep]);

  // 处理费用等级选择
  const handleFeeTierSelect = useCallback((selectedFeeTier: number) => {
    setFeeTier(selectedFeeTier);
    // 不再自动跳转，等待用户点击下一步按钮
  }, []);

  // 处理费用等级选择后的下一步
  const handleFeeTierNextStep = useCallback(() => {
    if (isCreatingNewPool) {
      setCurrentStep(2); // 进入创建池步骤
    } else {
      setCurrentStep(3); // 直接进入价格区间设定
    }
  }, [isCreatingNewPool]);

  // 处理初始价格设置
  const handleInitialPriceSet = useCallback((price: string) => {
    setInitialPrice(price);
    setCurrentStep(3); // 进入价格区间设定
  }, []);

  // 处理价格区间变化
  const handleRangeChange = useCallback(
    (minPrice: string, maxPrice: string) => {
      setMinPrice(minPrice);
      setMaxPrice(maxPrice);
    },
    []
  );

  // 处理全范围切换
  const handleToggleFullRange = useCallback((isFull: boolean) => {
    setIsFullRange(isFull);
  }, []);

  // 模拟计算池子信息
  const calculatePoolInfo = useCallback(
    (amount0: string, amount1: string) => {
      if (
        !amount0 ||
        !amount1 ||
        parseFloat(amount0) === 0 ||
        parseFloat(amount1) === 0
      ) {
        setPoolInfo(null);
        return;
      }

      // 模拟池子计算逻辑
      const totalPoolValue = 100000; // 假设池子总价值
      const userValue = parseFloat(amount0) * 2000 + parseFloat(amount1) * 1; // 假设价格
      const sharePercentage = (userValue / totalPoolValue) * 100;

      setPoolInfo({
        token0Amount: amount0,
        token1Amount: amount1,
        sharePercentage: Math.min(sharePercentage, 100), // 最大100%
        apr: 25, // 固定APR值避免hydration问题
        feeTier,
        minLiquidity: "1000",
      });
    },
    [feeTier]
  );

  // 处理输入变化
  const handleAmountChange = useCallback(
    (amount0: string, amount1: string) => {
      setToken0Amount(amount0);
      setToken1Amount(amount1);
      calculatePoolInfo(amount0, amount1);
    },
    [calculatePoolInfo]
  );

  // 处理添加流动性
  const handleAddLiquidity = useCallback(
    async (params: AddLiquidityParams): Promise<string> => {
      // 这里应该调用智能合约添加流动性
      // 目前返回模拟的交易哈希
      console.log("Adding liquidity with params:", params);

      // 模拟网络请求延迟
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 返回固定的模拟交易哈希避免hydration问题
      return "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    },
    []
  );

  // 处理交易完成
  const handleTransactionComplete = useCallback((txHash: string) => {
    console.log("Transaction completed:", txHash);
    // 可以在这里添加交易完成后的逻辑，如刷新状态等
  }, []);

  // 重置整个流程
  const handleReset = useCallback(() => {
    // 重置所有状态
    setToken0Amount("");
    setToken1Amount("");
    setPoolInfo(null);
    setShowSettings(false);
    setCurrentStep(0);
    setFeeTier(3000);
    setMinPrice("");
    setMaxPrice("");
    setIsFullRange(true);
    setIsCreatingNewPool(false);
    setInitialPrice("");
    setTokensLocked(false);
    initToken();
  }, []);

  // 交换代币位置
  const handleSwapTokens = useCallback(() => {
    const swapTokenSelect = useSwapTokenSelect.getState();

    if (token0 && token1) {
      // 交换代币
      swapTokenSelect.setSelectedToken(0, token1);
      swapTokenSelect.setSelectedToken(1, token0);

      // 交换输入数量
      const tempAmount = token0Amount;
      setToken0Amount(token1Amount);
      setToken1Amount(tempAmount);
    }
  }, [token0, token1, token0Amount, token1Amount]);

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        // 选择代币步骤
        return null;

      case 1:
        // 费用等级选择步骤
        return (
          <FeeTierSelector
            value={feeTier}
            onChange={handleFeeTierSelect}
            onNextStep={handleFeeTierNextStep}
          />
        );

      case 2:
        // 创建新池步骤（如果没有现有池）
        if (isCreatingNewPool) {
          return (
            <CreatePoolWarning
              onInitialPriceSet={handleInitialPriceSet}
              initialPrice={initialPrice}
            />
          );
        }
        // 如果有现有池，跳过创建池步骤，直接进入价格区间
        return (
          <PriceRangeSelector
            minPrice={minPrice}
            maxPrice={maxPrice}
            currentPrice={initialPrice}
            onRangeChange={handleRangeChange}
            onToggleFullRange={handleToggleFullRange}
            onNextStep={() => setCurrentStep(4)}
          />
        );

      case 3:
        // 价格区间设定步骤
        return (
          <PriceRangeSelector
            minPrice={minPrice}
            maxPrice={maxPrice}
            currentPrice={initialPrice}
            onRangeChange={handleRangeChange}
            onToggleFullRange={handleToggleFullRange}
            onNextStep={() => setCurrentStep(4)}
          />
        );

      case 4:
        // 存入代币步骤
        return (
          <Card className="!rounded-2xl !shadow-sm">
            <div className="space-y-6">
              {/* 代币显示（可交换） */}
              <div className="bg-gray-50 p-4 rounded-xl">
                <Text className="text-gray-500 text-sm block mb-3">
                  当前代币对
                </Text>
                <TokenPairDisplay
                  showSwapButton={true}
                  onSwap={handleSwapTokens}
                />
              </div>

              {/* 流动性输入组件 */}
              <LiquidityInput
                onAmountChange={handleAmountChange}
                onSwapTokens={handleSwapTokens}
                allowTokenSwap={true}
              />

              {/* 流动性详情 */}
              <LiquidityDetails
                token0Amount={token0Amount}
                token1Amount={token1Amount}
                poolInfo={poolInfo}
                showSettings={showSettings}
              />

              {/* 添加流动性按钮 */}
              <AddLiquidityButton
                token0Amount={token0Amount}
                token1Amount={token1Amount}
                poolInfo={poolInfo}
                onAddLiquidity={handleAddLiquidity}
                onTransactionComplete={handleTransactionComplete}
              />
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  const tabItems = [
    {
      key: "input",
      label: "添加流动性",
      children: (
        <div className="space-y-6">
          {/* 步骤指示器和重置按钮 */}
          <div className="flex justify-between items-center">
            <Steps
              current={currentStep}
              size="small"
              className="flex-1"
              items={[
                { title: "选择代币" },
                { title: "费用等级" },
                ...(isCreatingNewPool ? [{ title: "创建池" }] : []),
                { title: "价格区间" },
                { title: "存入代币" },
              ]}
            />
            {tokensLocked && (
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={handleReset}
                className="!text-gray-500 hover:!text-blue-500"
                title="重置流程"
              >
                重置
              </Button>
            )}
          </div>

          {/* 代币对信息显示（非选择代币步骤） */}
          {tokensLocked && currentStep !== 0 && currentStep !== 4 && (
            <div className="bg-gray-50 p-4 rounded-xl">
              <Text className="text-gray-500 text-sm block mb-3">
                当前代币对
              </Text>
              <TokenPairDisplay showSwapButton={false} className="opacity-75" />
            </div>
          )}

          {/* 渲染当前步骤内容 */}
          {renderStepContent()}
        </div>
      ),
    },
    {
      key: "pool",
      label: "池子详情",
      disabled: !poolInfo,
      children: poolInfo && (
        <Card className="!rounded-2xl !shadow-sm">
          <div className="space-y-4">
            <Title level={4}>池子信息</Title>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl">
                <Text className="text-gray-500 text-sm">总锁仓量</Text>
                <div className="mt-1">
                  <Text className="font-semibold text-lg">$100,000</Text>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl">
                <Text className="text-gray-500 text-sm">24小时交易量</Text>
                <div className="mt-1">
                  <Text className="font-semibold text-lg">$25,000</Text>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl">
                <Text className="text-gray-500 text-sm">您的份额</Text>
                <div className="mt-1">
                  <Text className="font-semibold text-lg">
                    {poolInfo.sharePercentage.toFixed(2)}%
                  </Text>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl">
                <Text className="text-gray-500 text-sm">预估年化收益</Text>
                <div className="mt-1">
                  <Text className="font-semibold text-lg text-green-600">
                    {poolInfo.apr?.toFixed(2)}%
                  </Text>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl">
              <div className="flex items-start gap-2">
                <InfoCircleOutlined className="text-blue-500 mt-0.5" />
                <Text className="text-blue-700 text-sm">
                  流动性挖矿收益来源于交易手续费和可能的代币奖励。收益会根据池子的交易量和您的份额动态变化。
                </Text>
              </div>
            </div>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <main className="text-center">
      <Title level={1}>你想添加的流动性NFT新仓位</Title>

      <Divider />

      <div className="w-3/4 max-w-2xl text-left m-auto">
        {/* 代币选择区域 */}
        <Card className="!rounded-2xl !shadow-sm !mb-6">
          <div className="flex justify-between items-center mb-4">
            <Title level={4} className="!mb-0">
              选择配对
            </Title>
            <div className="flex items-center gap-2">
              <Text className="text-gray-500 text-sm">高级设置</Text>
              <Switch
                size="small"
                checked={showSettings}
                onChange={setShowSettings}
              />
            </div>
          </div>

          <Text className="text-gray-600 block mb-4">
            选择你想要提供流动性的代币。你可以在所有支持的网络上选择代币。
          </Text>

          {!tokensLocked ? (
            <div className="flex items-center gap-4">
              <TokenSelectButton className="flex-1" position={0} />
              <div className="text-gray-400 text-2xl">+</div>
              <TokenSelectButton className="flex-1" position={1} />
            </div>
          ) : (
            <div className="space-y-3">
              <TokenPairDisplay showSwapButton={false} className="opacity-75" />
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <span>代币已锁定</span>
                <Button
                  type="text"
                  icon={<ReloadOutlined />}
                  onClick={handleReset}
                  className="!text-blue-500 !p-0 !h-auto !text-xs"
                >
                  重置
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* 主要内容区域 */}
        <Tabs defaultActiveKey="input" items={tabItems} className="!mb-6" />
      </div>
    </main>
  );
};
export default LiquidityAddPage;
