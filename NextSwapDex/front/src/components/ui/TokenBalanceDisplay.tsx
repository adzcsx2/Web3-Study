import React from "react";
import { Typography } from "antd";
import { SwapToken } from "@/types/";

interface TokenBalanceDisplayProps {
  token: SwapToken | null;
  className?: string;
  prefix?: string;
}

const TokenBalanceDisplay: React.FC<TokenBalanceDisplayProps> = React.memo(
  ({ token, className = "", prefix = "余额:" }) => {
    if (!token) return null;

    return (
      <Typography.Text
        className={`!text-gray-400 !text-sm ${className}`}
        style={{ fontSize: "14px" }}
      >
        {prefix} {parseFloat(token.balance).toFixed(6)} {token.tokenSymbol}
      </Typography.Text>
    );
  }
);

TokenBalanceDisplay.displayName = "TokenBalanceDisplay";

export default TokenBalanceDisplay;