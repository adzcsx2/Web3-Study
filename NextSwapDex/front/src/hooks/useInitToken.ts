import { useWalletClient } from "wagmi";
import { useSwapTokenSelect } from "@/hooks/useSwaptokenSelect";
import { useEffect, useCallback, useMemo } from "react";
import { SwapToken } from "@/types/";
import { TokenService } from "@/services/tokenService";
import { Constants } from "@/constants/constants";

/**
 * 初始化默认代币的 Hook
 * 在应用加载时调用，设置初始的交易对代币
 * 默认将第一个代币设置为 ETH，第二个代币为空
 * @returns initToken - 可手动调用的初始化函数
 */
export const useInitToken = () => {
  const walletClient = useWalletClient();
  const address = walletClient.data?.account.address;
  const chainId = walletClient.data?.chain.id;

  // 使用 Zustand 的 setState，这样会触发重新渲染
  const initToken = useCallback(async () => {
    // 确保 token 对象符合 SwapToken 类型
    const token: SwapToken = {
      chainId: chainId || 1,
      tokenSymbol: Constants.defaultEthToken.tokenSymbol,
      tokenAddress: Constants.defaultEthToken.tokenAddress,
      tokenDecimals: Constants.defaultEthToken.tokenDecimals,
      tokenLogoURI: Constants.defaultEthToken.tokenLogoURI,
      balance: Constants.defaultEthToken.balance,
    };

    if (address && chainId) {
      token.balance = await TokenService.getUserTokenBalance(
        token.tokenAddress,
        address,
        chainId
      );
    }

    console.log("initToken - 设置初始代币:", token);
    // 使用 setState 触发更新
    useSwapTokenSelect.setState({
      tokens: [token, null],
    });
  }, [address, chainId]);

  useEffect(() => {
    initToken();
  }, [initToken]);

  return initToken;
};
