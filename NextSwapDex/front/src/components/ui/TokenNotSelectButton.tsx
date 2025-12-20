import React, { useCallback } from "react";
import { Typography, Button } from "antd";
import { DownOutlined } from "@ant-design/icons";

// 选择代币按钮(未选择代币状态)

const TokenNotSelectButton: React.FC = () => {
  return (
    <Button className="!inline-flex !bg-[#44BAEA] hover:!bg-[#3B9BD9] !shadow-gray-200 !shadow-xs !justify-center !items-center !border-gray-100 !border-1 !rounded-4xl !h-10 !pl-4 !pr-4 !pt-2">
      <Typography.Text className="!text-lg !block mb-1 !text-white !text-[1rem] !font-bold">
        选择代币
      </Typography.Text>
      <DownOutlined className="!text-white !text-[1rem]" />
    </Button>
  );
};

export default TokenNotSelectButton;
