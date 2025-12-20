import React, { useCallback } from "react";
import { Button } from "antd";
import { ArrowDownOutlined } from "@ant-design/icons";
/**
 * 交换按钮组件 将买卖交换
 */

const ExchangeSwapButton: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <Button
      className={`!w-[2.5rem] !h-[2.5rem] !border-4 !bg-bg-gray !border-white ${className}`}
      icon={<ArrowDownOutlined />}
    />
  );
};
export default ExchangeSwapButton;
