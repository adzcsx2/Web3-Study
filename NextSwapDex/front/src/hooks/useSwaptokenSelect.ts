import { create } from "zustand";
import { SwapToken } from "@/types/";
import { TAG_TOKEN_SELECT } from "@/types/Enum";
import { TokenService } from "@/services/tokenService";

interface TokenState {
  // 交易对代币数组 - 固定长度为2的数组，存储两个 SwapToken
  tokens: [SwapToken | null, SwapToken | null];
  // 全局单代币对象
  token: SwapToken | null;
  // 当前操作的位置
  currentPosition: 0 | 1;
  // 设置交易对中的指定位置代币
  setSelectedToken: (position: 0 | 1, token: SwapToken | null) => void;
  // 设置全局单代币
  setGlobalToken: (token: SwapToken | null) => void;
  // 设置当前位置
  setCurrentPosition: (position: 0 | 1) => void;
  // 处理代币选择（包含保存到缓存等逻辑）
  handleTokenSelect: (token: SwapToken) => void;
  // 是否显示代币选择弹窗
  showTokenSelect: boolean;
  setShowTokenSelect: (show: boolean) => void;
  // 交换上下两个代币
  swapTokens: () => void;
}

export const useSwapTokenSelect = create<TokenState>((set, get) => ({
  tokens: [null, null],
  token: null,
  currentPosition: 0,
  showTokenSelect: false,

  setSelectedToken: (position, token) => {
    set((state) => {
      const newTokens = [...state.tokens] as [
        SwapToken | null,
        SwapToken | null,
      ];
      newTokens[position] = token;
      return { tokens: newTokens };
    });
  },

  setGlobalToken: (token) => set({ token }),

  setCurrentPosition: (position) => set({ currentPosition: position }),

  setShowTokenSelect: (show) => set({ showTokenSelect: show }),

  handleTokenSelect: (token) => {
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

    // 使用当前位置设置选中的代币
    const { currentPosition } = get();
    get().setSelectedToken(currentPosition, token);

    // 关闭弹窗
    set({ showTokenSelect: false });
  },

  swapTokens: () => {
    set((state) => {
      const newTokens = [...state.tokens] as [
        SwapToken | null,
        SwapToken | null,
      ];
      [newTokens[0], newTokens[1]] = [newTokens[1], newTokens[0]];
      return { tokens: newTokens };
    });
  },
}));
