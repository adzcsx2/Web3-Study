import React from "react";
import { Typography, Card, Space, Divider, Switch } from "antd";
import { InfoCircleOutlined, SettingOutlined } from "@ant-design/icons";
import { SwapToken, LiquidityPoolInfo } from "@/types/";
import { useSwapTokenSelect } from "@/hooks/useSwapTokenSelect";

const { Text, Title } = Typography;

interface LiquidityDetailsProps {
  token0Amount: string;
  token1Amount: string;
  poolInfo: LiquidityPoolInfo | null;
  showSettings?: boolean;
  onSettingsChange?: (settings: LiquiditySettings) => void;
  className?: string;
}

interface LiquiditySettings {
  slippageTolerance: number;
  deadline: number;
  multiHop: boolean;
}

const LiquidityDetails: React.FC<LiquidityDetailsProps> = ({
  token0Amount,
  token1Amount,
  poolInfo,
  showSettings = false,
  onSettingsChange,
  className = "",
}) => {
  const [settings, setSettings] = React.useState<LiquiditySettings>({
    slippageTolerance: 0.5,
    deadline: 20,
    multiHop: false,
  });

  // 分别订阅两个 token，避免不必要的重新渲染
  const token0 = useSwapTokenSelect((state) => state.tokens[0]);
  const token1 = useSwapTokenSelect((state) => state.tokens[1]);

  const handleSettingsChange = (newSettings: Partial<LiquiditySettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    if (onSettingsChange) {
      onSettingsChange(updatedSettings);
    }
  };

  const formatNumber = (num: number | string, decimals: number = 4): string => {
    const value = typeof num === "string" ? parseFloat(num) : num;
    if (isNaN(value)) return "0";
    return value.toFixed(decimals);
  };

  const hasValidAmounts =
    token0Amount &&
    token1Amount &&
    parseFloat(token0Amount) > 0 &&
    parseFloat(token1Amount) > 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 池子信息卡片 */}
      {hasValidAmounts && (
        <Card className="!border-gray-200 !rounded-2xl">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Text className="text-gray-500">池子份额</Text>
              <Text className="font-semibold">
                {poolInfo ? formatNumber(poolInfo.sharePercentage, 2) : "0.00"}%
              </Text>
            </div>

            <div className="flex justify-between items-center">
              <Text className="text-gray-500">Token1 数量</Text>
              <Text className="font-semibold">
                {token0Amount} {token0?.tokenSymbol || ""}
              </Text>
            </div>

            <div className="flex justify-between items-center">
              <Text className="text-gray-500">Token2 数量</Text>
              <Text className="font-semibold">
                {token1Amount} {token1?.tokenSymbol || ""}
              </Text>
            </div>

            <Divider className="!my-3" />

            <div className="flex justify-between items-center">
              <Text className="text-gray-500">费率等级</Text>
              <Text className="font-semibold">
                {poolInfo?.feeTier ? `${poolInfo.feeTier / 10000}%` : "0.3%"}
              </Text>
            </div>

            {poolInfo?.apr && (
              <div className="flex justify-between items-center">
                <Text className="text-gray-500">预估 APR</Text>
                <Text className="font-semibold text-green-600">
                  {formatNumber(poolInfo.apr, 2)}%
                </Text>
              </div>
            )}

            <div className="flex justify-between items-center">
              <Text className="text-gray-500">最小流动性</Text>
              <Text className="font-semibold">
                {poolInfo?.minLiquidity || "1,000"}
              </Text>
            </div>
          </div>
        </Card>
      )}

      {/* 设置区域 */}
      {showSettings && (
        <Card
          size="small"
          className="!border-gray-100 !bg-gray-50 !rounded-2xl"
          title={
            <Space>
              <SettingOutlined />
              <Text className="text-gray-700">高级设置</Text>
            </Space>
          }
        >
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <Text className="text-gray-600 text-sm">滑点容忍度</Text>
                <Text className="text-sm font-medium">
                  {settings.slippageTolerance}%
                </Text>
              </div>
              <div className="flex gap-2">
                {[0.1, 0.5, 1.0].map((value) => (
                  <button
                    key={value}
                    onClick={() =>
                      handleSettingsChange({ slippageTolerance: value })
                    }
                    className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                      settings.slippageTolerance === value
                        ? "border-blue-500 bg-blue-50 text-blue-600"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {value}%
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Text className="text-gray-600 text-sm">交易期限 (分钟)</Text>
                <Text className="text-sm font-medium">{settings.deadline}</Text>
              </div>
              <div className="flex gap-2">
                {[10, 20, 30].map((value) => (
                  <button
                    key={value}
                    onClick={() => handleSettingsChange({ deadline: value })}
                    className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                      settings.deadline === value
                        ? "border-blue-500 bg-blue-50 text-blue-600"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Text className="text-gray-600 text-sm">多跳路由</Text>
              <Switch
                size="small"
                checked={settings.multiHop}
                onChange={(checked) =>
                  handleSettingsChange({ multiHop: checked })
                }
              />
            </div>
          </div>
        </Card>
      )}

      {/* 提示信息 */}
      {hasValidAmounts && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl">
          <InfoCircleOutlined className="text-blue-500 mt-0.5" />
          <div className="flex-1">
            <Text className="text-blue-700 text-sm leading-relaxed">
              添加流动性将获得代表您池子份额的 NFT。移除流动性时需要销毁此 NFT。
            </Text>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiquidityDetails;
