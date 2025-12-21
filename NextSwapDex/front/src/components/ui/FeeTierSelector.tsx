import React from "react";
import { Typography, Card, Radio, Space, Button } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface FeeTierOption {
  value: number;
  label: string;
  description: string;
  recommended?: boolean;
}

interface FeeTierSelectorProps {
  value?: number;
  onChange: (feeTier: number) => void;
  onNextStep?: () => void;
  className?: string;
}

const feeTiers: FeeTierOption[] = [
  {
    value: 500, // 0.05%
    label: "0.05%",
    description: "最适合稳定货币对。",
  },
  {
    value: 3000, // 0.3%
    label: "0.3%",
    description: "最适合大多数货币对。",
    recommended: true,
  },
  {
    value: 10000, // 1%
    label: "1%",
    description: "最适合外来货币对。",
  },
];

const FeeTierSelector: React.FC<FeeTierSelectorProps> = ({
  value,
  onChange,
  onNextStep,
  className = "",
}) => {
  return (
    <Card className={`!rounded-2xl !shadow-sm ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Title level={4} className="!mb-0">费用等级</Title>
          <InfoCircleOutlined className="text-gray-400" />
        </div>

        <Text className="text-gray-600 block">
          通过提供流动性赚取的金额。选择适合你风险承受能力和投资策略的金额。
        </Text>

        <Radio.Group
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full"
        >
          <Space direction="vertical" className="w-full" size="middle">
            {feeTiers.map((tier) => (
              <div
                key={tier.value}
                className={`relative border rounded-xl p-4 transition-all cursor-pointer hover:border-blue-300 ${
                  value === tier.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
                onClick={() => onChange(tier.value)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Radio value={tier.value} className="!mr-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Text strong className="text-lg">
                          {tier.label}
                        </Text>
                        {tier.recommended && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                            推荐
                          </span>
                        )}
                      </div>
                      <Text className="text-gray-500 text-sm">
                        {tier.description}
                      </Text>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Space>
        </Radio.Group>

        <div className="bg-blue-50 p-4 rounded-xl">
          <div className="flex items-start gap-2">
            <InfoCircleOutlined className="text-blue-500 mt-0.5" />
            <Text className="text-blue-700 text-sm">
              费用等级决定了交易者支付的手续费，也影响您的收益。较高费用等级在波动性较大的市场可能更合适。
            </Text>
          </div>
        </div>

        {/* 下一步按钮 */}
        {onNextStep && value && (
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

export default FeeTierSelector;