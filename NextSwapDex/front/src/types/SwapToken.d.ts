type SwapType = "buy" | "sell";

type SwapToken = {
  chainId: number;
  tokenSymbol: string;
  tokenAddress: string;
  tokenDecimals: number;
  tokenLogoURI: string;
  balance: string;
};
