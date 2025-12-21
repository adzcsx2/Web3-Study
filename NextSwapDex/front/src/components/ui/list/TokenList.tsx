import React, { useCallback, useMemo } from "react";
import { List, Avatar } from "antd";
import { SwapToken } from "@/types/";
import { useSwapTokenSelect } from "@/hooks/useSwaptokenSelect";
import { TokenService } from "@/services/tokenService";
import { useWalletClient } from "wagmi";

interface TokenListProps {
  title: string;
  tokens: SwapToken[];
  emptyText?: string;
}

// 代币项组件，使用 React.memo 优化
const TokenListItem = React.memo<{
  token: SwapToken;
  onSelect: (token: SwapToken) => void;
}>(({ token, onSelect }) => {
  const handleClick = useCallback(async () => {
    onSelect(token);
  }, [token, onSelect]);

  return (
    <List.Item
      className="cursor-pointer hover:bg-gray-50 rounded-lg px-2"
      onClick={handleClick}
    >
      <List.Item.Meta
        avatar={
          <Avatar src={token.tokenLogoURI} size="large">
            {token.tokenSymbol?.[0]}
          </Avatar>
        }
        title={token.tokenSymbol}
        description={`${token.tokenAddress.slice(0, 6)}...${token.tokenAddress.slice(-4)}`}
      />
    </List.Item>
  );
});

TokenListItem.displayName = "TokenListItem";

/**
 * 代币列表组件，用于显示搜索结果或缓存的代币
 */
const TokenList: React.FC<TokenListProps> = ({ title, tokens, emptyText }) => {
  const wallet = useWalletClient();
  const { handleTokenSelect } = useSwapTokenSelect();

  // 获取钱包信息的 memoized 值
  const walletInfo = useMemo(
    () => ({
      address: wallet.data?.account.address || "",
      chainId: wallet.data?.chain.id || 0,
    }),
    [wallet.data?.account.address, wallet.data?.chain.id]
  );

  // 过滤有效的代币
  const validTokens = useMemo(
    () =>
      tokens.filter((token) => token.tokenAddress && token.tokenAddress !== ""),
    [tokens]
  );

  // 处理代币选择的回调函数
  const handleTokenSelectWithBalance = useCallback(
    async (token: SwapToken) => {
      if (!walletInfo.address || !walletInfo.chainId) {
        console.warn("钱包信息不完整，跳过余额获取");
        handleTokenSelect(token);
        return;
      }

      try {
        const balance = await TokenService.getUserTokenBalance(
          token.tokenAddress,
          walletInfo.address,
          walletInfo.chainId
        );
        console.log("获取用户代币余额信息:", balance);

        // 创建新的代币对象，避免直接修改原对象
        const updatedToken = {
          ...token,
          balance: balance,
        };
        console.log("TokenList - 调用 handleTokenSelect, 代币:", updatedToken);
        handleTokenSelect(updatedToken);
      } catch (error) {
        console.error("获取代币余额失败:", error);
        // 即使获取余额失败，也选择代币
        handleTokenSelect(token);
      }
    },
    [walletInfo, handleTokenSelect]
  );

  if (validTokens.length === 0 && emptyText) {
    return <div className="text-center text-gray-500 py-4">{emptyText}</div>;
  }

  return (
    <div>
      <div className="text-sm text-gray-500 mb-2">{title}</div>
      <List
        dataSource={validTokens}
        renderItem={(token) => (
          <TokenListItem
            key={token.tokenAddress}
            token={token}
            onSelect={handleTokenSelectWithBalance}
          />
        )}
      />
    </div>
  );
};

export default React.memo(TokenList);
