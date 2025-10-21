import { create } from "zustand";

interface WalletState {
  // 钱包连接状态
  isConnected: boolean;
  walletType: string | null;
  address: string | null;
  chainId: string | null;
  balance: string | null;

  // 加载状态
  connecting: boolean;
  disconnecting: boolean;

  // Actions
  setConnecting: (connecting: boolean) => void;
  setDisconnecting: (disconnecting: boolean) => void;
  connect: (walletType: string, address: string) => void;
  disconnect: () => void;
  updateChainId: (chainId: string) => void;
  updateBalance: (balance: string) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  // 初始状态
  isConnected: false,
  walletType: null,
  address: null,
  chainId: null,
  balance: null,
  connecting: false,
  disconnecting: false,

  // Actions
  setConnecting: (connecting) => set({ connecting }),
  setDisconnecting: (disconnecting) => set({ disconnecting }),

  connect: (walletType, address) => set({
    isConnected: true,
    walletType,
    address,
    connecting: false,
  }),

  disconnect: () => set({
    isConnected: false,
    walletType: null,
    address: null,
    chainId: null,
    balance: null,
    disconnecting: false,
  }),

  updateChainId: (chainId) => set({ chainId }),
  updateBalance: (balance) => set({ balance }),
}));

// 钱包相关工具函数
export const walletUtils = {
  // 格式化地址显示
  formatAddress: (address: string | null): string => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  },

  // 格式化余额显示
  formatBalance: (balance: string | null): string => {
    if (!balance) return "0.0000";
    const ethBalance = parseFloat(balance) / Math.pow(10, 18);
    return ethBalance.toFixed(4);
  },

  // 获取网络名称
  getNetworkName: (chainId: string | null): string => {
    if (!chainId) return "未知网络";

    const chainIdHex = parseInt(chainId, 16).toString();
    switch (chainIdHex) {
      case "1":
        return "以太坊主网";
      case "11155111":
        return "Sepolia 测试网";
      case "5":
        return "Goerli 测试网";
      case "97":
        return "BSC 测试网";
      case "56":
        return "BSC 主网";
      default:
        return `链 ID: ${chainIdHex}`;
    }
  },

  // 检查钱包是否已连接
  isWalletConnected: (): boolean => {
    return typeof window !== "undefined" &&
           typeof window.ethereum !== "undefined" &&
           window.ethereum.selectedAddress !== null;
  },

  // 获取当前账户
  getCurrentAccount: async (): Promise<string | null> => {
    if (!walletUtils.isWalletConnected()) return null;

    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      return accounts && accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
      console.error("Failed to get current account:", error);
      return null;
    }
  },
};