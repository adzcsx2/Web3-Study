import React, { useCallback } from "react";
import { Layout, Menu, Typography, InputNumber, Input } from "antd";
import TokenSelectButton from "./TokenSelectButton";
import { SwapType } from "@/types/";
import TokenNotSelectButton from "./TokenNotSelectButton";

const ExchangeCoinInput: React.FC<{ swap: SwapType }> = ({ swap }) => {
  const onChange = useCallback((value: string) => {
    console.log("Input changed:", value);
  }, []);

  return (
    <div className="m-auto border border-gray-200 rounded-2xl w-120 h-36 p-4">
      <Typography.Text
        className="text-lg! block! "
        style={{ color: "#666666" }}
      >
        {swap === "buy" ? "购买" : "出售"}
      </Typography.Text>
      <div className="flex items-center">
        {/* 输入数量 */}
        <Input
          className="text-3xl! flex-1 h-15! block! border-none! p-0! "
          min={0}
          placeholder="0"
          onChange={(e) => onChange(e.target.value)}
          style={{
            border: "none",
            boxShadow: "none",
          }}
        />
        {/* 选择代币 */}
        {swap === "buy" ? (
          <TokenNotSelectButton></TokenNotSelectButton>
        ) : (
          <TokenSelectButton></TokenSelectButton>
        )}
      </div>
      <Typography.Text className="block! ml-auto! w-fit!  text-lg!   text-gray-500! text-[0.8rem]! mr-2">
        123123 ETH
      </Typography.Text>
    </div>
  );
};

export default ExchangeCoinInput;
