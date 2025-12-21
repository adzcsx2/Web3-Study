import React, { useCallback } from "react";
import { Button } from "antd";
import { ArrowDownOutlined } from "@ant-design/icons";
import { useSwapTokenSelect } from "@/hooks/useSwaptokenSelect";
/**
 * 交换按钮组件 将买卖交换
 */

const ExchangeSwapButton: React.FC<{ className?: string }> = ({
  className,
}) => {
  const swapTokens = useSwapTokenSelect((state) => state.swapTokens);

  const onClick = useCallback(() => {
    console.log("Swap button clicked");
    swapTokens();
  }, [swapTokens]);
  return (
    <Button
      onClick={onClick}
      className={`!w-[2.5rem] !h-[2.5rem] !border-4 !bg-bg-gray !border-white ${className}`}
      icon={<ArrowDownOutlined />}
    />
  );
};
export default ExchangeSwapButton;
