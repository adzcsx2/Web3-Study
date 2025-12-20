import React, { useCallback, useEffect } from "react";
import { Typography, Image, Button } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { SwapToken } from "@/types/";
import { useState } from "react";
import SelectTokenModal from "../modal/SelectTokenModal";

// 选择代币按钮(已选择代币状态)

const HasTokenButton: React.FC<{
  token: SwapToken;
  className?: string;
  onTokenSelect: (token: SwapToken) => void;
}> = ({
  token,
  className,
  onTokenSelect,
}) => {
  const [isShowTokenSelect, setIsShowTokenSelect] = useState(false);
  const onClick = useCallback(() => {
    if (!isShowTokenSelect) {
      setIsShowTokenSelect(true);
    }
  }, []);
  return (
    <>
      <Button
        onClick={onClick}
        className={`!inline-flex !bg-white hover:!bg-white-hover !shadow-gray-200 !shadow-xs !justify-center !items-center !border-gray-100 !border-1 !rounded-4xl !h-10 pl-4 !pr-4 !pt-2 ${className}`}
      >
        <Image
          className="mb-1 "
          width={25}
          src={
            token.tokenLogoURI
              ? token.tokenLogoURI
              : "https://token-icons.s3.amazonaws.com/eth.png"
          }
          preview={false}
        ></Image>
        <Typography.Text className="!text-lg !block mb-1 !text-[#666666] !text-[1rem] !font-bold ml-1">
          {token.tokenSymbol ? token.tokenSymbol : "ETH"}
        </Typography.Text>
        <DownOutlined className="ml-1 !text-[#666666] !text-[1rem]" />
      </Button>
      <SelectTokenModal
        open={isShowTokenSelect}
        onClose={() => setIsShowTokenSelect(false)}
        onTokenSelect={onTokenSelect}
      ></SelectTokenModal>
    </>
  );
};

const NotHasTokenButton: React.FC<{
  className?: string;
  onTokenSelect: (token: SwapToken) => void;
}> = ({ className, onTokenSelect }) => {
  const [isShowTokenSelect, setIsShowTokenSelect] = useState(false);
  const onClick = useCallback(() => {
    if (!isShowTokenSelect) {
      setIsShowTokenSelect(true);
    }
  }, [isShowTokenSelect]);
  return (
    <>
      <Button
        onClick={onClick}
        className={`!inline-flex !bg-[#44BAEA] hover:!bg-[#3B9BD9] !shadow-gray-200 !shadow-xs !justify-center !items-center !border-gray-100 !border-1 !rounded-4xl !h-10 !pl-4 !pr-4 !pt-2 ${className}`}
      >
        <Typography.Text className="!text-lg !block mb-1 !text-white !text-[1rem] !font-bold">
          选择代币
        </Typography.Text>
        <DownOutlined className="!text-white !text-[1rem]" />
      </Button>
      <SelectTokenModal
        open={isShowTokenSelect}
        onClose={() => setIsShowTokenSelect(false)}
        onTokenSelect={onTokenSelect}
      />
    </>
  );
};

const TokenSelectButton: React.FC<{
  token?: SwapToken;
  className?: string;
  onTokenSelect: (token: SwapToken) => void;
}> = ({ token, className, onTokenSelect }) => {
  useEffect(() => {
    console.log("TokenSelectButton token:", token);
  }, [token]);

  return (
    <>
      {token ? (
        <HasTokenButton
          token={token}
          className={className}
          onTokenSelect={onTokenSelect}
        />
      ) : (
        <NotHasTokenButton
          className={className}
          onTokenSelect={onTokenSelect}
        />
      )}
    </>
  );
};

export default TokenSelectButton;
