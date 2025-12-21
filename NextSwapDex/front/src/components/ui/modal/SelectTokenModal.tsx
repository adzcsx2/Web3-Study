import React, { useCallback, useState, useEffect } from "react";
import { Modal, Input, Skeleton, Empty, App } from "antd";
import { SwapToken, SwapType } from "@/types/";
import { SearchOutlined } from "@ant-design/icons";
import { TokenService } from "@/services/tokenService";
import { useAccount } from "wagmi";
import TokenList from "../list/TokenList";
import { useSwapTokenSelect } from "@/hooks/useSwaptokenSelect";

interface SelectTokenModalProps {
  open: boolean;
  onClose: () => void;
}

// 缓存键名
const CACHED_TOKENS_KEY = "cached_tokens_list";

/**
 * 交易的币种选择弹窗组件
 */
const SelectTokenModal: React.FC<SelectTokenModalProps> = ({
  open,
  onClose,
}) => {
  const { message } = App.useApp();
  const { chain } = useAccount();
  const [searchValue, setSearchValue] = useState("");
  const [inputStatus, setInputStatus] = useState<"" | "error" | "warning">("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SwapToken[]>([]);
  const [cachedTokens, setCachedTokens] = useState<SwapToken[]>([]);

  // 加载缓存的代币列表
  const loadCachedTokens = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(CACHED_TOKENS_KEY);
        if (cached) {
          const tokens = JSON.parse(cached);
          setCachedTokens(tokens);
        }
      } catch (error) {
        console.error("加载缓存的代币列表失败:", error);
      }
    }
  }, []);

  // 处理搜索
  const handleSearch = useCallback(
    async (value: string) => {
      setSearchValue(value);

      if (!value.trim()) {
        setInputStatus("");
        setSearchResults([]);
        return;
      }

      // 验证是否为有效的以太坊地址
      if (!TokenService.isValidEthereumAddress(value)) {
        setInputStatus("error");
        setSearchResults([]);
        return;
      }

      setInputStatus("");
      setIsSearching(true);
      setSearchResults([]);

      try {
        // 检查是否有连接的链
        if (!chain) {
          message.error("请先连接钱包");
          setIsSearching(false);
          return;
        }

        const tokenInfo = await TokenService.searchToken(value, chain.id);
        if (
          tokenInfo.tokenAddress ===
          "0x0000000000000000000000000000000000000000"
        ) {
          tokenInfo.tokenSymbol = "ETH";
        }
        console.log("搜索到的代币信息:", tokenInfo);
        if (tokenInfo) {
          setSearchResults([tokenInfo]);
          message.success("代币信息获取成功");
        }
      } catch (error) {
        console.error("搜索代币失败:", error);

        let errorMessage = "搜索代币失败";
        if (error instanceof Error) {
          // 将长错误信息分段显示，提高可读性
          if (error.message.includes("\n")) {
            const lines = error.message.split("\n");
            errorMessage = lines[0]; // 显示第一行主要错误

            // 在控制台显示完整错误信息
            console.error("详细错误信息:", error.message);

            // 可选：显示更详细的错误提示给用户
            if (lines.length > 1) {
              setTimeout(() => {
                message.info(lines.slice(1).join(" "), 5); // 5秒后显示详细信息
              }, 1000);
            }
          } else {
            errorMessage = error.message;
          }
        }

        message.error(errorMessage);
      } finally {
        setIsSearching(false);
      }
    },
    [chain]
  );

  // 组件打开时加载缓存
  useEffect(() => {
    if (open) {
      loadCachedTokens();
    }
  }, [open]);

  // 监听链切换，清空搜索结果
  useEffect(() => {
    setSearchResults([]);
    setSearchValue("");
    setInputStatus("");
  }, [chain?.id]);

  // 重置状态
  const handleCancel = useCallback(() => {
    onClose();
    setSearchValue("");
    setInputStatus("");
    setSearchResults([]);
    setIsSearching(false);
  }, [onClose]);

  return (
    <>
      <Modal
        title={
          <div className="flex items-center justify-between">
            <span>选择代币</span>
            {chain && (
              <span className="text-sm text-gray-500 bg-gray-100 mr-10 px-2 py-1 rounded">
                当前网络: {chain.name}
              </span>
            )}
          </div>
        }
        open={open}
        onCancel={handleCancel}
        footer={null}
        width={400}
      >
        <div className="space-y-4">
          {/* 搜索框 */}
          <Input
            className="!w-full"
            placeholder="请输入代币地址 (0x...)"
            value={searchValue}
            onChange={(e) => {
              //   setSearchValue(e.target.value);
              handleSearch(e.target.value);
            }}
            status={inputStatus}
            prefix={<SearchOutlined />}
          />

          {!chain && (
            <div className="text-yellow-500 text-sm bg-yellow-50 p-2 rounded">
              请先连接钱包以搜索代币
            </div>
          )}

          {inputStatus === "error" && (
            <div className="text-red-500 text-sm">
              请输入有效的以太坊地址 (0x开头的42位字符)
            </div>
          )}

          {/* 搜索结果 */}
          {isSearching && (
            <div className="space-y-2">
              <Skeleton avatar paragraph={{ rows: 1 }} active />
              <Skeleton avatar paragraph={{ rows: 1 }} active />
            </div>
          )}

          {/* 搜索结果列表 */}
          {!isSearching && searchResults.length > 0 && (
            <TokenList title="搜索结果" tokens={searchResults} />
          )}

          {/* 缓存的代币列表 */}
          {!isSearching && searchResults.length === 0 && !searchValue && (
            <TokenList
              title="最近使用"
              tokens={cachedTokens}
              emptyText="暂无最近使用的代币"
            />
          )}
        </div>
      </Modal>
    </>
  );
};

export default SelectTokenModal;
