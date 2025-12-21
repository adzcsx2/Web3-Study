import React, { useCallback, useEffect, useState } from "react";
import { Typography, Input, Button, Space } from "antd";
import { PlusOutlined, SwapOutlined } from "@ant-design/icons";
import TokenSelectButton from "./button/TokenSelectButton";
import { SwapToken, LiquidityState } from "@/types/";
import { useSwapTokenSelect } from "@/hooks/swaptokenSelect";

interface LiquidityTokenInputProps {
  tag: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
  onMax?: () => void;
  showMax?: boolean;
  className?: string;
}

const LiquidityTokenInput: React.FC<LiquidityTokenInputProps> = ({
  tag,
  title,
  value,
  onChange,
  onMax,
  showMax = false,
  className = "",
}) => {
  const token = useSwapTokenSelect((state) => state.getToken(tag));

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // 只允许输入数字和小数点
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
        onChange(value);
      }
    },
    [onChange]
  );

  return (
    <div
      className={`border border-gray-200 rounded-2xl w-full p-4 bg-white ${className}`}
    >
      <div className="flex justify-between items-center mb-3">
        <Typography.Text className="text-gray-500 text-sm">
          {title}
        </Typography.Text>
        {showMax && token && (
          <Button
            type="link"
            size="small"
            onClick={onMax}
            className="!text-blue-500 !p-0 !h-auto !text-xs"
          >
            MAX
          </Button>
        )}
      </div>

      <div className="flex items-center">
        <Input
          value={value}
          onChange={handleInputChange}
          placeholder="0"
          className="!text-2xl !font-semibold !border-none !shadow-none !bg-transparent !p-0 flex-1"
          style={{ fontSize: "24px", fontWeight: 600 }}
        />
        <TokenSelectButton tag={tag} className="!ml-4" />
      </div>

      {token && (
        <Typography.Text className="!block !text-right !text-gray-400 !text-sm mt-2">
          余额: {parseFloat(token.balance).toFixed(6)} {token.tokenSymbol}
        </Typography.Text>
      )}
    </div>
  );
};

interface LiquidityInputProps {
  onAmountChange?: (token0Amount: string, token1Amount: string) => void;
  onSwapTokens?: () => void;
  allowTokenSwap?: boolean;
  className?: string;
}

const LiquidityInput: React.FC<LiquidityInputProps> = ({
  onAmountChange,
  onSwapTokens,
  allowTokenSwap = false,
  className = "",
}) => {
  const [token0Amount, setToken0Amount] = useState("");
  const [token1Amount, setToken1Amount] = useState("");

  const token0 = useSwapTokenSelect((state) => state.getToken("1"));
  const token1 = useSwapTokenSelect((state) => state.getToken("2"));

  const handleToken0Change = useCallback((value: string) => {
    setToken0Amount(value);
    // 这里可以添加价格计算逻辑，自动计算另一个代币的数量
    if (onAmountChange) {
      onAmountChange(value, token1Amount);
    }
  }, [onAmountChange, token1Amount]);

  const handleToken1Change = useCallback((value: string) => {
    setToken1Amount(value);
    if (onAmountChange) {
      onAmountChange(token0Amount, value);
    }
  }, [onAmountChange, token0Amount]);

  const handleMax0 = useCallback(() => {
    if (token0 && token0.balance) {
      setToken0Amount(token0.balance);
      if (onAmountChange) {
        onAmountChange(token0.balance, token1Amount);
      }
    }
  }, [token0, onAmountChange, token1Amount]);

  const handleMax1 = useCallback(() => {
    if (token1 && token1.balance) {
      setToken1Amount(token1.balance);
      if (onAmountChange) {
        onAmountChange(token0Amount, token1.balance);
      }
    }
  }, [token1, onAmountChange, token0Amount]);

  return (
    <div className={`space-y-4 ${className}`}>
      <LiquidityTokenInput
        tag="1"
        title="输入"
        value={token0Amount}
        onChange={handleToken0Change}
        onMax={handleMax0}
        showMax={true}
      />

      <div className="flex justify-center items-center">
        {allowTokenSwap ? (
          <Button
            type="text"
            icon={<SwapOutlined />}
            onClick={onSwapTokens}
            className="!border-2 !border-gray-200 !rounded-full !w-10 !h-10 !flex !items-center !justify-center hover:!border-blue-300 hover:!text-blue-500"
            title="交换代币位置"
          />
        ) : (
          <Button
            type="text"
            icon={<SwapOutlined />}
            className="!border-2 !border-gray-200 !rounded-full !w-10 !h-10 !flex !items-center !justify-center"
            disabled
          />
        )}
      </div>

      <LiquidityTokenInput
        tag="2"
        title="输入 (预估)"
        value={token1Amount}
        onChange={handleToken1Change}
        onMax={handleMax1}
        showMax={true}
      />
    </div>
  );
};

export default LiquidityInput;