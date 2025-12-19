import React, { useCallback } from "react";
import { Typography, Image } from "antd";
import { DownOutlined } from "@ant-design/icons";

// 选择代币按钮(已选择代币状态)
const TokenSelectButton: React.FC = () => {
  return (
    <div className="inline-flex  shadow-gray-200 shadow-xs justify-center items-center border-gray-100 border-1 rounded-4xl  h-10! pl-4 pr-4 pt-1">
      <Image
        className="mb-1 "
        width={25}
        src="https://token-icons.s3.amazonaws.com/eth.png"
        preview={false}
      ></Image>
      <Typography.Text className="text-lg! block!  mb-1 text-[#666666]! text-[1rem]! font-bold! ml-3">
        ETH
      </Typography.Text>
      <DownOutlined className="ml-2 text-[#666666]! text-[1rem]" />
    </div>
  );
};

export default TokenSelectButton;
