import React, { useState, useCallback } from "react";
import { Typography, Card, Input, Button, Alert } from "antd";
import {
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { SwapToken } from "@/types/";
import { useSwapTokenSelect } from "@/hooks/useSwaptokenSelect";

const { Title, Text } = Typography;

interface CreatePoolWarningProps {
  onInitialPriceSet: (price: string) => void;
  initialPrice?: string;
  className?: string;
}

const CreatePoolWarning: React.FC<CreatePoolWarningProps> = ({
  onInitialPriceSet,
  initialPrice,
  className = "",
}) => {
  const [price, setPrice] = useState(initialPrice);

  const tokens = useSwapTokenSelect((state) => state.tokens);
  const token0 = tokens[0];
  const token1 = tokens[1];

  const handlePriceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
        setPrice(value);
      }
    },
    []
  );

  const handleSetPrice = useCallback(() => {
    if (price && parseFloat(price) > 0) {
      onInitialPriceSet(price);
    }
  }, [price, onInitialPriceSet]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 警告信息 */}
      <Alert
        message="正在创建资金池"
        description={
          <div className="space-y-3 mt-2">
            <Text className="block">
              您的选择将创建一个新的流动性池，这可能会导致初始流动性降低和波动性增加。
              考虑添加到现有池中以最大限度地降低这些风险。
            </Text>
          </div>
        }
        type="warning"
        showIcon
        className="!rounded-2xl"
        icon={<ExclamationCircleOutlined />}
      />

      {/* 初始价格设置 */}
      <Card className="!rounded-2xl !shadow-sm !border-orange-200">
        <div className="space-y-4">
          <Title level={4} className="!mb-0 flex items-center gap-2">
            <span>设置初始价格</span>
            <InfoCircleOutlined className="text-orange-500 text-lg" />
          </Title>

          <Text className="text-gray-600 block">
            创建新资金池时，必须为两个代币设置初始汇率。此汇率将反映初始市场价。
          </Text>

          <div className="bg-orange-50 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <Text className="text-gray-700 font-medium">初始汇率</Text>
              <Text className="text-sm text-gray-500">
                1 {token0?.tokenSymbol} = ? {token1?.tokenSymbol}
              </Text>
            </div>

            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <Input
                  value={price}
                  onChange={handlePriceChange}
                  placeholder="0.00"
                  className="!rounded-xl"
                  size="large"
                  suffix={token1?.tokenSymbol}
                />
              </div>
              <Button
                type="primary"
                size="large"
                onClick={handleSetPrice}
                className="!rounded-xl !bg-orange-500 !border-orange-500 hover:!bg-orange-600"
                disabled={!price || parseFloat(price) <= 0}
              >
                确认价格
              </Button>
            </div>
          </div>

          {/* 市场参考价格 */}
          <div className="border border-gray-200 rounded-xl p-4">
            <Text className="text-gray-500 text-sm block mb-2">
              市场参考价格
            </Text>
            <div className="flex items-center justify-between">
              <Text className="font-semibold">$2000.00</Text>
              <Text className="text-gray-500 text-sm">来自CoinGecko</Text>
            </div>
            <Button
              type="link"
              size="small"
              onClick={() => setPrice("2001.00")}
              className="!text-blue-500 !p-0 mt-2"
            >
              使用参考价格
            </Button>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl">
            <div className="flex items-start gap-2">
              <InfoCircleOutlined className="text-blue-500 mt-0.5" />
              <Text className="text-blue-700 text-sm">
                初始价格设置后将无法更改。请确保设置的汇率准确反映当前市场价，否则可能出现套利机会。
              </Text>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CreatePoolWarning;
