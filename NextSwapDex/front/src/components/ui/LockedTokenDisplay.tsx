import React from "react";
import { Typography, Avatar, Button } from "antd";
import { SwapOutlined } from "@ant-design/icons";
import { SwapToken } from "@/types/";
import { useSwapTokenSelect } from "@/hooks/swaptokenSelect";

const { Text } = Typography;

interface LockedTokenDisplayProps {
  tag: string;
  label: string;
  className?: string;
}

const LockedTokenDisplay: React.FC<LockedTokenDisplayProps> = ({
  tag,
  label,
  className = "",
}) => {
  const token = useSwapTokenSelect((state) => state.getToken(tag));

  return (
    <div className={`border border-gray-200 rounded-xl p-3 bg-gray-50 ${className}`}>
      <Text className="text-gray-500 text-xs block mb-2">{label}</Text>
      <div className="flex items-center gap-2">
        <Avatar
          src={token?.tokenLogoURI}
          size="small"
          className="!flex-shrink-0"
        >
          {token?.tokenSymbol?.[0]}
        </Avatar>
        <Text className="font-medium text-sm flex-1 text-ellipsis">
          {token?.tokenSymbol || "选择代币"}
        </Text>
      </div>
    </div>
  );
};

interface TokenPairDisplayProps {
  onSwap?: () => void;
  showSwapButton?: boolean;
  className?: string;
}

const TokenPairDisplay: React.FC<TokenPairDisplayProps> = ({
  onSwap,
  showSwapButton = false,
  className = "",
}) => {
  const handleSwap = () => {
    if (onSwap) {
      onSwap();
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LockedTokenDisplay tag="1" label="代币1" className="flex-1" />

      {showSwapButton ? (
        <Button
          type="text"
          icon={<SwapOutlined />}
          onClick={handleSwap}
          className="!border-gray-200 !rounded-full !w-8 !h-8 !flex !items-center !justify-center"
          title="交换代币位置"
        />
      ) : (
        <div className="text-gray-400 text-xl flex items-center justify-center w-8 h-8">
          +
        </div>
      )}

      <LockedTokenDisplay tag="2" label="代币2" className="flex-1" />
    </div>
  );
};

export { LockedTokenDisplay, TokenPairDisplay };