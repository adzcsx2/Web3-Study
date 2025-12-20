import React from "react";
import { List, Avatar } from "antd";
import { SwapToken } from "@/types/";
import { useSwapTokenSelect } from "@/hooks/swaptokenSelect";

interface TokenListProps {
  title: string;
  tokens: SwapToken[];
  emptyText?: string;
}

/**
 * 代币列表组件，用于显示搜索结果或缓存的代币
 */
const TokenList: React.FC<TokenListProps> = ({ title, tokens, emptyText }) => {
  const handleTokenSelect = useSwapTokenSelect(
    (state) => state.handleTokenSelect
  );
  const currentTag = useSwapTokenSelect((state) => state.currentTag);

  if (tokens.length === 0 && emptyText) {
    return <div className="text-center text-gray-500 py-4">{emptyText}</div>;
  }

  return (
    <div>
      <div className="text-sm text-gray-500 mb-2">{title}</div>
      <List
        dataSource={tokens}
        renderItem={(token) => (
          <List.Item
            className="cursor-pointer hover:bg-gray-50 rounded-lg px-2"
            onClick={() => {
              if (currentTag) {
                handleTokenSelect(currentTag, token);
              } else {
                console.warn("No currentTag set for token selection");
                // 如果没有 tag，使用默认值
                handleTokenSelect("default", token);
              }
            }}
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
        )}
      />
    </div>
  );
};

export default TokenList;
