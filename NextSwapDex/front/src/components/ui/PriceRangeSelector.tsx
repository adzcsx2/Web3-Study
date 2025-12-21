import React, { useState, useCallback } from "react";
import { Typography, Card, Switch, Input, Button, Slider } from "antd";
import { SwapOutlined, SettingOutlined } from "@ant-design/icons";
import { SwapToken } from "@/types/";
import { useSwapTokenSelect } from "@/hooks/swaptokenSelect";

const { Title, Text } = Typography;

interface PriceRangeSelectorProps {
  minPrice?: string;
  maxPrice?: string;
  currentPrice?: string;
  onRangeChange: (minPrice: string, maxPrice: string) => void;
  onToggleFullRange: (isFullRange: boolean) => void;
  onNextStep?: () => void;
  className?: string;
}

interface PriceRange {
  minPrice: string;
  maxPrice: string;
  currentPrice: string;
  isFullRange: boolean;
}

const PriceRangeSelector: React.FC<PriceRangeSelectorProps> = ({
  minPrice,
  maxPrice,
  currentPrice = "2000.00",
  onRangeChange,
  onToggleFullRange,
  onNextStep,
  className = "",
}) => {
  const [isFullRange, setIsFullRange] = useState(true);
  const [range, setRange] = useState<PriceRange>({
    minPrice: minPrice || "0.00",
    maxPrice: maxPrice || "1000000.00",
    currentPrice,
    isFullRange: true,
  });

  const token0 = useSwapTokenSelect((state) => state.getToken("1"));
  const token1 = useSwapTokenSelect((state) => state.getToken("2"));

  const handleToggleFullRange = useCallback((checked: boolean) => {
    setIsFullRange(checked);
    setRange(prev => ({ ...prev, isFullRange: checked }));
    onToggleFullRange(checked);

    if (checked) {
      // 全范围
      onRangeChange("0.00", "1000000.00");
    }
  }, [onToggleFullRange]);

  const handleMinPriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setRange(prev => ({ ...prev, minPrice: value }));
      onRangeChange(value, range.maxPrice);
    }
  }, [onRangeChange, range.maxPrice]);

  const handleMaxPriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setRange(prev => ({ ...prev, maxPrice: value }));
      onRangeChange(range.minPrice, value);
    }
  }, [onRangeChange, range.minPrice]);

  const handleSetCurrentPrice = useCallback(() => {
    setRange(prev => ({
      ...prev,
      minPrice: currentPrice,
      maxPrice: currentPrice,
    }));
    onRangeChange(currentPrice, currentPrice);
  }, [currentPrice, onRangeChange]);

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (isNaN(num)) return "0.00";
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  return (
    <Card className={`!rounded-2xl !shadow-sm ${className}`}>
      <div className="space-y-6">
        {/* 标题 */}
        <div className="flex justify-between items-center">
          <Title level={4} className="!mb-0">设定价格区间</Title>
          <div className="flex items-center gap-2">
            <Text className="text-gray-500 text-sm">全范围</Text>
            <Switch
              size="small"
              checked={isFullRange}
              onChange={handleToggleFullRange}
            />
          </div>
        </div>

        {/* 当前价格显示 */}
        <div className="bg-gray-50 p-4 rounded-xl">
          <Text className="text-gray-500 text-sm">当前市场价格</Text>
          <div className="mt-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Text className="text-2xl font-bold">
                {formatPrice(currentPrice)}
              </Text>
              <Text className="text-gray-500">
                {token1?.tokenSymbol} per {token0?.tokenSymbol}
              </Text>
            </div>
            {!isFullRange && (
              <Button
                type="link"
                size="small"
                onClick={handleSetCurrentPrice}
                className="!text-blue-500 !p-0"
              >
                设定为此价格
              </Button>
            )}
          </div>
        </div>

        {!isFullRange && (
          <div className="space-y-4">
            {/* 价格范围输入 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text className="text-gray-500 text-sm block mb-2">最低价格</Text>
                <Input
                  value={range.minPrice}
                  onChange={handleMinPriceChange}
                  placeholder="0.00"
                  className="!rounded-xl"
                  prefix={
                    <Text className="text-gray-400 text-sm">
                      {token1?.symbol}
                    </Text>
                  }
                />
              </div>
              <div>
                <Text className="text-gray-500 text-sm block mb-2">最高价格</Text>
                <Input
                  value={range.maxPrice}
                  onChange={handleMaxPriceChange}
                  placeholder="0.00"
                  className="!rounded-xl"
                  prefix={
                    <Text className="text-gray-400 text-sm">
                      {token1?.symbol}
                    </Text>
                  }
                />
              </div>
            </div>

            {/* 价格范围预览 */}
            <div className="bg-blue-50 p-4 rounded-xl">
              <Text className="text-blue-700 text-sm">
                您的流动性将在价格区间内活跃。当价格超出此范围时，您的资金将转换为单一资产，不再赚取交易费用。
              </Text>
            </div>

            {/* 可视化价格范围 */}
            <div className="relative">
              <div className="h-2 bg-gray-200 rounded-full relative">
                <div
                  className="absolute h-full bg-blue-500 rounded-full"
                  style={{
                    left: "0%",
                    width: "100%",
                  }}
                />
              </div>
              <div className="mt-4 flex justify-between text-xs text-gray-500">
                <div className="text-left">
                  <Text>范围: {formatPrice(range.minPrice)}</Text>
                </div>
                <div className="text-center">
                  <Text strong>当前: {formatPrice(currentPrice)}</Text>
                </div>
                <div className="text-right">
                  <Text>范围: {formatPrice(range.maxPrice)}</Text>
                </div>
              </div>
            </div>
          </div>
        )}

        {isFullRange && (
          <div className="bg-green-50 p-4 rounded-xl">
            <div className="flex items-start gap-2">
              <SwapOutlined className="text-green-500 mt-0.5" />
              <div>
                <Text className="text-green-700 text-sm block mb-1">
                  全范围流动性
                </Text>
                <Text className="text-green-600 text-sm">
                  您的资金将在所有价格范围内活跃，在整个价格变动过程中持续赚取交易费用。
                </Text>
              </div>
            </div>
          </div>
        )}

        {/* 下一步按钮 */}
        {onNextStep && (
          <Button
            type="primary"
            size="large"
            onClick={onNextStep}
            className="!w-full !rounded-xl !bg-blue-500 !border-blue-500 hover:!bg-blue-600"
          >
            下一步
          </Button>
        )}
      </div>
    </Card>
  );
};

export default PriceRangeSelector;