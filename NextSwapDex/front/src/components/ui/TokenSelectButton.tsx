import React, { useCallback } from "react";
import { Typography, Image, Button } from "antd";
import { DownOutlined } from "@ant-design/icons";

// 选择代币按钮(已选择代币状态)
const TokenSelectButton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <Button
      className={`!inline-flex !bg-white hover:!bg-white-hover !shadow-gray-200 !shadow-xs !justify-center !items-center !border-gray-100 !border-1 !rounded-4xl !h-10 pl-4 !pr-4 !pt-2 ${className}`}
    >
      <Image
        className="mb-1 "
        width={25}
        src="https://token-icons.s3.amazonaws.com/eth.png"
        preview={false}
      ></Image>
      <Typography.Text className="!text-lg !block mb-1 !text-[#666666] !text-[1rem] !font-bold ml-1">
        ETH
      </Typography.Text>
      <DownOutlined className="ml-1 !text-[#666666] !text-[1rem]" />
    </Button>
  );
};

export default TokenSelectButton;
