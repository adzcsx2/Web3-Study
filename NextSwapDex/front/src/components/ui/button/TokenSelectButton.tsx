import React, { useCallback, useMemo } from "react";
import { Typography, Button, Avatar } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { SwapToken } from "@/types/";
import { useSwapTokenSelect } from "@/hooks/useSwaptokenSelect";

// 内部按钮组件，使用 React.memo 优化
const TokenButtonContent = React.memo<{
  token: SwapToken | null;
  className?: string;
  onClick: () => void;
  isHasToken: boolean;
}>(({ token, className, onClick, isHasToken }) => {
  return (
    <Button
      onClick={onClick}
      className={`!inline-flex w-[7rem] ${
        isHasToken
          ? "!bg-white hover:!bg-white-hover !shadow-gray-200 !shadow-xs !items-center !border-gray-100 !border-1 !rounded-4xl !h-10 pl-4 !pr-4 !pt-2"
          : "btn"
      } ${className}`}
    >
      {isHasToken && token && (
        <div className="!inline-flex !items-center">
          <Avatar
            className=" !mb-1"
            src={token.tokenLogoURI ? token.tokenLogoURI : undefined}
            size="small"
          >
            {token.tokenSymbol?.[0]}
          </Avatar>
          <Typography.Text className=" !text-lg !block mb-1 !text-[#666666] !text-[1rem] !font-bold ml-1">
            {token.tokenSymbol}
          </Typography.Text>
        </div>
      )}
      {!isHasToken && <span>选择代币</span>}
      <DownOutlined
        className={`ml-auto ${isHasToken ? "!text-[#666666]" : "!text-white"} !text-[1rem]`}
      />
    </Button>
  );
});

TokenButtonContent.displayName = "TokenButtonContent";

const TokenSelectButton: React.FC<{
  position: 0 | 1;
  className?: string;
}> = ({ position, className }) => {
  // 使用选择器只订阅对应位置的 token，避免不必要的重新渲染
  const token = useSwapTokenSelect((state) => state.tokens[position]);
  const setCurrentPosition = useSwapTokenSelect((state) => state.setCurrentPosition);
  const setShowTokenSelect = useSwapTokenSelect((state) => state.setShowTokenSelect);

  const handleClick = useCallback(() => {
    setCurrentPosition(position);
    setShowTokenSelect(true);
  }, [setCurrentPosition, setShowTokenSelect, position]);

  const buttonContent = useMemo(
    () => (
      <TokenButtonContent
        token={token}
        className={className}
        onClick={handleClick}
        isHasToken={!!token}
      />
    ),
    [token, className, handleClick]
  );

  return buttonContent;
};

export default React.memo(TokenSelectButton);
