export type SwapType = "buy" | "sell";

export type SwapToken = {
  tokenSymbol: string;
  tokenAddress: string;
  tokenDecimals: number;
  tokenLogoURI: string;
  isBuy: boolean;
  swapType: SwapType;
};
