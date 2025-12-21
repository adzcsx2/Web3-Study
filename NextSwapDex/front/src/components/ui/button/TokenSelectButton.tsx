import React, { useCallback, useEffect } from "react";
import { Typography, Image, Button, Avatar } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { SwapToken } from "@/types/";
import { useState } from "react";
import SelectTokenModal from "../modal/SelectTokenModal";
import { useSwapTokenSelect } from "@/hooks/swaptokenSelect";

// 选择代币按钮(已选择代币状态)

const HasTokenButton: React.FC<{
  tag?: string;
  className?: string;
}> = ({ tag, className }) => {
  const token = useSwapTokenSelect((state) => state.getToken(tag));
  const setCurrentTag = useSwapTokenSelect((state) => state.setCurrentTag);
  const showTokenSelect = useSwapTokenSelect((state) => state.showTokenSelect);

  const setShowTokenSelect = useSwapTokenSelect(
    (state) => state.setShowTokenSelect
  );
  const onClick = useCallback(() => {
    if (!showTokenSelect) {
      setShowTokenSelect(true);
    }
    setCurrentTag(tag);
  }, [showTokenSelect, setShowTokenSelect, setCurrentTag, tag, token]);
  return (
    <>
      <Button
        onClick={onClick}
        className={`!inline-flex !bg-white hover:!bg-white-hover !shadow-gray-200 !shadow-xs !justify-center !items-center !border-gray-100 !border-1 !rounded-4xl !h-10 pl-4 !pr-4 !pt-2 ${className}`}
      >
        <Avatar
          className="!mb-1"
          src={token.tokenLogoURI ? token.tokenLogoURI : undefined}
          size="small"
        >
          {token.tokenSymbol?.[0]}
        </Avatar>
        <Typography.Text className="!text-lg !block mb-1 !text-[#666666] !text-[1rem] !font-bold ml-1">
          {token.tokenSymbol ? token.tokenSymbol : "ETH"}
        </Typography.Text>
        <DownOutlined className="ml-auto !text-[#666666] !text-[1rem]" />
      </Button>
      <>
        <SelectTokenModal
          open={showTokenSelect}
          onClose={() => setShowTokenSelect(false)}
        ></SelectTokenModal>
      </>
    </>
  );
};

const NotHasTokenButton: React.FC<{
  tag?: string;
  className?: string;
}> = ({ className, tag }) => {
  const showTokenSelect = useSwapTokenSelect((state) => state.showTokenSelect);

  const setCurrentTag = useSwapTokenSelect((state) => state.setCurrentTag);

  const setShowTokenSelect = useSwapTokenSelect(
    (state) => state.setShowTokenSelect
  );
  const onClick = useCallback(() => {
    if (!showTokenSelect) {
      setShowTokenSelect(true);
    }
    setCurrentTag(tag);
  }, [showTokenSelect, setShowTokenSelect, setCurrentTag, tag]);
  return (
    <>
      <Button onClick={onClick} className={`inline-flex btn  ${className}`}>
        选择代币
        <DownOutlined className="ml-auto  !text-white !text-[1rem]" />
      </Button>
      <>
        <SelectTokenModal
          open={showTokenSelect}
          onClose={() => setShowTokenSelect(false)}
        ></SelectTokenModal>
      </>
    </>
  );
};

const TokenSelectButton: React.FC<{
  tag?: string;
  className?: string;
}> = ({ tag, className }) => {
  const token = useSwapTokenSelect((state) => state.getToken(tag));
  const setSelectedToken = useSwapTokenSelect(
    (state) => state.setSelectedToken
  );

  useEffect(() => {
    console.log("TokenSelectButton tag:", tag);
  }, [token]);

  return (
    <>
      {token ? (
        <HasTokenButton tag={tag} className={className} />
      ) : (
        <NotHasTokenButton tag={tag} className={className} />
      )}
    </>
  );
};

export default TokenSelectButton;
