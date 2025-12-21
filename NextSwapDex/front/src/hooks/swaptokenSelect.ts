import { create } from "zustand";
import { SwapToken } from "@/types/";
import { TAG_TOKEN_SELECT } from "@/types/Enum";

interface TokenState {
  // 选中的代币 - 使用 Map 存储多个 tag 对应的代币
  token: Map<string, SwapToken | null> | null;
  // 设置选中的代币 - 需要指定 tag 和 token
  setSelectedToken: (tag?: string, token?: SwapToken | null) => void;
  // 处理代币选择（包含保存到缓存等逻辑）
  handleTokenSelect: (tag?: string, token?: SwapToken) => void;
  // 获取指定 tag 的代币
  getToken: (tag?: string) => SwapToken | null;
  // 当前操作的 tag
  currentTag: string;
  setCurrentTag: (tag?: string | null) => void;
  // 是否显示代币选择弹窗
  showTokenSelect: boolean;
  setShowTokenSelect: (show: boolean) => void;
  // 交换上下两个代币
  swapTokens: (tag1: string, tag2: string) => void;
  resetTokenSelect: () => void;
}

const defaultEthToken = {
  tokenSymbol: "ETH",
  tokenAddress: "",
  tokenDecimals: 18,
  tokenLogoURI: "",
  chainId: 1,
  balance: "0",
};

export const useSwapTokenSelect = create<TokenState>((set, get) => ({
  token: new Map(),
  showTokenSelect: false,
  currentTag: "default",
  setCurrentTag: (tag) => set({ currentTag: tag ? tag : "default" }),
  setSelectedToken: (tag, token) => {
    set((state) => {
      if (tag === undefined || tag === null) {
        tag = "default";
      }

      const newMap = new Map(state.token);
      if (token) {
        newMap.set(tag, token);
      } else {
        newMap.delete(tag);
      }
      return { token: newMap };
    });
  },

  setShowTokenSelect: (show) => set({ showTokenSelect: show }),

  getToken: (tag?) => {
    const currentState = get();
    tag = tag || "default";
    return currentState.token?.get(tag) || null;
  },

  handleTokenSelect: (tag, token) => {
    if (tag === undefined || tag === null) {
      tag = "default";
    }

    // 保存代币到缓存
    const saveTokenToCache = (token: SwapToken) => {
      if (typeof window !== "undefined") {
        try {
          const CACHED_TOKENS_KEY = "cached_tokens_list";
          const existing = localStorage.getItem(CACHED_TOKENS_KEY);
          let tokens: SwapToken[] = existing ? JSON.parse(existing) : [];

          // 移除重复的代币
          tokens = tokens.filter((t) => t.tokenAddress !== token.tokenAddress);

          // 添加到开头
          tokens.unshift(token);

          // 只保留最新的10个
          tokens = tokens.slice(0, 10);

          localStorage.setItem(CACHED_TOKENS_KEY, JSON.stringify(tokens));
        } catch (error) {
          console.error("保存代币到缓存失败:", error);
        }
      }
    };

    // 保存到缓存
    saveTokenToCache(token);

    // 设置选中的代币
    get().setSelectedToken(tag, token);

    // 关闭弹窗
    set({ showTokenSelect: false });
  },

  swapTokens: (tag1, tag2) => {
    const { getToken, setSelectedToken } = get();
    const topToken = getToken(tag1);
    const bottomToken = getToken(tag2);
    setSelectedToken(tag1, bottomToken);
    setSelectedToken(tag2, topToken);
  },
  resetTokenSelect: () => {
    const token = new Map();
    token.set(TAG_TOKEN_SELECT.TOP, defaultEthToken);
    token.set(TAG_TOKEN_SELECT.BOTTOM, null);
    set({ token });
  },
}));
