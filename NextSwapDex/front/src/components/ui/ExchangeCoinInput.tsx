import React, { useCallback, useEffect } from "react";
import { Layout, Menu, Typography, InputNumber, Input } from "antd";
import TokenSelectButton from "./button/TokenSelectButton";
import { SwapToken, SwapType } from "@/types/";
import { useState } from "react";
import { useSwapTokenSelect } from "@/hooks/useSwapTokenSelect";
/**
 * 交易的币种输入组件
 * @param param0
 * @returns
 */

const ExchangeCoinInput: React.FC<{
  swap: SwapType;
  position: 0 | 1;
  hasDefault?: boolean;
  className?: string;
}> = ({ swap, position, hasDefault, className }) => {
  // 使用选择器只订阅对应位置的 token，避免不必要的重新渲染
  const token = useSwapTokenSelect((state) => state.tokens[position]);

  const onChange = useCallback((value: string) => {
    console.log("Input changed:", value);
  }, []);

  return (
    <div
      className={`m-auto border border-gray-200 rounded-2xl w-120 h-36 p-4 ${className}`}
    >
      <Typography.Text className="!flex !text-lg " style={{ color: "#666666" }}>
        {swap === "buy" ? "购买" : "出售"}
      </Typography.Text>
      <div className="flex items-center">
        {/* 输入数量 */}
        <Input
          className="!text-3xl flex-1 !h-15 !block !border-none !p-0 !bg-transparent"
          min={0}
          placeholder="0"
          onChange={(e) => onChange(e.target.value)}
          style={{
            border: "none",
            boxShadow: "none",
          }}
        />
        {/* 选择代币 */}
        <TokenSelectButton position={position} />
      </div>
      <>
        {token ? (
          <Typography.Text className="!block !ml-auto !w-fit !text-lg !text-gray-500 !text-[0.8rem] mr-2">
            {`${parseFloat(token.balance).toFixed(6)} ${token.tokenSymbol}`}
          </Typography.Text>
        ) : null}
      </>
    </div>
  );
};

export default React.memo(ExchangeCoinInput);
