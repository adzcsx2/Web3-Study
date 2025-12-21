type LiquidityPoolInfo = {
  token0Amount: string;
  token1Amount: string;
  sharePercentage: number;
  apr?: number;
  feeTier?: number;
  minLiquidity?: string;
};

type LiquidityState = {
  token0Input: string;
  token1Input: string;
  poolInfo: LiquidityPoolInfo | null;
  isLoading: boolean;
  error: string | null;
};

type AddLiquidityParams = {
  token0: SwapToken;
  token1: SwapToken;
  amount0: string;
  amount1: string;
  slippageTolerance?: number;
  deadline?: number;
};

export type { LiquidityPoolInfo, LiquidityState, AddLiquidityParams };